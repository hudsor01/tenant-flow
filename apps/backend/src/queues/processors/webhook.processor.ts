import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Job } from 'bull'
import { QUEUE_NAMES } from '../queue.module'
import { firstValueFrom } from 'rxjs'

interface WebhookJobData {
	webhookId: string
	id: string
	url: string
	payload: Record<string, unknown>
	headers: Record<string, string>
	attemptNumber: number
	maxAttempts: number
}

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor {
	private readonly logger = new Logger(WebhookProcessor.name)

	constructor(
		private readonly httpService: HttpService,
		private readonly eventEmitter: EventEmitter2
	) {}

	@Process('retry-webhook')
	async handleWebhookRetry(job: Job<WebhookJobData>): Promise<void> {
		this.logger.log(`Processing webhook retry job: ${job.id}`)
		const { url, payload, headers, attemptNumber, maxAttempts } = job.data

		// Log handled by base processor

		try {
			await firstValueFrom(
				this.httpService.post(url, payload, {
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': 'TenantFlow-Webhook/1.0',
						...headers
					},
					timeout: 30000, // 30 second timeout
					validateStatus: status => status >= 200 && status < 300
				})
			)

			// Log handled by base processor
			// Processing logic
		} catch (error) {
			// Error handled by base processor

			if (attemptNumber >= maxAttempts) {
				// Error handled by base processor
				await this.handlePermanentFailure(job.data, error as Error)
				throw error
			} else {
				// Will be retried by the queue system
				throw error
			}
		}
	}

	private async handlePermanentFailure(
		data: WebhookJobData,
		error: Error
	): Promise<void> {
		// Store failure details for debugging and admin review
		const failureDetails = {
			webhookId: data.webhookId || data.id,
			url: data.url,
			attempts: data.maxAttempts,
			lastError: error.message,
			payload: data.payload,
			timestamp: new Date().toISOString()
		}

		// Log the permanent failure with full context
		this.logger.error('Webhook permanently failed after max retries', {
			...failureDetails,
			errorStack: error.stack
		})

		try {
			// Emit event for monitoring and alerting systems
			this.eventEmitter.emit('webhook.permanent_failure', {
				type: 'webhook_permanent_failure',
				...failureDetails,
				severity: this.getWebhookSeverity(data),
				requiresAdminReview: true
			})

			// Store failure in audit trail for admin review
			// This would typically go to a dedicated failure tracking table
			this.logger.warn('Webhook failure stored for admin review', {
				webhookId: data.webhookId || data.id,
				url: data.url,
				failureCount: data.maxAttempts,
				reviewRequired: true
			})
		} catch (processingError) {
			this.logger.error(
				'Failed to process webhook permanent failure:',
				processingError
			)
		}
	}

	/**
	 * Determine webhook severity for monitoring purposes
	 */
	private getWebhookSeverity(
		data: WebhookJobData
	): 'low' | 'medium' | 'high' | 'critical' {
		// Critical webhooks that affect core business operations
		const criticalPatterns = [
			'subscription',
			'payment',
			'invoice',
			'checkout'
		]

		const url = data.url.toLowerCase()
		const payload = JSON.stringify(data.payload).toLowerCase()

		if (
			criticalPatterns.some(
				pattern => url.includes(pattern) || payload.includes(pattern)
			)
		) {
			return 'critical'
		}

		// High priority for customer-facing operations
		const highPriorityPatterns = ['customer', 'charge', 'refund']

		if (
			highPriorityPatterns.some(
				pattern => url.includes(pattern) || payload.includes(pattern)
			)
		) {
			return 'high'
		}

		return 'medium'
	}
}
