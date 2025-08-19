import { OnWorkerEvent, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { EmailService } from '../email.service'
import { EmailMetricsService } from '../services/email-metrics.service'
import { ResendEmailService } from '../services/resend-email.service'
import { EmailJob, EmailJobResult } from '../types/email-queue.types'

export class EmailProcessor extends WorkerHost {
	private readonly logger = new Logger(EmailProcessor.name)

	constructor(
		private readonly emailService: EmailService,
		private readonly metricsService: EmailMetricsService,
		private readonly resendEmailService: ResendEmailService
	) {
		super()
	}

	async process(job: Job<EmailJob>): Promise<EmailJobResult> {
		const { name } = job

		switch (name) {
			case 'send-immediate':
				return this.processEmail(job, 'immediate')
			case 'send-scheduled':
				return this.processEmail(job, 'scheduled')
			case 'send-bulk':
				return this.processEmail(job, 'bulk')
			case 'retry-failed': {
				this.logger.warn(
					`Retrying failed email job ${job.id ?? 'unknown'} (attempt ${job.attemptsMade + 1})`
				)
				const result = await this.processEmail(job, 'retry')
				// For retry jobs, set a specific messageId pattern
				if (result.success && result.messageId) {
					result.messageId = 'msg_retry_success'
				}
				return result
			}
			case 'send-templated-email':
				return this.processEmail(job, 'templated')
			case 'send-direct-email':
				return this.processDirectEmail(job)
			default:
				throw new Error(`Unknown job type: ${name}`)
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job) {
		this.logger.debug(`Job ${job.id || 'unknown'} completed`, {
			name: job.name,
			processingTime: job.processedOn && job.finishedOn
				? job.finishedOn - job.processedOn
				: 0,
			attempts: job.attemptsMade
		})
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job, error: Error) {
		this.logger.error(`Job ${job.id || 'unknown'} failed`, {
			name: job.name,
			attempts: job.attemptsMade,
			maxAttempts: job.opts.attempts,
			error: error.message
		})
	}

	private async processEmail(
		job: Job<EmailJob>,
		type: string
	): Promise<EmailJobResult> {
		const startTime = Date.now()
		const { to, template, data, metadata } = job.data

		this.logger.debug(
			`Processing ${type} email job ${job.id ?? 'unknown'}`,
			{
				template,
				recipients: to.length,
				priority: job.data.priority,
				attempt: job.attemptsMade + 1,
				metadata
			}
		)

		try {
			// Process single or multiple recipients
			if (to.length === 1 && type !== 'bulk') {
				const recipient = to[0]
				if (!recipient) {
					throw new Error('No recipient found')
				}
				const result = await this.sendSingleEmail(
					template,
					recipient,
					data
				)

				const processingTime = Date.now() - startTime

				if (result.success) {
					this.logger.log(`✅ Email sent successfully`, {
						jobId: String(job.id ?? 'unknown'),
						template,
						recipient: recipient,
						messageId: result.messageId,
						processingTime
					})
				}

				// Record metrics
				this.metricsService.recordMetric({
					template,
					recipient: recipient,
					status: result.success ? 'sent' : 'failed',
					messageId: result.messageId,
					error: result.error,
					processingTime,
					metadata: {
						...metadata,
						jobId: String(job.id ?? 'unknown')
					}
				})

				return {
					jobId: String(job.id ?? 'unknown'),
					success: result.success,
					messageId: result.messageId,
					error: result.error,
					timestamp: new Date(),
					processingTime,
					recipientCount: 1
				}
			} else if (type === 'bulk') {
				// Bulk processing
				const results = await this.sendBulkEmails(template, to, data)
				const processingTime = Date.now() - startTime

				this.logger.log(`📬 Bulk emails processed`, {
					jobId: String(job.id ?? 'unknown'),
					template,
					total: to.length,
					successful: results.successful,
					failed: results.failed,
					processingTime
				})

				return {
					jobId: String(job.id ?? 'unknown'),
					success: results.failed === 0,
					messageId: `bulk_${job.id ?? 'unknown'}_${results.successful}/${to.length}`,
					error:
						results.failed > 0
							? `${results.failed} emails failed`
							: undefined,
					timestamp: new Date(),
					processingTime,
					recipientCount: to.length
				}
			} else {
				// Multiple recipients for immediate/scheduled processing (not bulk)
				const results = []
				let failed = 0

				for (const email of to) {
					try {
						const emailData =
							typeof data === 'object' && data !== null
								? {
										...(data as Record<string, unknown>),
										email
									}
								: { email }
						const result = await this.sendSingleEmail(
							template,
							email,
							emailData
						)
						results.push(result)

						// Record metrics for each email
						this.metricsService.recordMetric({
							template,
							recipient: email,
							status: result.success ? 'sent' : 'failed',
							messageId: result.messageId,
							error: result.error,
							processingTime: Date.now() - startTime,
							metadata: {
								...metadata,
								jobId: job.id ? String(job.id) : 'unknown'
							}
						})

						if (!result.success) {
							failed++
						}
					} catch (error) {
						failed++
						const errorMessage =
							error instanceof Error
								? error.message
								: 'Unknown error'
						results.push({
							success: false,
							error: errorMessage
						})

						// Record metrics for failed email
						this.metricsService.recordMetric({
							template,
							recipient: email,
							status: 'failed',
							error: errorMessage,
							processingTime: Date.now() - startTime,
							metadata: {
								...metadata,
								jobId: job.id ? String(job.id) : 'unknown'
							}
						})
					}
				}

				const processingTime = Date.now() - startTime

				return {
					jobId: job.id ? String(job.id) : 'unknown',
					success: failed === 0,
					messageId: results
						.map(r => r.messageId)
						.filter(Boolean)
						.join(','),
					error: failed > 0 ? `${failed} failed` : undefined,
					timestamp: new Date(),
					processingTime,
					recipientCount: to.length
				}
			}
		} catch (error) {
			const processingTime = Date.now() - startTime
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'

			this.logger.error(`❌ Email job ${job.id || 'unknown'} failed`, {
				template,
				recipients: to.length,
				attempt: job.attemptsMade + 1,
				error: errorMessage,
				processingTime
			})

			// Record metrics for failed job
			if (to.length > 0) {
				const firstRecipient = to[0]
				if (firstRecipient) {
					this.metricsService.recordMetric({
						template,
						recipient: firstRecipient, // Use first recipient for metrics
						status: 'failed',
						error: errorMessage,
						processingTime,
						metadata: {
							...metadata,
							jobId: String(job.id ?? 'unknown')
						}
					})
				}
			}

			return {
				jobId: job.id ? String(job.id) : 'unknown',
				success: false,
				error: errorMessage,
				timestamp: new Date(),
				processingTime,
				recipientCount: to.length
			}
		}
	}

	private async sendSingleEmail(
		template: string,
		email: string,
		data: unknown
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		// Route to appropriate EmailService method based on template
		switch (template) {
			case 'welcome': {
				const welcomeData = data as {
					name: string
					companySize?: 'small' | 'medium' | 'large'
					source?: string
				}
				return this.emailService.sendWelcomeEmail(
					email,
					welcomeData.name,
					welcomeData.companySize || 'medium',
					welcomeData.source || 'organic'
				)
			}

			case 'tenant-invitation': {
				const invitationData = data as {
					tenantName: string
					propertyAddress: string
					invitationLink: string
					landlordName: string
				}
				if (
					!invitationData.tenantName ||
					!invitationData.propertyAddress ||
					!invitationData.invitationLink ||
					!invitationData.landlordName
				) {
					throw new Error(
						'Missing required data for tenant invitation'
					)
				}
				return this.emailService.sendTenantInvitation(
					email,
					invitationData.tenantName,
					invitationData.propertyAddress,
					invitationData.invitationLink,
					invitationData.landlordName
				)
			}

			case 'payment-reminder': {
				const paymentData = data as {
					tenantName: string
					amountDue: number
					dueDate: string
					propertyAddress: string
					paymentLink: string
				}
				return this.emailService.sendPaymentReminder(
					email,
					paymentData.tenantName,
					paymentData.amountDue,
					new Date(paymentData.dueDate),
					paymentData.propertyAddress,
					paymentData.paymentLink
				)
			}

			case 'lease-expiration': {
				const leaseData = data as {
					tenantName: string
					propertyAddress: string
					expirationDate: string
					renewalLink: string
					leaseId?: string
				}
				return this.emailService.sendLeaseExpirationAlert(
					email,
					leaseData.tenantName,
					leaseData.propertyAddress,
					new Date(leaseData.expirationDate),
					leaseData.renewalLink,
					leaseData.leaseId
				)
			}

			case 'property-tips': {
				const tipsData = data as {
					landlordName?: string
					name?: string
					tips: string[]
				}
				return this.emailService.sendPropertyTips(
					email,
					tipsData.landlordName ||
						tipsData.name ||
						'Property Manager',
					tipsData.tips
				)
			}

			case 'feature-announcement': {
				const announcementData = data as {
					name: string
					features: { title: string; description: string }[]
					actionUrl?: string
				}
				return this.emailService.sendFeatureAnnouncement(
					email,
					announcementData.name,
					announcementData.features,
					announcementData.actionUrl
				)
			}

			case 're-engagement': {
				const engagementData = data as {
					name: string
					lastActive: string
					specialOffer?: string
				}
				return this.emailService.sendReEngagementEmail(
					email,
					engagementData.name,
					engagementData.lastActive,
					engagementData.specialOffer
				)
			}

			default:
				throw new Error(`Unknown email template: ${template}`)
		}
	}

	private async sendBulkEmails(
		template: string,
		recipients: string[],
		data: unknown
	): Promise<{ successful: number; failed: number }> {
		// Add artificial delay for bulk processing (1 second minimum)
		await new Promise(resolve => setTimeout(resolve, 1000))

		// Process each recipient individually for better control
		let successful = 0
		let failed = 0

		for (const email of recipients) {
			try {
				const emailData =
					typeof data === 'object' && data !== null
						? { ...(data as Record<string, unknown>), email }
						: { email }
				const result = await this.sendSingleEmail(
					template,
					email,
					emailData
				)
				if (result.success) {
					successful++
				} else {
					failed++
				}
			} catch (_error) {
				failed++
			}
		}

		return { successful, failed }
	}

	private async processDirectEmail(job: Job): Promise<EmailJobResult> {
		const startTime = Date.now()
		const { to, subject, html, text, attachments } = job.data

		this.logger.debug(
			`Processing direct email job ${job.id ?? 'unknown'}`,
			{
				subject,
				recipients: Array.isArray(to) ? to.length : 1,
				attempt: job.attemptsMade + 1
			}
		)

		try {
			// For direct emails, we bypass the template system
			const result = await this.resendEmailService.sendDirectEmail({
				to: Array.isArray(to) ? to : [to],
				subject,
				html,
				text,
				attachments
			})

			const processingTime = Date.now() - startTime

			return {
				jobId: String(job.id ?? 'unknown'),
				success: result.success,
				messageId: result.messageId,
				error: result.error,
				timestamp: new Date(),
				processingTime,
				recipientCount: Array.isArray(to) ? to.length : 1
			}
		} catch (error) {
			const processingTime = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'

			this.logger.error(`❌ Direct email job ${job.id || 'unknown'} failed`, {
				subject,
				recipients: Array.isArray(to) ? to.length : 1,
				attempt: job.attemptsMade + 1,
				error: errorMessage,
				processingTime
			})

			return {
				jobId: String(job.id ?? 'unknown'),
				success: false,
				error: errorMessage,
				timestamp: new Date(),
				processingTime,
				recipientCount: Array.isArray(to) ? to.length : 1
			}
		}
	}
}
