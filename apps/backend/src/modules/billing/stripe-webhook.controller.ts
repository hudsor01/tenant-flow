/**
 * Stripe Webhook Controller
 *
 * Handles Stripe webhook events for:
 * - Payment method attached/updated
 * - Subscription status changes
 * - Payment failures/retries
 * - Customer deletions
 *
 * Uses NestJS EventEmitter2 for event-driven cleanup
 */

import type Stripe from 'stripe'
import {
	BadRequestException,
	Controller,
	Headers,
	Logger,
	Post,
	Req
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { RawBodyRequest } from '../../shared/types/express-request.types'
import { StripeConnectService } from './stripe-connect.service'

@Controller('webhooks/stripe')
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name)

	constructor(
		private readonly stripeConnect: StripeConnectService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Handle Stripe webhook events
	 *
	 * IMPORTANT: Requires raw body for signature verification
	 * Configure in main.ts with rawBody: true
	 */
	@Post()
	async handleWebhook(
		@Req() req: RawBodyRequest,
		@Headers('stripe-signature') signature: string
	) {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		const stripe = this.stripeConnect.getStripe()
		const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		let event: Stripe.Event

		try {
			// Verify webhook signature
			event = stripe.webhooks.constructEvent(
				req.rawBody || '',
				signature,
				webhookSecret
			)
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

		// Emit event using NestJS EventEmitter2
		// Event listeners handle business logic separately
		this.eventEmitter.emit(`stripe.${event.type}`, event.data.object)

		return { received: true }
	}
}
