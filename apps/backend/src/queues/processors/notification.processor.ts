import { Process, Processor } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Job } from 'bull'
import { QUEUE_NAMES } from '../constants/queue-names'
import {
	BaseJobData,
	BaseProcessor,
	ProcessorResult
} from '../base/base.processor'
import { EmailQueueService } from '../../email/services/email-queue.service'
import { EmailMetricsService } from '../../email/services/email-metrics.service'
import { EmailTemplateName } from '../../email/types/email-templates.types'
import { EmailPriority } from '../../email/types/email-queue.types'

interface NotificationJobData extends BaseJobData {
	type: 'email' | 'sms' | 'push' | 'in-app'
	recipient: string
	subject: string
	content: string
	template?: EmailTemplateName
	templateData?: Record<string, unknown>
	metadata?: Record<string, unknown>
	userId?: string
	organizationId?: string
	priority?: 'low' | 'normal' | 'high'
}

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends BaseProcessor<NotificationJobData> {

	constructor(
		private readonly emailQueueService: EmailQueueService,
		private readonly metricsService: EmailMetricsService
	) {
		super(NotificationProcessor.name)
	}

	@Process('send-notification')
	async handleNotification(job: Job<NotificationJobData>): Promise<ProcessorResult> {
		return this.handleJob(job)
	}

	protected async processJob(job: Job<NotificationJobData>): Promise<ProcessorResult> {
		const startTime = Date.now()
		const { type, recipient, subject } = job.data
		
		this.logger.logQueueEvent('notification_processing', {
			type,
			recipient,
			subject: subject.substring(0, 50)
		})

		try {
			// Track notification start
			await this.metricsService.trackEmailEvent('notification_started', {
				metadata: {
					type,
					recipient,
					subject: subject.substring(0, 50), // Limit subject length in logs
					jobId: job.id?.toString(),
					userId: job.data.userId,
					organizationId: job.data.organizationId,
					priority: job.data.priority || 'normal'
				}
			})

			let result: { success: boolean; messageId?: string; error?: string }

			switch (type) {
				case 'email':
					result = await this.sendEmailNotification(job.data)
					break
				case 'sms':
					result = await this.sendSmsNotification(job.data)
					break
				case 'push':
					result = await this.sendPushNotification(job.data)
					break
				case 'in-app':
					result = await this.sendInAppNotification(job.data)
					break
				default:
					throw new Error(`Unknown notification type: ${type}`)
			}

			// Track success
			await this.metricsService.trackEmailEvent('notification_completed', {
				messageId: result.messageId,
				processingTime: Date.now() - startTime,
				metadata: {
					type,
					recipient,
					jobId: job.id?.toString(),
					userId: job.data.userId,
					organizationId: job.data.organizationId,
					success: result.success
				}
			})

			return {
				success: true,
				data: {
					type,
					recipient,
					messageId: result.messageId,
					delivered: result.success
				},
				processingTime: Date.now() - startTime,
				timestamp: new Date()
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			
			// Track failure
			await this.metricsService.trackEmailEvent('notification_failed', {
				error: errorMessage,
				processingTime: Date.now() - startTime,
				metadata: {
					type,
					recipient,
					jobId: job.id?.toString(),
					userId: job.data.userId,
					organizationId: job.data.organizationId
				}
			})

			this.logger.logJobFailure(job, error instanceof Error ? error : new Error(errorMessage), Date.now() - startTime)
			throw error
		}
	}

	private async sendEmailNotification(
		data: NotificationJobData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			// Use the existing email queue service to send emails
			// This integrates with our completed email processor

			// Add email to queue for processing by email processor
			const job = data.template 
				? await this.emailQueueService.addTemplatedEmail(
					data.template,
					data.templateData || {},
					data.recipient,
					{
						userId: data.userId,
						organizationId: data.organizationId,
						priority: this.mapPriorityToEmailPriority(data.priority)
					}
				)
				: await this.emailQueueService.addDirectEmail({
					to: data.recipient,
					subject: data.subject,
					html: `<p>${data.content}</p>`,
					text: data.content,
					userId: data.userId,
					organizationId: data.organizationId,
					priority: this.mapPriorityToEmailPriority(data.priority)
				})

			this.logger.logQueueEvent('email_notification_queued', {
				jobId: job.id?.toString(),
				recipient: data.recipient,
				type: data.template ? 'templated' : 'direct'
			})
			
			return {
				success: true,
				messageId: job.id?.toString()
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.logQueueEvent('email_notification_queue_failed', {
				error: errorMessage,
				recipient: data.recipient
			})
			
			return {
				success: false,
				error: errorMessage
			}
		}
	}

	private async sendSmsNotification(
		data: NotificationJobData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			// TODO: Implement SMS service integration (Twilio, AWS SNS, etc.)
			// For now, we'll log the SMS attempt and mark as successful
			
			this.logger.logSimulation('SMS', 100)

			// Simulate SMS processing delay
			await new Promise(resolve => setTimeout(resolve, 100))

			// Track SMS attempt (will be useful when real SMS service is implemented)
			await this.metricsService.trackEmailEvent('sms_notification_simulated', {
				metadata: {
					recipient: data.recipient,
					messageLength: data.content.length,
					userId: data.userId,
					organizationId: data.organizationId
				}
			})

			return {
				success: true,
				messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.logQueueEvent('sms_notification_failed', {
				error: errorMessage,
				recipient: data.recipient
			})
			
			return {
				success: false,
				error: errorMessage
			}
		}
	}

	private async sendPushNotification(
		data: NotificationJobData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			// TODO: Implement push notification service (FCM, APNS)
			// For now, we'll log the push attempt and mark as successful
			
			this.logger.logSimulation('push', 50)

			// Simulate push processing delay
			await new Promise(resolve => setTimeout(resolve, 50))

			// Track push attempt (will be useful when real push service is implemented)
			await this.metricsService.trackEmailEvent('push_notification_simulated', {
				metadata: {
					recipient: data.recipient,
					title: data.subject,
					userId: data.userId,
					organizationId: data.organizationId
				}
			})

			return {
				success: true,
				messageId: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.logQueueEvent('push_notification_failed', {
				error: errorMessage,
				recipient: data.recipient
			})
			
			return {
				success: false,
				error: errorMessage
			}
		}
	}

	private async sendInAppNotification(
		data: NotificationJobData
	): Promise<{ success: boolean; messageId?: string; error?: string }> {
		try {
			// TODO: Implement in-app notification storage and WebSocket emission
			// This would typically:
			// 1. Store notification in database (notifications table)
			// 2. Emit real-time event via WebSocket to user's connected sessions
			// 3. Track notification as unread
			
			this.logger.logSimulation('in-app', 25)

			// Simulate database storage and WebSocket emission
			await new Promise(resolve => setTimeout(resolve, 25))

			// Track in-app notification (will be useful when real storage is implemented)
			await this.metricsService.trackEmailEvent('in_app_notification_simulated', {
				metadata: {
					recipient: data.recipient,
					subject: data.subject,
					contentLength: data.content.length,
					userId: data.userId,
					organizationId: data.organizationId
				}
			})

			return {
				success: true,
				messageId: `inapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
			}

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.logQueueEvent('in_app_notification_failed', {
				error: errorMessage,
				recipient: data.recipient
			})
			
			return {
				success: false,
				error: errorMessage
			}
		}
	}

	/**
	 * Map notification priority to email priority
	 */
	private mapPriorityToEmailPriority(priority?: 'low' | 'normal' | 'high'): EmailPriority {
		switch (priority) {
			case 'high':
				return EmailPriority.HIGH
			case 'low':
				return EmailPriority.BULK
			default:
				return EmailPriority.NORMAL
		}
	}
}