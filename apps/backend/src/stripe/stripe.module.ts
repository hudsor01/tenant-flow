import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { MeasureLoadTime } from '../common/performance/performance.decorators'

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
// Temporarily removed to fix circular dependency
// import { SubscriptionNotificationService } from '../notifications/subscription-notification.service'
// import { FeatureAccessService } from '../subscriptions/feature-access.service'

@MeasureLoadTime('StripeModule')
@Module({
	imports: [
		ConfigModule,
		PrismaModule, // Global module - should be available everywhere
		EmailModule,
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
		StripeBillingService,  // 🚨 DEBUG: Explicitly exporting StripeBillingService
		StripeCheckoutService,
		PaymentRecoveryService,
		
		// Webhook system exports
		WebhookService
	]
})
export class StripeModule {
	// Remove static logger and constructor to improve load time
}