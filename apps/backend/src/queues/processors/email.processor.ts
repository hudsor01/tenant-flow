import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUE_NAMES } from '../queue.module'
import {
	BaseJobData,
	BaseProcessor,
	ProcessorResult
} from '../base/base.processor'
import { EmailMetricsService } from '../../email/services/email-metrics.service'
import { ResendEmailService } from '../../email/services/resend-email.service'
import {
	AnyEmailData,
	EmailTemplateName
} from '../../email/types/email-templates.types'

interface EmailJobData extends BaseJobData {
	to: string | string[]
	subject: string
	template?: EmailTemplateName
	templateData?: Record<string, unknown>
	html?: string
	text?: string
	attachments?: { filename: string; content: Buffer | string }[]
	userId?: string
	organizationId?: string
	priority?: 'low' | 'normal' | 'high'
	trackingId?: string
	scheduledFor?: Date
	retryCount?: number
	maxRetries?: number
}

@Processor(QUEUE_NAMES.EMAILS)
export class EmailProcessor extends BaseProcessor<EmailJobData> {
	constructor(
		private readonly resendEmailService: ResendEmailService,
		private readonly metricsService: EmailMetricsService
	) {
		super(EmailProcessor.name)
	}

	@Process('send-email')
	async handleEmailSending(job: Job<EmailJobData>): Promise<ProcessorResult> {
		return this.handleJob(job)
	}

	@Process('send-templated-email')
	async handleTemplatedEmailSending(
		job: Job<EmailJobData>
	): Promise<ProcessorResult> {
		return this.handleJob(job)
	}

	@Process('send-direct-email')
	async handleDirectEmailSending(
		job: Job<EmailJobData>
	): Promise<ProcessorResult> {
		return this.handleJob(job)
	}

	@Process('send-scheduled-email')
	async handleScheduledEmailSending(
		job: Job<EmailJobData>
	): Promise<ProcessorResult> {
		// Check if email should be sent now
		if (
			job.data.scheduledFor &&
			new Date() < new Date(job.data.scheduledFor)
		) {
			const delay = new Date(job.data.scheduledFor).getTime() - Date.now()
			this.logger.logJobProgress(
				job,
				0,
				`Email scheduled for future delivery, delaying ${delay}ms`
			)
			throw new Error(`Email scheduled for ${job.data.scheduledFor}`)
		}
		return this.handleJob(job)
	}

	protected async processJob(
		job: Job<EmailJobData>
	): Promise<ProcessorResult> {
		const startTime = Date.now()
		const {
			to,
			subject,
			template,
			html,
			text,
			userId,
			organizationId,
			priority,
			trackingId,
			retryCount = 0,
			maxRetries = 3
		} = job.data
		const recipients = Array.isArray(to) ? to : [to]

		try {
			// Validate job data
			await this.validateEmailJobData(job.data)

			// Update job progress
			await job.progress(10) // Starting

			// Track job start with comprehensive metadata
			await this.metricsService.trackEmailEvent('email_job_started', {
				template: template || ('unknown' as EmailTemplateName),
				metadata: {
					jobId: job.id?.toString(),
					recipientCount: recipients.length,
					userId,
					organizationId,
					priority: priority || 'normal',
					trackingId,
					retryCount,
					maxRetries,
					jobType: this.determineJobType(job.data)
				}
			})

			// Determine processing path and execute
			let result
			if (template) {
				await job.progress(30) // Template processing
				result = await this.sendTemplatedEmail(job.data)
			} else if (html || text) {
				await job.progress(30) // Direct email processing
				result = await this.sendDirectEmail(job.data)
			} else {
				throw new Error(
					'Email must have either template or html/text content'
				)
			}

			await job.progress(90) // Email sent

			// Track success with enhanced metrics
			await this.metricsService.trackEmailEvent('email_job_completed', {
				template: template || ('unknown' as EmailTemplateName),
				messageId: result.messageId,
				processingTime: Date.now() - startTime,
				metadata: {
					jobId: job.id?.toString(),
					recipientCount: recipients.length,
					userId,
					organizationId,
					trackingId,
					retryCount,
					jobType: this.determineJobType(job.data)
				}
			})

			await job.progress(100) // Complete

			this.logger.logJobSuccess(job, Date.now() - startTime, {
				messageId: result.messageId,
				recipients: recipients.length,
				template: template || 'direct'
			})

			return {
				success: true,
				data: {
					recipients: recipients.join(', '),
					subject,
					messageId: result.messageId,
					processingTime: Date.now() - startTime,
					jobType: this.determineJobType(job.data)
				},
				processingTime: Date.now() - startTime,
				timestamp: new Date()
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			// Enhanced error tracking
			await this.metricsService.trackEmailEvent('email_job_failed', {
				template: template || ('unknown' as EmailTemplateName),
				error: errorMessage,
				processingTime: Date.now() - startTime,
				metadata: {
					jobId: job.id?.toString(),
					recipientCount: recipients.length,
					userId,
					organizationId,
					trackingId,
					retryCount,
					maxRetries,
					jobType: this.determineJobType(job.data),
					errorType: this.classifyError(error)
				}
			})

			this.logger.logJobFailure(
				job,
				error instanceof Error ? error : new Error(errorMessage),
				Date.now() - startTime
			)

			// Determine if job should be retried
			if (this.shouldRetryJob(error, retryCount, maxRetries)) {
				this.logger.logJobRetry(
					job,
					error instanceof Error ? error : new Error(errorMessage),
					retryCount + 1
				)
			}

			throw error
		}
	}

	private async sendTemplatedEmail(
		data: EmailJobData
	): Promise<{ messageId?: string }> {
		const {
			template,
			templateData,
			to,
			userId,
			organizationId,
			priority,
			trackingId
		} = data

		if (!template) {
			throw new Error('Template name is required for templated email')
		}

		try {
			// Use ResendEmailService for templated emails with proper type safety
			const result = await this.resendEmailService.sendTemplatedEmail(
				template,
				templateData as AnyEmailData, // Type assertion for flexible template data
				to,
				{
					userId,
					organizationId,
					priority,
					trackingId
				}
			)

			if (!result.success) {
				throw new Error(
					result.error || 'Failed to send templated email'
				)
			}

			this.logger.logQueueEvent('templated_email_sent', {
				template,
				messageId: result.messageId,
				recipients: Array.isArray(to) ? to.length : 1
			})

			return { messageId: result.messageId }
		} catch (error) {
			this.logger.logQueueEvent('templated_email_failed', {
				template,
				error: error instanceof Error ? error.message : String(error),
				recipients: Array.isArray(to) ? to.length : 1
			})
			throw error
		}
	}

	private async sendDirectEmail(
		data: EmailJobData
	): Promise<{ messageId?: string }> {
		const {
			to,
			subject,
			html,
			text,
			attachments,
			userId,
			organizationId,
			priority,
			trackingId
		} = data

		try {
			// Use ResendEmailService for direct emails
			const result = await this.resendEmailService.sendDirectEmail(
				{
					to,
					subject,
					html,
					text,
					attachments
				},
				{
					userId,
					organizationId,
					priority,
					trackingId
				}
			)

			if (!result.success) {
				throw new Error(result.error || 'Failed to send direct email')
			}

			this.logger.logQueueEvent('direct_email_sent', {
				messageId: result.messageId,
				subject,
				recipients: Array.isArray(to) ? to.length : 1,
				hasHtml: !!html,
				hasText: !!text,
				hasAttachments: !!attachments?.length
			})

			return { messageId: result.messageId }
		} catch (error) {
			this.logger.logQueueEvent('direct_email_failed', {
				subject,
				error: error instanceof Error ? error.message : String(error),
				recipients: Array.isArray(to) ? to.length : 1
			})
			throw error
		}
	}

	/**
	 * Validate email job data before processing
	 */
	private async validateEmailJobData(data: EmailJobData): Promise<void> {
		const recipients = Array.isArray(data.to) ? data.to : [data.to]

		// Basic validation
		if (!recipients.length) {
			throw new Error('Email recipients are required')
		}

		if (!data.subject?.trim()) {
			throw new Error('Email subject is required')
		}

		if (!data.template && !data.html && !data.text) {
			throw new Error('Email must have template, HTML, or text content')
		}

		// Template validation
		if (data.template && !data.templateData) {
			this.logger.logQueueEvent('template_warning', {
				template: data.template,
				message: 'Template specified but no template data provided'
			})
		}

		// Recipient validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		for (const email of recipients) {
			if (!emailRegex.test(email)) {
				throw new Error(`Invalid email address: ${email}`)
			}
		}

		// Size limits
		if (recipients.length > 100) {
			throw new Error('Too many recipients (max 100 per job)')
		}

		if (data.subject.length > 200) {
			throw new Error('Subject line too long (max 200 characters)')
		}

		if (data.html && data.html.length > 500000) {
			throw new Error('HTML content too large (max 500KB)')
		}
	}

	/**
	 * Determine the type of email job
	 */
	private determineJobType(data: EmailJobData): string {
		if (data.template) {
			return 'templated'
		}
		if (data.html) {
			return 'html'
		}
		if (data.text) {
			return 'text'
		}
		return 'unknown'
	}

	/**
	 * Classify error type for better tracking
	 */
	private classifyError(error: unknown): string {
		if (!(error instanceof Error)) {
			return 'unknown'
		}

		const message = error.message.toLowerCase()
		if (message.includes('validation')) {
			return 'validation'
		}
		if (message.includes('rate limit')) {
			return 'rate_limit'
		}
		if (message.includes('network') || message.includes('timeout')) {
			return 'network'
		}
		if (message.includes('template')) {
			return 'template'
		}
		if (message.includes('recipient') || message.includes('email')) {
			return 'recipient'
		}
		if (message.includes('auth')) {
			return 'authentication'
		}
		return 'processing'
	}

	/**
	 * Determine if a job should be retried based on error type and retry count
	 */
	private shouldRetryJob(
		error: unknown,
		retryCount: number,
		maxRetries: number
	): boolean {
		if (retryCount >= maxRetries) {
			return false
		}

		const errorType = this.classifyError(error)

		// Don't retry validation or authentication errors
		const nonRetryableErrors = ['validation', 'authentication', 'recipient']
		if (nonRetryableErrors.includes(errorType)) {
			return false
		}

		// Retry network and processing errors
		const retryableErrors = ['network', 'processing', 'rate_limit']
		return retryableErrors.includes(errorType)
	}

	/**
	 * Get job processing statistics
	 */
	async getProcessingStats(): Promise<{
		totalProcessed: number
		successRate: number
		avgProcessingTime: number
		errorBreakdown: Record<string, number>
	}> {
		// This would typically fetch from metrics service or cache
		// For now, return placeholder data that could be enhanced with actual metrics
		const deliveryHealth = this.metricsService.getDeliveryHealth()

		return {
			totalProcessed: deliveryHealth.metrics.totalSent,
			successRate: deliveryHealth.metrics.successRate,
			avgProcessingTime: deliveryHealth.metrics.avgProcessingTime,
			errorBreakdown: {
				recent_failures: deliveryHealth.metrics.recentFailures
			}
		}
	}

	/**
	 * Health check for email processor
	 */
	async healthCheck(): Promise<{
		status: 'healthy' | 'degraded' | 'unhealthy'
		message: string
		details: Record<string, unknown>
	}> {
		try {
			// Check email service health
			const emailServiceHealth =
				await this.resendEmailService.healthCheck()

			if (emailServiceHealth.status === 'unhealthy') {
				return {
					status: 'unhealthy',
					message: 'Email service unavailable',
					details: emailServiceHealth
				}
			}

			// Check metrics service
			const deliveryHealth = this.metricsService.getDeliveryHealth()

			return {
				status: deliveryHealth.status,
				message: `Email processor ${deliveryHealth.status}`,
				details: {
					emailService: emailServiceHealth,
					deliveryMetrics: deliveryHealth
				}
			}
		} catch (error) {
			return {
				status: 'unhealthy',
				message:
					error instanceof Error
						? error.message
						: 'Unknown health check error',
				details: { error: String(error) }
			}
		}
	}
}
