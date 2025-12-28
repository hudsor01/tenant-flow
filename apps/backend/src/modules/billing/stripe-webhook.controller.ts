/**
 * Stripe Webhook Controller
 *
 * Verifies Stripe signatures, then queues the event for async processing.
 * Responds quickly to avoid Stripe timeouts and leverages BullMQ retries.
 */

import { InjectQueue } from '@nestjs/bullmq'
import {
	BadRequestException,
	Controller,
	Headers,
	InternalServerErrorException,
	Post,
	Req
} from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Queue } from 'bullmq'
import type { Request } from 'express'
import type Stripe from 'stripe'
import { AppConfigService } from '../../config/app-config.service'
import { createThrottleDefaults } from '../../config/throttle.config'
import { AppLogger } from '../../logger/app-logger.service'
import { Public } from '../../shared/decorators/public.decorator'
import { StripeConnectService } from './stripe-connect.service'
import type { StripeWebhookJob } from './stripe-webhook.queue'

const STRIPE_WEBHOOK_THROTTLE = createThrottleDefaults({
	envTtlKey: 'WEBHOOK_THROTTLE_TTL',
	envLimitKey: 'WEBHOOK_THROTTLE_LIMIT',
	defaultTtl: 60000,
	defaultLimit: 30
})

@Controller('webhooks/stripe')
export class StripeWebhookController {
	constructor(
		private readonly stripeConnect: StripeConnectService,
		private readonly config: AppConfigService,
		private readonly logger: AppLogger,
		@InjectQueue('stripe-webhooks')
		private readonly webhookQueue: Queue<StripeWebhookJob>
	) {}

	/**
	 * Handle Stripe webhook events
	 *
	 * IMPORTANT: Requires raw body for signature verification
	 * Configure in `main.ts` with `rawBody: true`.
	 */
	@Public()
	@Throttle({ default: STRIPE_WEBHOOK_THROTTLE })
	@Post()
	async handleWebhook(
		@Req() req: RawBodyRequest<Request>,
		@Headers('stripe-signature') signature: string
	) {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		const webhookSecret = this.config.getStripeWebhookSecret()
		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		const rawBody: string | Buffer | undefined =
			req.rawBody ?? (Buffer.isBuffer(req.body) ? req.body : undefined)

		if (!rawBody) {
			this.logger.error('Stripe webhook invoked without raw body payload')
			throw new BadRequestException('Webhook body missing')
		}

		let event: Stripe.Event
		try {
			const stripe = this.stripeConnect.getStripe()
			event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
		} catch (error) {
			this.logger.error('Webhook signature verification failed', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Invalid webhook signature')
		}

		this.logger.log('Stripe webhook received', {
			type: event.type,
			id: event.id
		})

		try {
			await this.webhookQueue.add(
				event.type,
				{
					eventId: event.id,
					eventType: event.type,
					stripeEvent: event
				},
				{ jobId: event.id }
			)

			return { received: true }
		} catch (error) {
			this.logger.error('Stripe webhook queuing failed', {
				type: event.type,
				id: event.id,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new InternalServerErrorException('Webhook queuing failed')
		}
	}
}
