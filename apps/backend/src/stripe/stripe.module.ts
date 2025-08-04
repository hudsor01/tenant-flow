import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

// Core Stripe Services - Following official Stripe NestJS patterns
import { StripeService } from './stripe.service'
import { StripeErrorHandler } from './stripe-error.handler'

// Webhook System
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

@Module({
	imports: [
		ConfigModule.forRoot() // Self-contained config
	],
	controllers: [WebhookController],
	providers: [
		StripeService,
		StripeErrorHandler,
		WebhookService
	],
	exports: [
		StripeService,
		WebhookService
	]
})
export class StripeModule {}