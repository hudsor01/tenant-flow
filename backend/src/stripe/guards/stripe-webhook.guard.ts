import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'

@Injectable()
export class StripeWebhookGuard implements CanActivate {
	private readonly logger = new Logger(StripeWebhookGuard.name)

	constructor(private configService: ConfigService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest()
		const signature = request.headers['stripe-signature']
		const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')

		if (!webhookSecret) {
			this.logger.error('Missing STRIPE_WEBHOOK_SECRET')
			return false
		}

		if (!signature) {
			this.logger.error('Missing stripe-signature header')
			return false
		}

		try {
			// Get raw body
			const body = request.rawBody || request.body

			// Construct and verify the webhook event
			const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
			if (!secretKey) {
				this.logger.error('Missing STRIPE_SECRET_KEY')
				return false
			}

			const stripe = new Stripe(secretKey, {
				apiVersion: '2025-06-30.basil',
			})

			const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

			// Attach the verified event to the request for use in the controller
			request.stripeEvent = event

			return true
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(`Webhook signature verification failed: ${errorMessage}`)
			return false
		}
	}
}