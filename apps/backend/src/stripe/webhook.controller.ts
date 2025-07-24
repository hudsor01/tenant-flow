import { Controller, Post, Headers, Body, HttpCode, HttpStatus, BadRequestException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { Public } from '../auth/decorators/public.decorator'
import { WebhookService } from './webhook.service'

@Controller('/stripe/webhook')
export class WebhookController {
	private readonly logger = new Logger(WebhookController.name)
	private _stripe: Stripe | null = null

	constructor(
		private readonly configService: ConfigService,
		private readonly webhookService: WebhookService
	) {}

	private get stripe(): Stripe {
		if (!this._stripe) {
			const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				throw new BadRequestException('Stripe secret key not configured')
			}
			this._stripe = new Stripe(secretKey)
		}
		return this._stripe
	}

	@Public()
	@Post()
	@HttpCode(HttpStatus.OK)
	async handleWebhook(
		@Headers('stripe-signature') signature: string,
		@Body() rawBody: Buffer
	): Promise<{ received: boolean }> {
		if (!signature) {
			throw new BadRequestException('Missing stripe-signature header')
		}

		const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')
		if (!webhookSecret) {
			throw new BadRequestException('Webhook secret not configured')
		}

		let event: Stripe.Event

		try {
			// SECURITY FIX: Use Stripe's constructEvent method for proper signature verification
			event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
		} catch (err) {
			this.logger.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
			throw new BadRequestException('Invalid webhook signature')
		}

		try {
			// Process the webhook event
			await this.webhookService.handleWebhookEvent(event)
			this.logger.debug(`Successfully processed webhook event: ${event.type}`)
		} catch (error) {
			this.logger.error(`Error processing webhook event ${event.type}:`, error)
			// Still return 200 to prevent Stripe from retrying if it's a business logic error
			// Only throw if it's a validation/security error
			if (error instanceof BadRequestException) {
				throw error
			}
		}

		return { received: true }
	}
}