import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ExternalApiService } from '../common/services/external-api.service'
import { EmailMetricsService } from './services/email-metrics.service'
import { EmailTemplateService } from './services/email-template.service'
import {
	EmailTemplateName,
	ExtractEmailData
} from './types/email-templates.types'

// Email response type
export interface SendEmailResponse {
	success: boolean
	messageId?: string
	error?: string
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private readonly fromEmail: string
	private readonly replyToEmail: string
	private readonly isDevelopment: boolean

	// Circuit breaker state
	private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed'
	private failureCount = 0
	private lastFailureTime: Date | null = null
	private readonly maxFailures = 5
	private readonly resetTimeout = 60000 // 1 minute

	constructor(
		private readonly configService: ConfigService,
		private readonly externalApiService: ExternalApiService,
		private readonly metricsService: EmailMetricsService,
		private readonly templateService: EmailTemplateService
	) {
		this.fromEmail =
			this.configService.get<string>('RESEND_FROM_EMAIL') ||
			'noreply@tenantflow.app'
		this.replyToEmail = 'support@tenantflow.app'
		this.isDevelopment =
			this.configService.get<string>('NODE_ENV') === 'development'

		// Template service handles template registration

		this.logger.log('Email service initialized', {
			fromEmail: this.fromEmail,
			replyToEmail: this.replyToEmail,
			environment: this.isDevelopment ? 'development' : 'production'
		})
	}

	/**
	 * Render email template using EmailTemplateService
	 * Uses a runtime type conversion due to TypeScript's limitations with conditional generic types
	 */
	private async renderTemplate<T extends EmailTemplateName>(
		templateName: T,
		data: ExtractEmailData<T>
	): Promise<{ html: string; subject: string }> {
		// TypeScript cannot properly narrow the type relationship between templateName and data
		// We need to use a type assertion to tell TypeScript the types are compatible
		const result = await (
			this.templateService as {
				renderEmail: (
					name: EmailTemplateName,
					data: unknown
				) => Promise<{ html: string; subject: string; text?: string }>
			}
		).renderEmail(templateName, data)
		return {
			html: result.html,
			subject: result.subject
		}
	}

	/**
	 * Render email template for bulk emails where template type is not known at compile time
	 */
	private async renderTemplateUnsafe(
		templateName: EmailTemplateName,
		data: unknown
	): Promise<{ html: string; subject: string }> {
		// Cast data to the expected type - validation happens in the template service
		const typedData = data as ExtractEmailData<EmailTemplateName>
		const result = await this.templateService.renderEmail(
			templateName,
			typedData
		)
		return {
			html: result.html,
			subject: result.subject
		}
	}

	/**
	 * Check circuit breaker state
	 */
	private checkCircuitBreaker(): boolean {
		if (this.circuitBreakerState === 'open') {
			// Check if enough time has passed to try again
			if (
				this.lastFailureTime &&
				Date.now() - this.lastFailureTime.getTime() > this.resetTimeout
			) {
				this.circuitBreakerState = 'half-open'
				this.logger.log('Circuit breaker entering half-open state')
			} else {
				return false // Circuit is still open
			}
		}
		return true // Circuit is closed or half-open
	}

	/**
	 * Handle circuit breaker failure
	 */
	private handleCircuitBreakerFailure(): void {
		this.failureCount++
		this.lastFailureTime = new Date()

		if (this.failureCount >= this.maxFailures) {
			this.circuitBreakerState = 'open'
			this.logger.warn(
				'Circuit breaker opened due to repeated failures',
				{
					failureCount: this.failureCount,
					maxFailures: this.maxFailures
				}
			)
		}
	}

	/**
	 * Handle circuit breaker success
	 */
	private handleCircuitBreakerSuccess(): void {
		if (this.circuitBreakerState === 'half-open') {
			this.circuitBreakerState = 'closed'
			this.failureCount = 0
			this.logger.log('Circuit breaker closed after successful operation')
		}
	}

	/**
	 * Validate email address
	 */
	private validateEmail(email: string): boolean {
		const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
		return emailRegex.test(email)
	}

	/**
	 * Public method for external services to send emails
	 */
	async sendRawEmail(options: {
		to: string
		subject: string
		html: string
		replyTo?: string
		tags?: { name: string; value: string }[]
		template?: EmailTemplateName
		metadata?: {
			userId?: string
			organizationId?: string
			campaignId?: string
		}
	}): Promise<SendEmailResponse> {
		return this.sendEmail({
			...options,
			to: [options.to]
		})
	}

	/**
	 * Core email sending method using ExternalApiService
	 */
	private async sendEmail(options: {
		to: string[]
		subject: string
		html: string
		replyTo?: string
		tags?: { name: string; value: string }[]
		template?: EmailTemplateName
		metadata?: {
			userId?: string
			organizationId?: string
			campaignId?: string
		}
	}): Promise<SendEmailResponse> {
		const startTime = Date.now()

		// Check circuit breaker
		if (!this.checkCircuitBreaker()) {
			const error =
				'Email service temporarily unavailable (circuit breaker open)'

			// Record metrics for circuit breaker failures
			if (options.template && options.to.length > 0) {
				const firstRecipient = options.to[0]
				if (firstRecipient) {
					this.metricsService.recordMetric({
						template: options.template,
						recipient: firstRecipient,
						status: 'failed',
						error,
						metadata: options.metadata
					})
				}
			}

			return { success: false, error }
		}

		try {
			// Validate recipient
			if (options.to.length === 0) {
				throw new Error('No recipients specified')
			}

			// Use ExternalApiService for resilient API call
			const firstRecipient = options.to[0]
			if (!firstRecipient) {
				throw new Error('No valid recipient found')
			}

			await this.externalApiService.sendEmailViaApi(
				firstRecipient, // ExternalApiService expects single recipient
				options.subject,
				options.html
			)

			this.handleCircuitBreakerSuccess()

			const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
			const processingTime = Date.now() - startTime

			// Record successful send metrics
			if (options.template && options.to.length > 0) {
				const successRecipient = options.to[0]
				if (successRecipient) {
					this.metricsService.recordMetric({
						template: options.template,
						recipient: successRecipient,
						status: 'sent',
						processingTime,
						messageId,
						metadata: options.metadata
					})
				}
			}

			return {
				success: true,
				messageId
			}
		} catch (error) {
			this.handleCircuitBreakerFailure()

			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			const processingTime = Date.now() - startTime

			this.logger.error('Failed to send email', {
				to: options.to,
				subject: options.subject,
				error: errorMessage,
				processingTime
			})

			// Record failed send metrics
			if (options.template && options.to.length > 0) {
				const failedRecipient = options.to[0]
				if (failedRecipient) {
					this.metricsService.recordMetric({
						template: options.template,
						recipient: failedRecipient,
						status: 'failed',
						processingTime,
						error: errorMessage,
						metadata: options.metadata
					})
				}
			}

			return {
				success: false,
				error: errorMessage
			}
		}
	}

	/**
	 * Send welcome email
	 */
	async sendWelcomeEmail(
		email: string,
		name: string,
		companySize?: 'small' | 'medium' | 'large',
		source?: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		try {
			const { html, subject } = await this.renderTemplate('welcome', {
				name,
				companySize: companySize || 'medium',
				source: source || 'organic'
			})

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'welcome',
				tags: [
					{ name: 'template', value: 'welcome' },
					{ name: 'source', value: source || 'api' }
				],
				metadata: {
					// Can be populated if user context is available
				}
			})
		} catch (error) {
			this.logger.error('Failed to send welcome email', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send tenant invitation
	 */
	async sendTenantInvitation(
		email: string,
		tenantName: string,
		propertyAddress: string,
		invitationLink: string,
		landlordName: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		if (!invitationLink.startsWith('http')) {
			return { success: false, error: 'Invalid invitation link' }
		}

		try {
			const { html, subject } = await this.renderTemplate(
				'tenant-invitation',
				{
					tenantName,
					propertyAddress,
					invitationLink,
					landlordName
				}
			)

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'tenant-invitation',
				tags: [{ name: 'template', value: 'tenant-invitation' }]
			})
		} catch (error) {
			this.logger.error('Failed to send tenant invitation', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send payment reminder
	 */
	async sendPaymentReminder(
		email: string,
		tenantName: string,
		amountDue: number,
		dueDate: Date,
		propertyAddress: string,
		paymentLink: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		if (amountDue <= 0) {
			return { success: false, error: 'Invalid amount' }
		}

		try {
			const { html, subject } = await this.renderTemplate(
				'payment-reminder',
				{
					tenantName,
					amountDue,
					dueDate,
					propertyAddress,
					paymentLink
				}
			)

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'payment-reminder',
				tags: [
					{ name: 'template', value: 'payment-reminder' },
					{ name: 'amount', value: amountDue.toString() }
				]
			})
		} catch (error) {
			this.logger.error('Failed to send payment reminder', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send lease expiration alert
	 */
	async sendLeaseExpirationAlert(
		email: string,
		tenantName: string,
		propertyAddress: string,
		expirationDate: Date,
		renewalLink: string,
		leaseId?: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		try {
			const { html, subject } = await this.renderTemplate(
				'lease-expiration',
				{
					tenantName,
					propertyAddress,
					expirationDate,
					renewalLink
				}
			)

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'lease-expiration',
				tags: [
					{ name: 'template', value: 'lease-expiration' },
					{ name: 'leaseId', value: leaseId || 'unknown' }
				]
			})
		} catch (error) {
			this.logger.error('Failed to send lease expiration alert', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send property management tips
	 */
	async sendPropertyTips(
		email: string,
		landlordName: string,
		_tips: string[]
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		try {
			const { html, subject } = await this.renderTemplate(
				'property-tips',
				{
					landlordName,
					tips: _tips || [] // Use the _tips parameter or default to empty array
				}
			)

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'property-tips',
				tags: [{ name: 'template', value: 'property-tips' }]
			})
		} catch (error) {
			this.logger.error('Failed to send property tips', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send feature announcement
	 */
	async sendFeatureAnnouncement(
		email: string,
		userName: string,
		_features: { title: string; description: string }[],
		_actionUrl?: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		try {
			const { html, subject } = await this.renderTemplate('welcome', {
				name: userName,
				companySize: 'medium',
				source: 'feature-announcement'
			})

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				template: 'welcome',
				tags: [{ name: 'template', value: 'feature-announcement' }]
			})
		} catch (error) {
			this.logger.error('Failed to send feature announcement', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send re-engagement email
	 */
	async sendReEngagementEmail(
		email: string,
		userName: string,
		_lastActive: string,
		_specialOffer?: string
	): Promise<SendEmailResponse> {
		if (!this.validateEmail(email)) {
			return { success: false, error: 'Invalid email format' }
		}

		try {
			const { html, subject } = await this.renderTemplate('welcome', {
				name: userName,
				companySize: 'medium',
				source: 're-engagement'
			})

			return this.sendEmail({
				to: [email],
				subject,
				html,
				replyTo: this.replyToEmail,
				tags: [
					{ name: 'template', value: 're-engagement' },
					{ name: 'campaign', value: 'win-back' }
				]
			})
		} catch (error) {
			this.logger.error('Failed to send re-engagement email', error)
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to send email'
			}
		}
	}

	/**
	 * Send bulk emails (batch processing)
	 */
	async sendBulkEmails(
		recipients: {
			email: string
			template: EmailTemplateName
			data: ExtractEmailData<EmailTemplateName>
		}[]
	): Promise<{
		successful: number
		failed: number
		results: SendEmailResponse[]
	}> {
		const results: SendEmailResponse[] = []
		let successful = 0
		let failed = 0

		// Process in batches of 10 to avoid overwhelming the service
		const batchSize = 10
		for (let i = 0; i < recipients.length; i += batchSize) {
			const batch = recipients.slice(i, i + batchSize)

			const batchResults = await Promise.all(
				batch.map(async recipient => {
					try {
						// Use a type-safe wrapper for bulk email rendering
						const { html, subject } =
							await this.renderTemplateUnsafe(
								recipient.template,
								recipient.data
							)

						const result = await this.sendEmail({
							to: [recipient.email],
							subject,
							html,
							replyTo: this.replyToEmail
						})

						if (result.success) {
							successful++
						} else {
							failed++
						}

						return result
					} catch (error) {
						failed++
						return {
							success: false,
							error:
								error instanceof Error
									? error.message
									: 'Failed to send email'
						}
					}
				})
			)

			results.push(...batchResults)

			// Add delay between batches to respect rate limits
			if (i + batchSize < recipients.length) {
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}

		return { successful, failed, results }
	}

	/**
	 * Get email service health status
	 */
	getHealthStatus(): {
		healthy: boolean
		circuitBreakerState: string
		failureCount: number
		lastFailureTime: Date | null
	} {
		return {
			healthy: this.circuitBreakerState !== 'open',
			circuitBreakerState: this.circuitBreakerState,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime
		}
	}
}
