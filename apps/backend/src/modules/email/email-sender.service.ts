import { Injectable } from '@nestjs/common'
import { Resend } from 'resend'
import { AppConfigService } from '../../config/app-config.service'
import { AppLogger } from '../../logger/app-logger.service'

/**
 * Email attachment interface
 */
export interface EmailAttachment {
	/** Filename to display */
	filename: string
	/** Base64 encoded content OR URL to fetch from */
	content?: string | Buffer
	/** URL to fetch attachment from (alternative to content) */
	path?: string
	/** MIME type (e.g., 'application/pdf') */
	contentType?: string
}

/**
 * Email tag for categorization and analytics
 */
export interface EmailTag {
	name: string
	value: string
}

/**
 * Parameters for sending a single email
 */
export interface SendEmailParams {
	from: string
	to: string[]
	subject: string
	html: string
	replyTo?: string
	cc?: string[]
	bcc?: string[]
	/** Schedule email for future delivery (ISO 8601 format) */
	scheduledAt?: string
	/** File attachments */
	attachments?: EmailAttachment[]
	/** Tags for categorization and analytics */
	tags?: EmailTag[]
	/** Custom headers */
	headers?: Record<string, string>
}

/**
 * Parameters for batch sending emails
 */
export interface BatchEmailParams {
	from: string
	to: string[]
	subject: string
	html: string
	replyTo?: string
	cc?: string[]
	bcc?: string[]
	attachments?: EmailAttachment[]
	tags?: EmailTag[]
	headers?: Record<string, string>
}

/**
 * Result from sending an email
 */
export interface EmailSendResult {
	id: string
}

/**
 * Result from batch sending emails
 */
export interface BatchSendResult {
	data: EmailSendResult[]
}

/**
 * Email status from Resend API
 */
export interface EmailStatus {
	id: string
	object: string
	to: string[]
	from: string
	subject: string
	html: string | null
	text: string | null
	created_at: string
	last_event: string
	scheduled_at?: string
}

/**
 * Email Sender Service - Handles Resend API Integration
 *
 * Features:
 * - Single email sending with full options (attachments, tags, scheduling)
 * - Batch email sending (up to 100 emails per request)
 * - Email status retrieval
 * - Scheduled email management (send, update, cancel)
 * - Comprehensive error handling and logging
 *
 * Rate Limits: Respects Resend's 2 req/sec default rate limit
 */
@Injectable()
export class EmailSenderService {
	private readonly resend: InstanceType<typeof Resend> | null

	constructor(
		private readonly config: AppConfigService,
		private readonly logger: AppLogger
	) {
		const apiKey = this.config.getResendApiKey()
		if (!apiKey) {
			this.logger.warn(
				'RESEND_API_KEY not configured - email functionality will be disabled'
			)
			this.resend = null
		} else {
			this.resend = new Resend(apiKey)
		}
	}

	/**
	 * Check if Resend is configured and available
	 */
	isConfigured(): boolean {
		return this.resend !== null
	}

	/**
	 * Send a single email via Resend API
	 *
	 * Supports:
	 * - Multiple recipients (to, cc, bcc)
	 * - File attachments (content or URL-based)
	 * - Scheduled delivery
	 * - Tags for analytics
	 * - Custom headers
	 */
	async sendEmail(params: SendEmailParams): Promise<EmailSendResult | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping email send', {
				to: params.to,
				subject: params.subject
			})
			return null
		}

		try {
			const { data, error } = await this.resend.emails.send({
				from: params.from,
				to: params.to,
				subject: params.subject,
				html: params.html,
				reply_to: params.replyTo,
				cc: params.cc,
				bcc: params.bcc,
				scheduled_at: params.scheduledAt,
				attachments: params.attachments?.map(att => ({
					filename: att.filename,
					content: att.content,
					path: att.path,
					content_type: att.contentType
				})),
				tags: params.tags,
				headers: params.headers
			})

			if (error) {
				this.logger.error('Resend API error', {
					error: error.message,
					to: params.to,
					subject: params.subject
				})
				throw new Error(`Resend API error: ${error.message}`)
			}

			const isScheduled = !!params.scheduledAt
			this.logger.log(
				isScheduled ? 'Email scheduled successfully' : 'Email sent successfully',
				{
					emailId: data?.id,
					to: params.to,
					subject: params.subject,
					...(isScheduled && { scheduledAt: params.scheduledAt })
				}
			)

			return data
		} catch (error) {
			this.logger.error('Failed to send email', {
				error: error instanceof Error ? error.message : String(error),
				to: params.to,
				subject: params.subject
			})
			throw error
		}
	}

	/**
	 * Send multiple emails in a single API call (up to 100 emails)
	 *
	 * More efficient than individual sends for bulk operations.
	 * Uses 'lenient' validation by default - partial failures won't fail entire batch.
	 *
	 * @param emails - Array of email parameters (max 100)
	 * @param options - Batch options
	 * @returns Array of email IDs for successfully sent emails
	 */
	async sendBatch(
		emails: BatchEmailParams[],
		options?: { batchValidation?: 'strict' | 'lenient' }
	): Promise<BatchSendResult | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, skipping batch send', {
				emailCount: emails.length
			})
			return null
		}

		if (emails.length === 0) {
			this.logger.warn('Empty email batch, nothing to send')
			return { data: [] }
		}

		if (emails.length > 100) {
			throw new Error('Batch size exceeds maximum of 100 emails')
		}

		try {
			const { data, error } = await this.resend.batch.send(
				emails.map(email => ({
					from: email.from,
					to: email.to,
					subject: email.subject,
					html: email.html,
					reply_to: email.replyTo,
					cc: email.cc,
					bcc: email.bcc,
					attachments: email.attachments?.map(att => ({
						filename: att.filename,
						content: att.content,
						path: att.path,
						content_type: att.contentType
					})),
					tags: email.tags,
					headers: email.headers
				})),
				{ batchValidation: options?.batchValidation ?? 'lenient' }
			)

			if (error) {
				this.logger.error('Resend batch API error', {
					error: error.message,
					emailCount: emails.length
				})
				throw new Error(`Resend batch API error: ${error.message}`)
			}

			this.logger.log('Batch emails sent successfully', {
				emailCount: emails.length,
				successCount: data?.data?.length ?? 0,
				emailIds: data?.data?.map((d: { id: string }) => d.id)
			})

			return data
		} catch (error) {
			this.logger.error('Failed to send batch emails', {
				error: error instanceof Error ? error.message : String(error),
				emailCount: emails.length
			})
			throw error
		}
	}

	/**
	 * Get the status of a sent email
	 *
	 * Returns delivery status and metadata for tracking.
	 */
	async getEmailStatus(emailId: string): Promise<EmailStatus | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, cannot get email status')
			return null
		}

		try {
			const { data, error } = await this.resend.emails.get(emailId)

			if (error) {
				this.logger.error('Failed to get email status', {
					emailId,
					error: error.message
				})
				throw new Error(`Resend API error: ${error.message}`)
			}

			return data as EmailStatus
		} catch (error) {
			this.logger.error('Failed to get email status', {
				emailId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Update the scheduled time of a scheduled email
	 *
	 * Can only update emails that haven't been sent yet.
	 */
	async updateScheduledEmail(
		emailId: string,
		newScheduledAt: string
	): Promise<{ id: string } | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, cannot update scheduled email')
			return null
		}

		try {
			const { data, error } = await this.resend.emails.update({
				id: emailId,
				scheduledAt: newScheduledAt
			})

			if (error) {
				this.logger.error('Failed to update scheduled email', {
					emailId,
					error: error.message
				})
				throw new Error(`Resend API error: ${error.message}`)
			}

			this.logger.log('Scheduled email updated', {
				emailId,
				newScheduledAt
			})

			return { id: data?.id ?? emailId }
		} catch (error) {
			this.logger.error('Failed to update scheduled email', {
				emailId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Cancel a scheduled email before it's sent
	 *
	 * Returns success if the email was cancelled, throws if already sent.
	 */
	async cancelScheduledEmail(emailId: string): Promise<{ id: string } | null> {
		if (!this.resend) {
			this.logger.warn('Resend not configured, cannot cancel scheduled email')
			return null
		}

		try {
			const { data, error } = await this.resend.emails.cancel(emailId)

			if (error) {
				this.logger.error('Failed to cancel scheduled email', {
					emailId,
					error: error.message
				})
				throw new Error(`Resend API error: ${error.message}`)
			}

			this.logger.log('Scheduled email cancelled', { emailId })

			return { id: data?.id ?? emailId }
		} catch (error) {
			this.logger.error('Failed to cancel scheduled email', {
				emailId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}
}
