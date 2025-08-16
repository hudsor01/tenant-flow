import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { EventEmitterModule } from '@nestjs/event-emitter'
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
import { WebhookMonitoringController } from './webhook-monitoring.controller'
import { WebhookMetricsService } from './webhook-metrics.service'
import { WebhookHealthService } from './webhook-health.service'
import { WebhookErrorMonitorService } from './webhook-error-monitor.service'
import { WebhookObservabilityService } from './webhook-observability.service'
import { StripeCheckoutController } from './stripe-checkout.controller'

import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@MeasureLoadTime('StripeModule')
@Module({
	imports: [
		ConfigModule,
		PrismaModule, // Global module - should be available everywhere
		EmailModule,
		HttpModule,
		EventEmitterModule,
		NotificationsModule,
		forwardRef(() => SubscriptionsModule) // Fix circular dependency
	],
	controllers: [WebhookController, WebhookMonitoringController, StripeCheckoutController],
	providers: [
		StripeService,
		StripeDBService,
		StripeBillingService,
		StripeCheckoutService,
		StripeErrorHandler,
		PaymentRecoveryService,
		
		// Webhook services
		WebhookService,
		WebhookMetricsService,
		WebhookHealthService,
		WebhookErrorMonitorService,
		WebhookObservabilityService
	],
	exports: [
		StripeService,
		StripeDBService,
		StripeBillingService,  // 🚨 DEBUG: Explicitly exporting StripeBillingService
		StripeCheckoutService,
		PaymentRecoveryService,
		
		// Webhook system exports
		WebhookService,
		WebhookMetricsService,
		WebhookHealthService,
		WebhookErrorMonitorService,
		WebhookObservabilityService
	]
})
export class StripeModule {
	// Remove static logger and constructor to improve load time
}