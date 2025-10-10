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

		// Store event ID BEFORE processing to prevent race conditions
		// Implements compound idempotency: event.id + object.id:event.type
		// Database PRIMARY KEY constraint ensures atomicity
		const objectId =
			(event.data.object as { id?: string })?.id || undefined

		try {
			await this.stripeWebhookService.storeEventId(
				event.id,
				event.type,
				objectId
			)
		} catch (error) {
			// Postgres unique violation code 23505 means already processed
			if ((error as { code?: string }).code === '23505') {
				this.logger.log(`Event ${event.id} already processed (duplicate)`)
				return { received: true, duplicate: true }
			}
			// Re-throw other database errors
			throw error
		}

		// Process the event (happens after successful deduplication)
		try {
			await this.stripeWebhookService.processWebhookEvent(event)
			return { received: true }
		} catch (error) {
			this.logger.error('Webhook processing failed', error)
			throw new BadRequestException('Processing failed')
		}
	}
}
