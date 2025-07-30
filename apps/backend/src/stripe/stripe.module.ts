import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { HttpModule } from '@nestjs/axios'

// Core Stripe Services
import { StripeService } from './stripe.service'
import { StripeDBService } from './stripe-db.service'
import { StripeBillingService } from './stripe-billing.service'
import { StripeCheckoutService } from './stripe-checkout.service'
import { StripeErrorHandler } from './stripe-error.handler'
import { PaymentRecoveryService } from './payment-recovery.service'

// Webhook System
import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { StripeCheckoutController } from './stripe-checkout.controller'

import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'
import { SubscriptionNotificationService } from '../notifications/subscription-notification.service'
import { FeatureAccessService } from '../subscriptions/feature-access.service'

@Module({
	imports: [
		PrismaModule,
		EmailModule,
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		HttpModule
	],
	controllers: [WebhookController, StripeCheckoutController],
	providers: [
		ConfigService,
		StripeService,
		StripeDBService,
		StripeBillingService,
		StripeCheckoutService,
		StripeErrorHandler,
		PaymentRecoveryService,
		
		// Webhook services
		WebhookService,
		
		// Notification and feature access services
		SubscriptionNotificationService,
		FeatureAccessService
	],
	exports: [
		StripeService,
		StripeDBService,
		StripeBillingService,
		StripeCheckoutService,
		PaymentRecoveryService,
		
		// Webhook system exports
		WebhookService,
		
		// Notification and feature access exports
		SubscriptionNotificationService,
		FeatureAccessService
	]
})
export class StripeModule {}