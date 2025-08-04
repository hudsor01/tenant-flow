import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
// Temporarily removed to fix circular dependency
// import { SubscriptionNotificationService } from '../notifications/subscription-notification.service'
// import { FeatureAccessService } from '../subscriptions/feature-access.service'

@Module({
	imports: [
		ConfigModule,
		PrismaModule,
		EmailModule,
		forwardRef(() => SubscriptionsModule),
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		HttpModule
	],
	controllers: [WebhookController, StripeCheckoutController],
	providers: [
		StripeService,
		StripeDBService,
		StripeBillingService,
		StripeCheckoutService,
		StripeErrorHandler,
		PaymentRecoveryService,
		
		// Webhook services
		WebhookService
	],
	exports: [
		StripeService,
		StripeDBService,
		StripeBillingService,
		StripeCheckoutService,
		PaymentRecoveryService,
		
		// Webhook system exports
		WebhookService
	]
})
export class StripeModule {}