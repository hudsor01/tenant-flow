import { Injectable, Logger, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'
import { PrometheusService } from '../observability/prometheus.service'

type WebhookFailureRow = Database['public']['Tables']['webhook_failures']['Row']

@Injectable()
export class WebhookRetryService {
	private readonly logger = new Logger(WebhookRetryService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly queryHelpers: SupabaseQueryHelpers,
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

		// Query webhook_failures table
		const failures = await this.queryHelpers.queryList<WebhookFailureRow>(
			client
				.from('webhook_failures')
				.select('*')
				.is('resolved_at', null)
				.lt('retry_count', 3) // Max 3 retries
				.order('created_at', { ascending: true })
				.limit(10),
			{
				resource: 'webhook_failure',
				operation: 'findAll'
			}
		)

		if (failures.length === 0) {
			this.logger.log('No failed webhooks to retry')
			return
		}

		this.logger.log(`Retrying ${failures.length} failed webhooks`)

		for (const failure of failures) {
			try {
				// Check if retry should be delayed (exponential backoff)
				const retryCount = failure.retry_count || 0
				const retryDelay = this.calculateRetryDelay(retryCount)
				const createdAt = failure.created_at || new Date().toISOString()
				const nextRetryTime = new Date(createdAt).getTime() + retryDelay
				const now = Date.now()

				if (now < nextRetryTime) {
					this.logger.log(
						`Skipping webhook ${failure.stripe_event_id} - retry scheduled for ${new Date(nextRetryTime).toISOString()}`
					)
					continue
				}

				// Re-emit event
				this.logger.log(
					`Retrying webhook ${failure.stripe_event_id} (attempt ${retryCount + 1})`
				)

				// Parse raw_event_data safely
				const rawEventData =
					typeof failure.raw_event_data === 'object' && failure.raw_event_data !== null
						? (failure.raw_event_data as Record<string, unknown>)
						: {}

				const eventData =
					'data' in rawEventData && typeof rawEventData.data === 'object'
						? (rawEventData.data as Record<string, unknown>)
						: {}

				const objectData =
					'object' in eventData && typeof eventData.object === 'object'
						? (eventData.object as Record<string, unknown>)
						: {}

				await this.eventEmitter.emitAsync(`stripe.${failure.event_type}`, {
					...objectData,
					eventId: failure.stripe_event_id,
					eventType: failure.event_type
				})

				// Mark as resolved
				await client
					.from('webhook_failures')
					.update({ resolved_at: new Date().toISOString() })
					.eq('id', failure.id)

				// Record retry success
				this.prometheus?.recordWebhookRetry(failure.event_type, retryCount + 1)

				this.logger.log(`Successfully retried webhook ${failure.stripe_event_id}`)
			} catch (error) {
				const retryCount = failure.retry_count || 0

				// Increment retry count
				await client
					.from('webhook_failures')
					.update({
						retry_count: retryCount + 1,
						last_retry_at: new Date().toISOString(),
						last_error_message:
							error instanceof Error ? error.message : String(error)
					})
					.eq('id', failure.id)

				this.logger.error(
					`Failed to retry webhook ${failure.stripe_event_id}: ${error instanceof Error ? error.message : String(error)}`
				)

				// Record retry failure
				this.prometheus?.recordWebhookFailure(
					failure.event_type,
					error instanceof Error ? error.constructor.name : 'UnknownError'
				)
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
