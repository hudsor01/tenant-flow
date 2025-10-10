import { Module } from '@nestjs/common'
import Stripe from 'stripe'
import { StripeWebhookController } from './stripe-webhook.controller'
import { StripeWebhookService } from './stripe-webhook.service'

const STRIPE_CLIENT = 'STRIPE_CLIENT'

function createStripeClient(): Stripe {
	const key = process.env.STRIPE_SECRET_KEY || ''
	return new Stripe(key, {
		apiVersion: '2025-08-27' as Stripe.LatestApiVersion
	})
}

@Module({
	controllers: [StripeWebhookController],
	providers: [
		StripeWebhookService,
		{
			provide: STRIPE_CLIENT,
			useFactory: createStripeClient
		}
	],
	exports: [StripeWebhookService, STRIPE_CLIENT]
})
export class StripeWebhookModule {}
