import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Job } from 'bullmq'
import type Stripe from 'stripe'
import * as Sentry from '@sentry/nestjs'
import { AppLogger } from '../../../logger/app-logger.service'
import { WebhookProcessor } from './webhook-processor.service'
import { MetricsService } from '../../metrics/metrics.service'

export interface WebhookJob {
	eventId: string
	eventType: string
	stripeEvent: Stripe.Event
}

/**
 * @deprecated Use WebhookJob instead. Kept for backward compatibility.
 */
export type StripeWebhookJob = WebhookJob

@Processor('stripe-webhooks', {
	concurrency: 10, // Process 10 webhooks concurrently
	limiter: {
		max: 200, // Max 200 webhook processing jobs
		duration: 60000 // Per minute (Stripe can send bursts)
	}
})
@Injectable()
export class WebhookQueueProcessor extends WorkerHost {
	constructor(
		private readonly processor: WebhookProcessor,
		private readonly logger: AppLogger,
		private readonly metrics: MetricsService
	) {
		super()
	}

	async process(job: Job<WebhookJob>): Promise<void> {
		const { eventId, eventType, stripeEvent } = job.data
		const startTime = Date.now()

		// Start Sentry transaction for this background job
		const span = Sentry.startInactiveSpan({
			name: `webhook.${eventType}.process`,
			op: 'queue.process',
			attributes: {
				'job.id': job.id ?? 'unknown',
				'job.attempts': job.attemptsMade + 1,
				'stripe.event_id': eventId,
				'stripe.event_type': eventType
			}
		})

		this.logger.log(`Processing Stripe webhook: ${eventType}`, {
			jobId: job.id,
			eventId,
			attempt: job.attemptsMade + 1
		})

		// Record that webhook was received
		this.metrics.recordStripeWebhookReceived(eventType)

		try {
			// Use existing WebhookProcessor
			await this.processor.processEvent(stripeEvent)

			const durationMs = Date.now() - startTime
			this.logger.log(`Webhook processed successfully: ${eventType}`, {
				jobId: job.id,
				eventId,
				durationMs
			})

			// Record successful processing
			this.metrics.recordStripeWebhookProcessed(eventType)
			this.metrics.recordStripeWebhookDuration(eventType, 'success', durationMs)

			// End span on success
			span?.end()
		} catch (error) {
			const durationMs = Date.now() - startTime
			const errorMessage = error instanceof Error ? error.message : String(error)
			const errorType = error instanceof Error ? error.constructor.name : 'UnknownError'

			this.logger.error(`Webhook processing failed: ${eventType}`, {
				jobId: job.id,
				eventId,
				error: errorMessage,
				attempt: job.attemptsMade + 1,
				durationMs
			})

			// Record failure (will be retried unless exhausted)
			this.metrics.recordStripeWebhookFailed(eventType, errorType)
			this.metrics.recordStripeWebhookDuration(eventType, 'failure', durationMs)

			// End span on failure
			span?.end()

			throw error // Let BullMQ handle retry
		}
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<WebhookJob>, error: Error) {
		const maxAttempts = job.opts.attempts ?? 5
		const isExhausted = job.attemptsMade >= maxAttempts

		this.logger.error(
			`Stripe webhook ${isExhausted ? 'permanently ' : ''}failed after ${job.attemptsMade} attempts`,
			{
				jobId: job.id,
				eventId: job.data.eventId,
				eventType: job.data.eventType,
				error: error.message,
				stack: error.stack,
				isExhausted,
				severity: isExhausted ? 'critical' : 'warning'
			}
		)

		if (isExhausted) {
			// DLQ alert - structured for alerting systems (log aggregators, SIEM)
			this.logger.error('WEBHOOK_DLQ_ALERT: Webhook moved to dead letter queue', {
				alertType: 'webhook_dlq',
				eventId: job.data.eventId,
				eventType: job.data.eventType,
				failureReason: error.message,
				attemptsMade: job.attemptsMade,
				stripeEventId: job.data.stripeEvent?.id
			})

			// Record DLQ metric
			this.metrics.recordStripeWebhookDlq(job.data.eventType)

			// Capture in Sentry for alerting
			Sentry.captureException(error, {
				tags: {
					eventType: job.data.eventType,
					alertType: 'webhook_dlq'
				},
				extra: {
					jobId: job.id,
					eventId: job.data.eventId,
					attemptsMade: job.attemptsMade,
					stripeEventId: job.data.stripeEvent?.id
				}
			})
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<WebhookJob>) {
		this.logger.log(`Stripe webhook completed`, {
			jobId: job.id,
			eventId: job.data.eventId,
			duration: Date.now() - job.timestamp
		})
	}
}
