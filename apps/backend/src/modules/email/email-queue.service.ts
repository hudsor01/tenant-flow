import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from './email.service'
import type { Database } from '@repo/shared/types/supabase-generated'

type EmailQueue = Database['public']['Tables']['email_queue']
type EmailQueueRow = EmailQueue['Row']
type EmailQueueInsert = EmailQueue['Insert']
type EmailQueueUpdate = EmailQueue['Update']

/**
 * Email Queue Service with NestJS Native Scheduling
 * 
 * ARCHITECTURE:
 * - Database-backed queue (PostgreSQL via Supabase)
 * - Exponential backoff: 1min, 5min, 15min, 1hr, 6hr
 * - Max 5 retry attempts before marking as failed
 * - Background job processor runs every 2 minutes (@Cron decorator)
 * - RLS-protected (service_role only)
 * 
 * NATIVE NESTJS FEATURES:
 * - @nestjs/schedule: Built-in cron job support
 * - @Injectable(): Dependency injection
 * - Logger: Native structured logging
 * 
 * USAGE:
 * ```typescript
 * await this.emailQueueService.queueEmail({
 *   type: 'payment_failed',
 *   recipient: 'user@example.com',
 *   payload: { amount: 1000, currency: 'usd' },
 *   priority: 'high'
 * })
 * ```
 */
@Injectable()
export class EmailQueueService {
	private readonly logger = new Logger(EmailQueueService.name)

	// Retry delays in milliseconds: 1min, 5min, 15min, 1hr, 6hr
	private readonly RETRY_DELAYS = [
		1 * 60 * 1000, // 1 minute
		5 * 60 * 1000, // 5 minutes
		15 * 60 * 1000, // 15 minutes
		60 * 60 * 1000, // 1 hour
		6 * 60 * 60 * 1000 // 6 hours
	]

	private readonly MAX_RETRIES = this.RETRY_DELAYS.length

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly emailService: EmailService
	) {}

	/**
	 * Queue an email for sending with automatic retry on failure
	 */
	async queueEmail(params: {
		type: 'tenant_invitation' | 'invitation_reminder' | 'payment_success' | 'payment_failed' | 'subscription_canceled' | 'trial_ending'
		recipient: string
		payload: Record<string, unknown>
		priority?: 'high' | 'normal' | 'low'
	}): Promise<void> {
		try {
			const insertData: EmailQueueInsert = {
				email_type: params.type,
				recipient_email: params.recipient,
				payload: params.payload as never, // Json type
				priority: params.priority ?? 'normal',
				status: 'pending',
				attempt_count: 0,
				created_at: new Date().toISOString(),
				next_retry_at: new Date().toISOString() // Send immediately
			}

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('email_queue')
				.insert(insertData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to queue email', {
					type: params.type,
					recipient: params.recipient,
					error: error.message
				})
				throw error
			}

			this.logger.log('Email queued successfully', {
				queueId: data.id,
				type: params.type,
				recipient: params.recipient
			})
		} catch (error) {
			this.logger.error('Exception queueing email', {
				type: params.type,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Process pending emails in the queue
	 * Runs automatically every 2 minutes via @Cron decorator
	 * 
	 * Native NestJS Feature: @nestjs/schedule
	 */
	@Cron('*/2 * * * *') // Every 2 minutes
	async processQueue(): Promise<void> {
		try {
			// Fetch pending emails that are ready to send
			const { data: pendingEmails, error } = await this.supabaseService
				.getAdminClient()
				.from('email_queue')
				.select('*')
				.eq('status', 'pending')
				.lte('next_retry_at', new Date().toISOString())
				.order('priority', { ascending: false }) // High priority first
				.order('created_at', { ascending: true }) // FIFO within priority
				.limit(50) // Process 50 emails per batch

			if (error) {
				this.logger.error('Failed to fetch pending emails', {
					error: error.message
				})
				return
			}

			if (!pendingEmails || pendingEmails.length === 0) {
				this.logger.debug('No pending emails to process')
				return
			}

			this.logger.log(`Processing ${pendingEmails.length} pending emails`)

			for (const emailJob of pendingEmails) {
				await this.processSingleEmail(emailJob)
			}
		} catch (error) {
			this.logger.error('Exception processing email queue', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Process a single email job
	 */
	private async processSingleEmail(emailJob: EmailQueueRow): Promise<void> {
		try {
			// Attempt to send email
			await this.sendEmailByType(
				emailJob.email_type,
				emailJob.recipient_email,
				emailJob.payload as Record<string, unknown>
			)

			// Mark as completed
			const updateData: EmailQueueUpdate = {
				status: 'completed',
				completed_at: new Date().toISOString(),
				last_attempt_at: new Date().toISOString()
			}

			await this.supabaseService
				.getAdminClient()
				.from('email_queue')
				.update(updateData)
				.eq('id', emailJob.id)

			this.logger.log('Email sent successfully', {
				queueId: emailJob.id,
				type: emailJob.email_type,
				recipient: emailJob.recipient_email
			})
		} catch (error) {
			// Handle failure with retry logic
			await this.handleEmailFailure(emailJob, error)
		}
	}

	/**
	 * Send email based on type
	 */
	private async sendEmailByType(
		type: string,
		_recipient: string,
		payload: Record<string, unknown>
	): Promise<void> {
		switch (type) {
			case 'tenant_invitation':
				await this.emailService.sendTenantInvitation(
					payload as unknown as Parameters<typeof this.emailService.sendTenantInvitation>[0]
				)
				break
			case 'invitation_reminder':
				await this.emailService.sendInvitationReminder(
					payload as unknown as Parameters<typeof this.emailService.sendInvitationReminder>[0]
				)
				break
			case 'payment_success':
				await this.emailService.sendPaymentSuccessEmail(
					payload as unknown as Parameters<typeof this.emailService.sendPaymentSuccessEmail>[0]
				)
				break
			case 'payment_failed':
				await this.emailService.sendPaymentFailedEmail(
					payload as unknown as Parameters<typeof this.emailService.sendPaymentFailedEmail>[0]
				)
				break
			case 'subscription_canceled':
				await this.emailService.sendSubscriptionCanceledEmail(
					payload as unknown as Parameters<typeof this.emailService.sendSubscriptionCanceledEmail>[0]
				)
				break
			default:
				throw new Error(`Unknown email type: ${type}`)
		}
	}

	/**
	 * Handle email send failure with exponential backoff retry
	 */
	private async handleEmailFailure(
		emailJob: EmailQueueRow,
		error: unknown
	): Promise<void> {
		const attemptCount = emailJob.attempt_count + 1
		const errorMessage = error instanceof Error ? error.message : String(error)

		if (attemptCount >= this.MAX_RETRIES) {
			// Max retries reached - mark as failed
			const updateData: EmailQueueUpdate = {
				status: 'failed',
				attempt_count: attemptCount,
				last_error: errorMessage,
				last_attempt_at: new Date().toISOString(),
				failed_at: new Date().toISOString()
			}

			await this.supabaseService
				.getAdminClient()
				.from('email_queue')
				.update(updateData)
				.eq('id', emailJob.id)

			this.logger.error('Email failed permanently after max retries', {
				queueId: emailJob.id,
				type: emailJob.email_type,
				recipient: emailJob.recipient_email,
				attempts: attemptCount,
				error: errorMessage
			})
		} else {
			// Schedule retry with exponential backoff
			const retryDelay = this.RETRY_DELAYS[attemptCount - 1] ?? this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1] ?? 6 * 60 * 60 * 1000
			const nextRetryAt = new Date(Date.now() + retryDelay)

			const updateData: EmailQueueUpdate = {
				attempt_count: attemptCount,
				last_error: errorMessage,
				last_attempt_at: new Date().toISOString(),
				next_retry_at: nextRetryAt.toISOString()
			}

			await this.supabaseService
				.getAdminClient()
				.from('email_queue')
				.update(updateData)
				.eq('id', emailJob.id)

			this.logger.warn('Email send failed, scheduled for retry', {
				queueId: emailJob.id,
				type: emailJob.email_type,
				recipient: emailJob.recipient_email,
				attempts: attemptCount,
				nextRetryAt: nextRetryAt.toISOString(),
				error: errorMessage
			})
		}
	}

	/**
	 * Get failed emails for manual intervention
	 */
	async getFailedEmails(limit = 100): Promise<EmailQueueRow[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('email_queue')
			.select('*')
			.eq('status', 'failed')
			.order('failed_at', { ascending: false })
			.limit(limit)

		if (error) {
			this.logger.error('Failed to fetch failed emails', {
				error: error.message
			})
			return []
		}

		return data ?? []
	}

	/**
	 * Retry a specific failed email
	 */
	async retryFailedEmail(queueId: string): Promise<void> {
		const updateData: EmailQueueUpdate = {
			status: 'pending',
			attempt_count: 0,
			next_retry_at: new Date().toISOString(),
			last_error: null
		}

		await this.supabaseService
			.getAdminClient()
			.from('email_queue')
			.update(updateData)
			.eq('id', queueId)

		this.logger.log('Failed email marked for retry', { queueId })
	}

	/**
	 * Clean up old completed emails (older than 30 days)
	 * Runs daily at 3 AM
	 * 
	 * Native NestJS Feature: @nestjs/schedule with cron expression
	 */
	@Cron(CronExpression.EVERY_DAY_AT_3AM)
	async cleanupOldEmails(): Promise<void> {
		try {
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('cleanup_old_email_queue_entries')

			if (error) {
				this.logger.error('Failed to cleanup old emails', {
					error: error.message
				})
			} else {
				this.logger.log('Cleaned up old completed emails', {
					deletedCount: data
				})
			}
		} catch (error) {
			this.logger.error('Exception during email cleanup', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
		}
}
