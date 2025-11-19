import { Injectable, Logger, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseService } from '../../database/supabase.service'
import { PrometheusService } from '../observability/prometheus.service'
import type { Database } from '@repo/shared/types/supabase'

type WebhookEventRow = Database['public']['Tables']['webhook_events']['Row']

@Injectable()
export class WebhookRetryService {
	private readonly logger = new Logger(WebhookRetryService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		@Optional() private readonly prometheus: PrometheusService | null
	) {}

	/**
	 * Retry failed webhooks every 5 minutes
	 * Max 3 retry attempts with exponential backoff
	 */
	@Cron(CronExpression.EVERY_5_MINUTES)
	async retryFailedWebhooks() {
		this.logger.log('Starting webhook retry job')

		const client = this.supabase.getAdminClient()

		// Query webhook_attempts table for failed attempts
		const { data: attempts, error } = await client
			.from('webhook_attempts')
			.select('*, webhook_event:webhook_events!inner(*)')
			.eq('status', 'failed')
			.lt('retry_count', 3) // Max 3 retries
			.order('created_at', { ascending: true })
			.limit(10)

		if (error) {
			this.logger.error('Failed to query webhook_attempts', error)
			return
		}

		if (!attempts || attempts.length === 0) {
			this.logger.log('No failed webhooks to retry')
			return
		}

		this.logger.log(`Retrying ${attempts.length} failed webhooks`)

		for (const attempt of attempts) {
			try {
				const webhookEvent = Array.isArray(attempt.webhook_event)
					? attempt.webhook_event[0]
					: attempt.webhook_event as WebhookEventRow

				if (!webhookEvent) {
					this.logger.warn(`No webhook event found for attempt ${attempt.id}`)
					continue
				}

				// Check if retry should be delayed (exponential backoff)
				const retryCount = attempt.retry_count || 0
				const retryDelay = this.calculateRetryDelay(retryCount)
				const lastAttempted = attempt.last_attempted_at || attempt.created_at || new Date().toISOString()
				const nextRetryTime = new Date(lastAttempted).getTime() + retryDelay
				const now = Date.now()

				if (now < nextRetryTime) {
					this.logger.log(
						`Skipping webhook ${webhookEvent.external_id} - retry scheduled for ${new Date(nextRetryTime).toISOString()}`
					)
					continue
				}

				// Re-emit event
				this.logger.log(
					`Retrying webhook ${webhookEvent.external_id} (attempt ${retryCount + 1})`
				)

				// Parse raw_payload safely
				const rawPayload =
					typeof webhookEvent.raw_payload === 'object' && webhookEvent.raw_payload !== null
						? (webhookEvent.raw_payload as Record<string, unknown>)
						: {}

				const eventData =
					'data' in rawPayload && typeof rawPayload.data === 'object'
						? (rawPayload.data as Record<string, unknown>)
						: {}

				const objectData =
					'object' in eventData && typeof eventData.object === 'object'
						? (eventData.object as Record<string, unknown>)
						: {}

				await this.eventEmitter.emitAsync(`stripe.${webhookEvent.event_type}`, {
					...objectData,
					eventId: webhookEvent.external_id,
					eventType: webhookEvent.event_type
				})

				// Mark attempt as successful
				await client
					.from('webhook_attempts')
					.update({
						status: 'success',
						last_attempted_at: new Date().toISOString()
					})
					.eq('id', attempt.id)

				// Record retry success
				this.prometheus?.recordWebhookRetry(webhookEvent.event_type, retryCount + 1)

				this.logger.log(`Successfully retried webhook ${webhookEvent.external_id}`)
			} catch (error) {
				const retryCount = attempt.retry_count || 0

				// Increment retry count
				await client
					.from('webhook_attempts')
					.update({
						retry_count: retryCount + 1,
						last_attempted_at: new Date().toISOString(),
						failure_reason:
							error instanceof Error ? error.message : String(error)
					})
					.eq('id', attempt.id)

				const webhookEvent = Array.isArray(attempt.webhook_event)
					? attempt.webhook_event[0]
					: attempt.webhook_event as WebhookEventRow

				this.logger.error(
					`Failed to retry webhook ${webhookEvent?.external_id || 'unknown'}: ${error instanceof Error ? error.message : String(error)}`
				)

				// Record retry failure
				if (webhookEvent) {
					this.prometheus?.recordWebhookFailure(
						webhookEvent.event_type,
						error instanceof Error ? error.constructor.name : 'UnknownError'
					)
				}
			}
		}

		this.logger.log('Webhook retry job completed')
	}

	/**
	 * Calculate exponential backoff delay
	 * Retry 1: 5 minutes
	 * Retry 2: 15 minutes
	 * Retry 3: 45 minutes
	 */
	private calculateRetryDelay(retryCount: number): number {
		const baseDelay = 5 * 60 * 1000 // 5 minutes in ms
		return baseDelay * Math.pow(3, retryCount)
	}
}
