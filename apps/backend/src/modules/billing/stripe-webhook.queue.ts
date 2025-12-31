import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Job } from 'bullmq'
import type Stripe from 'stripe'
import { AppLogger } from '../../logger/app-logger.service'
import { WebhookProcessor } from './webhook-processor.service'

export interface StripeWebhookJob {
	eventId: string
	eventType: string
	stripeEvent: Stripe.Event
}

@Processor('stripe-webhooks', {
	concurrency: 10, // Process 10 webhooks concurrently
	limiter: {
		max: 200, // Max 200 webhook processing jobs
		duration: 60000 // Per minute (Stripe can send bursts)
	}
})
@Injectable()
export class StripeWebhookQueueProcessor extends WorkerHost {
	constructor(
		private readonly processor: WebhookProcessor,
		private readonly logger: AppLogger
	) {
		super()
	}

	async process(job: Job<StripeWebhookJob>): Promise<void> {
		const { eventId, eventType, stripeEvent } = job.data

		this.logger.log(`Processing Stripe webhook: ${eventType}`, {
			jobId: job.id,
			eventId,
			attempt: job.attemptsMade + 1
		})

		try {
			// Use existing WebhookProcessor
			await this.processor.processEvent(stripeEvent)

			this.logger.log(`Webhook processed successfully: ${eventType}`, {
				jobId: job.id,
				eventId
			})
		} catch (error) {
			this.logger.error(`Webhook processing failed: ${eventType}`, {
				jobId: job.id,
				eventId,
				error: error instanceof Error ? error.message : String(error),
				attempt: job.attemptsMade + 1
			})
			throw error // Let BullMQ handle retry
		}
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<StripeWebhookJob>, error: Error) {
		this.logger.error(
			`Stripe webhook permanently failed after ${job.attemptsMade} attempts`,
			{
				jobId: job.id,
				eventId: job.data.eventId,
				eventType: job.data.eventType,
				error: error.message
			}
		)
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<StripeWebhookJob>) {
		this.logger.log(`Stripe webhook completed`, {
			jobId: job.id,
			eventId: job.data.eventId,
			duration: Date.now() - job.timestamp
		})
	}
}
