import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

// Core Stripe Services - Following official Stripe NestJS patterns
import { StripeService } from './stripe.service'
import { StripeErrorHandler } from './stripe-error.handler'

// Webhook System
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'

import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [
		ConfigModule.forRoot(), // Self-contained config
		PrismaModule
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