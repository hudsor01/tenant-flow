/**
 * Payment Reminder Service
 *
 * Scheduled service that sends payment reminder emails to tenants
 * with upcoming rent due dates.
 *
 * Sends reminders at two intervals:
 * - 7 days before due date (first reminder)
 * - 3 days before due date (urgent reminder)
 */

import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { AppConfigService } from '../../config/app-config.service'
import type { EmailJob } from '../email/email.queue'

interface LeaseWithTenant {
	id: string
	rent_amount: number
	primary_tenant_id: string
	unit_id: string
	tenant?: {
		id: string
		user_id: string
		autopay_enabled: boolean
		users?: {
			first_name: string | null
			last_name: string | null
			email: string
		}
	}
	unit?: {
		id: string
		unit_number: string
		property_id: string
		property?: {
			id: string
			name: string
		}
	}
}

interface PaymentReminderData {
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber?: string | undefined
	amount: number
	currency: string
	dueDate: string
	daysUntilDue: number
	autopayEnabled: boolean
}

@Injectable()
export class PaymentReminderService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly config: AppConfigService,
		@InjectQueue('emails') private readonly emailQueue: Queue<EmailJob>
	) {}

	/**
	 * Send payment reminders daily at 9:00 AM UTC
	 *
	 * Checks for active leases with upcoming rent due dates
	 * and queues reminder emails for tenants.
	 */
	@Cron(CronExpression.EVERY_DAY_AT_9AM)
	async sendPaymentReminders(): Promise<void> {
		const startTime = Date.now()

		try {
			this.logger.log('Starting daily payment reminder check')

			const now = new Date()
			const sevenDaysFromNow = new Date(now)
			sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

			const threeDaysFromNow = new Date(now)
			threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

			const adminClient = this.supabase.getAdminClient()

			// Get active leases with tenant and property info
			const { data: leases, error } = await adminClient
				.from('leases')
				.select(
					`
					id,
					rent_amount,
					primary_tenant_id,
					unit_id,
					tenant:tenants!primary_tenant_id(
						id,
						user_id,
						autopay_enabled,
						users(first_name, last_name, email)
					),
					unit:units!unit_id(
						id,
						unit_number,
						property_id,
						property:properties(id, name)
					)
				`
				)
				.eq('lease_status', 'active')
				.not('primary_tenant_id', 'is', null)

			if (error) {
				this.logger.error('Failed to fetch leases for payment reminders', {
					error: error.message,
					code: error.code
				})
				return
			}

			const typedLeases = (leases ?? []) as unknown as LeaseWithTenant[]

			if (typedLeases.length === 0) {
				this.logger.log('No active leases found for payment reminders')
				return
			}

			let remindersSent = 0
			const errors: string[] = []

			for (const lease of typedLeases) {
				try {
					// Skip if no tenant or no email
					if (!lease.tenant?.users?.email) {
						continue
					}

					// Calculate the next due date (1st of each month by default)
					const nextDueDate = this.calculateNextDueDate(now)
					const daysUntilDue = this.calculateDaysUntilDue(now, nextDueDate)

					// Check if this lease already received a reminder today
					const hasRecentReminder = await this.checkRecentReminder(
						adminClient,
						lease.id,
						daysUntilDue
					)

					if (hasRecentReminder) {
						continue
					}

					// Send 7-day reminder OR 3-day reminder
					if (daysUntilDue === 7 || daysUntilDue === 3) {
						const tenantName = this.formatTenantName(lease.tenant.users)
						const propertyName = lease.unit?.property?.name ?? 'Your Property'
						const unitNumber = lease.unit?.unit_number

						const reminderData: PaymentReminderData = {
							tenantName,
							tenantEmail: lease.tenant.users.email,
							propertyName,
							amount: lease.rent_amount,
							currency: 'usd',
							dueDate: nextDueDate.toISOString(),
							daysUntilDue,
							autopayEnabled: lease.tenant.autopay_enabled ?? false
						}

						// Only add unitNumber if it's defined
						if (unitNumber !== undefined) {
							reminderData.unitNumber = unitNumber
						}

						await this.queuePaymentReminderEmail(reminderData)

						// Record that we sent a reminder
						await this.recordReminderSent(adminClient, lease.id, daysUntilDue)

						remindersSent++
					}
				} catch (leaseError) {
					const errorMessage =
						leaseError instanceof Error
							? leaseError.message
							: String(leaseError)
					errors.push(`Lease ${lease.id}: ${errorMessage}`)
				}
			}

			const duration = Date.now() - startTime
			this.logger.log('Payment reminder check completed', {
				totalLeases: typedLeases.length,
				remindersSent,
				errors: errors.length > 0 ? errors : undefined,
				durationMs: duration
			})
		} catch (error) {
			this.logger.error('Payment reminder check failed', {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			})
		}
	}

	/**
	 * Calculate the next rent due date (typically 1st of month)
	 */
	private calculateNextDueDate(fromDate: Date): Date {
		const result = new Date(fromDate)
		const currentDay = result.getDate()

		// If we're past the 1st, move to next month
		if (currentDay > 1) {
			result.setMonth(result.getMonth() + 1)
		}

		result.setDate(1)
		result.setHours(0, 0, 0, 0)

		return result
	}

	/**
	 * Calculate days until due date
	 */
	private calculateDaysUntilDue(from: Date, due: Date): number {
		const fromMs = from.getTime()
		const dueMs = due.getTime()
		const diffMs = dueMs - fromMs
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
	}

	/**
	 * Format tenant name from user data
	 */
	private formatTenantName(user: {
		first_name: string | null
		last_name: string | null
		email: string
	}): string {
		const parts = [user.first_name, user.last_name].filter(
			(part): part is string => Boolean(part?.trim())
		)
		return parts.length > 0 ? parts.join(' ') : 'Tenant'
	}

	/**
	 * Check if a reminder was recently sent for this lease
	 */
	private async checkRecentReminder(
		client: ReturnType<typeof this.supabase.getAdminClient>,
		leaseId: string,
		daysUntilDue: number
	): Promise<boolean> {
		// Check notifications table for recent payment reminders
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const { data, error } = await client
			.from('notifications')
			.select('id')
			.eq('entity_id', leaseId)
			.eq('entity_type', `payment_reminder_${daysUntilDue}`)
			.gte('created_at', today.toISOString())
			.limit(1)

		if (error) {
			// If there's an error, assume no recent reminder to avoid blocking
			return false
		}

		return data !== null && data.length > 0
	}

	/**
	 * Record that a reminder was sent
	 */
	private async recordReminderSent(
		client: ReturnType<typeof this.supabase.getAdminClient>,
		leaseId: string,
		daysUntilDue: number
	): Promise<void> {
		// Get the lease to find the owner
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select('unit:units!unit_id(property:properties(owner_user_id))')
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			this.logger.warn('Could not record reminder - lease not found', {
				leaseId
			})
			return
		}

		const ownerUserId =
			(lease.unit as { property: { owner_user_id: string } } | null)?.property
				?.owner_user_id ?? null

		if (!ownerUserId) {
			this.logger.warn('Could not record reminder - owner not found', {
				leaseId
			})
			return
		}

		// Insert a notification record to track the reminder
		await client.from('notifications').insert({
			user_id: ownerUserId,
			title: `Payment reminder sent (${daysUntilDue} days)`,
			message: `Automated payment reminder sent for lease`,
			notification_type: 'payment',
			action_url: `/leases/${leaseId}`,
			entity_id: leaseId,
			entity_type: `payment_reminder_${daysUntilDue}`,
			is_read: true // Mark as read since it's a system notification
		})
	}

	/**
	 * Queue payment reminder email
	 */
	private async queuePaymentReminderEmail(
		data: PaymentReminderData
	): Promise<void> {
		const appUrl = this.config.getNextPublicAppUrl()
		const paymentUrl = `${appUrl}/tenant`

		await this.emailQueue.add(
			'payment-reminder',
			{
				type: 'payment-reminder',
				data: {
					tenantName: data.tenantName,
					tenantEmail: data.tenantEmail,
					propertyName: data.propertyName,
					...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
					amount: data.amount,
					currency: data.currency,
					dueDate: data.dueDate,
					daysUntilDue: data.daysUntilDue,
					paymentUrl,
					autopayEnabled: data.autopayEnabled
				}
			},
			{
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 5000
				}
			}
		)

		this.logger.log('Payment reminder email queued', {
			tenantEmail: data.tenantEmail,
			daysUntilDue: data.daysUntilDue,
			amount: data.amount
		})
	}
}
