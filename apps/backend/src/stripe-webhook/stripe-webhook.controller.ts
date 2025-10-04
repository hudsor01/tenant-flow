import {
	BadRequestException,
	Controller,
	Headers,
	Logger,
	Post,
	Request
} from '@nestjs/common'
import Stripe from 'stripe'
import { StripeWebhookService } from './stripe-webhook.service'

interface RawBodyRequest extends Request {
	rawBody?: Buffer
}

@Controller('stripe')
export class StripeWebhookController {
	private readonly logger = new Logger(StripeWebhookController.name)
	private readonly stripe: Stripe

	constructor(private readonly stripeWebhookService: StripeWebhookService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Stripe webhook endpoint
	 * CRITICAL: Must use raw request body for signature verification
	 */
	@Post('webhook')
	async handleWebhook(
		@Request() req: RawBodyRequest,
		@Headers('stripe-signature') signature: string
	) {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		let event: Stripe.Event

		try {
			// CRITICAL: req.rawBody must be the raw unparsed request body
			const rawBody = req.rawBody
			if (!rawBody) {
				throw new Error('Raw body not available')
			}

			event = this.stripe.webhooks.constructEvent(
				rawBody,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET || ''
			)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error'
			this.logger.error('Webhook signature verification failed', errorMessage)
			throw new BadRequestException('Invalid signature')
		}

		// Idempotency check
		const alreadyProcessed =
			await this.stripeWebhookService.checkEventProcessed(event.id)

		if (alreadyProcessed) {
			this.logger.log(`Event ${event.id} already processed`)
			return { received: true, cached: true }
		}

		try {
			await this.stripeWebhookService.processWebhookEvent(event)
			await this.stripeWebhookService.storeEventId(event.id, event.type)

			return { received: true }
		} catch (error) {
			this.logger.error('Webhook processing failed', error)
			throw new BadRequestException('Processing failed')
		}
	}
}
