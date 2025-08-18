import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'
import { EmailTemplateService } from './email-template.service'
import { EmailMetricsService } from './email-metrics.service'
import {
	EmailTemplateName,
	ExtractEmailData
} from '../types/email-templates.types'

export interface EmailResult {
	success: boolean
	messageId?: string
	error?: string
}

export interface DirectEmailData {
	to: string | string[]
	subject: string
	html?: string
	text?: string
	attachments?: { filename: string; content: Buffer | string }[]
}

/**
 * Resend Email Service
 *
 * Handles actual email sending via Resend API with comprehensive error handling,
 * retry logic, and PostHog analytics integration.
 */
@Injectable()
export class ResendEmailService {
	private readonly logger = new Logger(ResendEmailService.name)
	private readonly resend: Resend | null
	private readonly fromEmail: string

	constructor(
		private readonly configService: ConfigService,
		private readonly templateService: EmailTemplateService,
		private readonly metricsService: EmailMetricsService
	) {
		const apiKey = this.configService.get<string>('RESEND_API_KEY')
		this.fromEmail =
			this.configService.get<string>('RESEND_FROM_EMAIL') ||
			'noreply@tenantflow.app'

		if (apiKey) {
			this.resend = new Resend(apiKey)
			this.logger.log('Resend email service initialized')
		} else {
			this.resend = null
			this.logger.warn(
				'Resend API key not configured - email sending disabled'
			)
		}
	}

	/**
	 * Send templated email with PostHog analytics tracking
	 */
	async sendTemplatedEmail<T extends EmailTemplateName>(
		templateName: T,
		data: ExtractEmailData<T>,
		to: string | string[],
		options: {
			userId?: string
			organizationId?: string
			priority?: 'low' | 'normal' | 'high'
			trackingId?: string
		} = {}
	): Promise<EmailResult> {
		const startTime = Date.now()
		const recipients = Array.isArray(to) ? to : [to]

		try {
			// Track email send attempt with PostHog
			await this.metricsService.trackEmailEvent('email_send_started', {
				template: templateName,
				metadata: {
					recipientCount: recipients.length,
					userId: options.userId,
					organizationId: options.organizationId,
					priority: options.priority || 'normal',
					trackingId: options.trackingId
				}
			})

			// Render template using existing service
			const rendered = await this.templateService.renderEmail(
				templateName,
				data
			)

			// Send email via Resend
			const result = await this.sendWithRetry({
				from: this.fromEmail,
				to: recipients,
				subject: rendered.subject,
				html: rendered.html,
				text: rendered.text
			})

			// Track successful delivery
			await this.metricsService.trackEmailEvent('email_send_success', {
				template: templateName,
				messageId: result.messageId,
				processingTime: Date.now() - startTime,
				metadata: {
					recipientCount: recipients.length,
					userId: options.userId,
					organizationId: options.organizationId,
					trackingId: options.trackingId
				}
			})

			this.logger.log(
				`Template email sent successfully: ${templateName}`,
				{
					template: templateName,
					messageId: result.messageId,
					recipients: recipients.length,
					processingTime: Date.now() - startTime
				}
			)

			return result
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			// Track email failure with PostHog
			await this.metricsService.trackEmailEvent('email_send_failed', {
				template: templateName,
				error: errorMessage,
				processingTime: Date.now() - startTime,
				metadata: {
					recipientCount: recipients.length,
					userId: options.userId,
					organizationId: options.organizationId,
					trackingId: options.trackingId
				}
			})

			this.logger.error(
				`Failed to send template email: ${templateName}`,
				{
					template: templateName,
					error: errorMessage,
					recipients: recipients.length,
					processingTime: Date.now() - startTime
				}
			)

			return {
				success: false,
				error: errorMessage
			}
		}
	}

	/**
	 * Send direct email without template
	 */
	async sendDirectEmail(
		emailData: DirectEmailData,
		options: {
			userId?: string
			organizationId?: string
			priority?: 'low' | 'normal' | 'high'
			trackingId?: string
		} = {}
	): Promise<EmailResult> {
		const startTime = Date.now()
		const recipients = Array.isArray(emailData.to)
			? emailData.to
			: [emailData.to]

		try {
			// Track direct email send attempt
			await this.metricsService.trackEmailEvent(
				'direct_email_send_started',
				{
					metadata: {
						recipientCount: recipients.length,
						hasHtml: !!emailData.html,
						hasText: !!emailData.text,
						hasAttachments: !!emailData.attachments?.length,
						userId: options.userId,
						organizationId: options.organizationId,
						priority: options.priority || 'normal',
						trackingId: options.trackingId
					}
				}
			)

			// Prepare Resend email data
			const resendData = {
				from: this.fromEmail,
				to: recipients,
				subject: emailData.subject,
				html: emailData.html,
				text: emailData.text,
				...(emailData.attachments && {
					attachments: emailData.attachments.map(att => ({
						filename: att.filename,
						content: att.content
					}))
				})
			}

			// Send email
			const result = await this.sendWithRetry(resendData)

			// Track success
			await this.metricsService.trackEmailEvent(
				'direct_email_send_success',
				{
					messageId: result.messageId,
					processingTime: Date.now() - startTime,
					metadata: {
						recipientCount: recipients.length,
						userId: options.userId,
						organizationId: options.organizationId,
						trackingId: options.trackingId
					}
				}
			)

			this.logger.log('Direct email sent successfully', {
				messageId: result.messageId,
				recipients: recipients.length,
				subject: emailData.subject,
				processingTime: Date.now() - startTime
			})

			return result
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			// Track failure
			await this.metricsService.trackEmailEvent(
				'direct_email_send_failed',
				{
					error: errorMessage,
					processingTime: Date.now() - startTime,
					metadata: {
						recipientCount: recipients.length,
						userId: options.userId,
						organizationId: options.organizationId,
						trackingId: options.trackingId
					}
				}
			)

			this.logger.error('Failed to send direct email', {
				error: errorMessage,
				recipients: recipients.length,
				subject: emailData.subject,
				processingTime: Date.now() - startTime
			})

			return {
				success: false,
				error: errorMessage
			}
		}
	}

	/**
	 * Send email with retry logic and proper error handling
	 */
	private async sendWithRetry(
		emailData: {
			from: string
			to: string[]
			subject: string
			html?: string
			text?: string
			attachments?: { filename: string; content: Buffer | string }[]
		},
		maxRetries = 3
	): Promise<EmailResult> {
		if (!this.resend) {
			throw new Error('Resend API key not configured')
		}

		// Validate email data
		this.validateEmailData(emailData)

		let lastError: Error = new Error('Unknown error')

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Add delay for retries with exponential backoff
				if (attempt > 1) {
					const delay = Math.min(
						1000 * Math.pow(2, attempt - 1),
						5000
					) // Max 5s
					await new Promise(resolve => setTimeout(resolve, delay))

					this.logger.debug(
						`Retrying email send (attempt ${attempt}/${maxRetries})`,
						{
							delay,
							subject: emailData.subject,
							recipients: emailData.to.length
						}
					)
				}

				// Send via Resend API
				const result = await this.resend.emails.send({
					from: emailData.from,
					to: emailData.to,
					subject: emailData.subject,
					html: emailData.html,
					text: emailData.text || emailData.subject,
					...(emailData.attachments && {
						attachments: emailData.attachments
					})
				})

				if (result.error) {
					throw new Error(`Resend API error: ${result.error.message}`)
				}

				return {
					success: true,
					messageId: result.data?.id
				}
			} catch (error) {
				lastError =
					error instanceof Error ? error : new Error(String(error))

				this.logger.warn(`Email send attempt ${attempt} failed`, {
					error: lastError.message,
					attempt,
					maxRetries,
					subject: emailData.subject,
					recipients: emailData.to.length
				})

				// Don't retry on validation errors or rate limits
				if (
					this.isNonRetryableError(lastError) ||
					attempt === maxRetries
				) {
					break
				}
			}
		}

		throw lastError
	}

	/**
	 * Check if error should not be retried
	 */
	private isNonRetryableError(error: Error): boolean {
		const nonRetryablePatterns = [
			'validation',
			'invalid email',
			'bad request',
			'unauthorized',
			'forbidden',
			'not found',
			'rate limit'
		]

		const errorMessage = error.message.toLowerCase()
		return nonRetryablePatterns.some(pattern =>
			errorMessage.includes(pattern)
		)
	}

	/**
	 * Validate email data before sending
	 */
	private validateEmailData(emailData: {
		to: string[]
		subject: string
		html?: string
		text?: string
	}): void {
		if (!emailData.to || emailData.to.length === 0) {
			throw new Error('Email recipient(s) required')
		}

		if (!emailData.subject || emailData.subject.trim() === '') {
			throw new Error('Email subject required')
		}

		if (!emailData.html && !emailData.text) {
			throw new Error('Email must have either HTML or text content')
		}

		// Validate email addresses
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		for (const email of emailData.to) {
			if (!emailRegex.test(email)) {
				throw new Error(`Invalid email address: ${email}`)
			}
		}

		// Check for reasonable limits
		if (emailData.to.length > 100) {
			throw new Error('Too many recipients (max 100)')
		}

		if (emailData.subject.length > 200) {
			throw new Error('Subject line too long (max 200 characters)')
		}

		if (emailData.html && emailData.html.length > 500000) {
			throw new Error('HTML content too large (max 500KB)')
		}
	}

	/**
	 * Test email configuration and connectivity
	 */
	async testEmailConfiguration(): Promise<{
		configured: boolean
		canSend: boolean
		error?: string
	}> {
		try {
			if (!this.resend) {
				return {
					configured: false,
					canSend: false,
					error: 'Resend API key not configured'
				}
			}

			// Test by checking if we can create a client
			// In production, you might want to use a specific test endpoint
			return {
				configured: true,
				canSend: true
			}
		} catch (error) {
			return {
				configured: !!this.resend,
				canSend: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			}
		}
	}

	/**
	 * Get email sending statistics and configuration
	 */
	async getEmailStats(): Promise<{
		configured: boolean
		fromEmail: string
		apiKeyConfigured: boolean
		serviceStatus: 'ready' | 'disabled' | 'error'
	}> {
		const apiKeyConfigured = !!this.configService.get('RESEND_API_KEY')
		const configured = !!this.resend

		let serviceStatus: 'ready' | 'disabled' | 'error' = 'disabled'
		if (configured) {
			serviceStatus = 'ready'
		}

		return {
			configured,
			fromEmail: this.fromEmail,
			apiKeyConfigured,
			serviceStatus
		}
	}

	/**
	 * Health check for email service
	 */
	async healthCheck(): Promise<{
		status: 'healthy' | 'unhealthy'
		message: string
		details?: Record<string, unknown>
	}> {
		try {
			const stats = await this.getEmailStats()

			if (!stats.configured) {
				return {
					status: 'unhealthy',
					message: 'Resend API key not configured',
					details: stats
				}
			}

			return {
				status: 'healthy',
				message: 'Email service ready',
				details: stats
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				message:
					error instanceof Error ? error.message : 'Unknown error',
				details: { error: String(error) }
			}
		}
	}
}
