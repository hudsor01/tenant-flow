import { Controller, Post, Headers, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { WebhookService } from './webhook.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller('/stripe/webhook')
export class WebhookController {
	constructor(
		private readonly stripeService: StripeService,
		private readonly webhookService: WebhookService,
		private readonly configService: ConfigService
	) {}

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

		try {
			// Construct and verify the event with timestamp tolerance (default 5 minutes)
			const event = this.stripeService.constructWebhookEvent(
				rawBody,
				signature,
				webhookSecret,
				300 // 5 minute tolerance for replay attack protection
			)

			// Process the event asynchronously but return immediately
			// This follows Stripe's best practice of quick 2xx response
			setImmediate(() => {
				this.webhookService.handleWebhookEvent(event).catch(error => {
					// Log error but don't fail the webhook response
					console.error('Webhook processing error:', error)
				})
			})

			return { received: true }
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes('Invalid webhook signature') || 
					error.message.includes('Timestamp outside the tolerance zone')) {
					throw new BadRequestException('Invalid webhook signature or timestamp')
				}
			}
			throw error
		}
	}
}