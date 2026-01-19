import { Module, forwardRef } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { SecurityModule } from '../../security/security.module'
import { MetricsModule } from '../metrics/metrics.module'
import { SseModule } from '../notifications/sse/sse.module'
import { StripeSyncService } from './stripe-sync.service'
import { StripeTenantService } from './stripe-tenant.service'
import { StripeOwnerService } from './stripe-owner.service'
import { StripeController } from './stripe.controller'
import { ChargesController } from './charges.controller'
import { CheckoutController } from './checkout.controller'
import { InvoicesController } from './invoices.controller'
import { StripeService } from './stripe.service'
import { StripeCustomerService } from './stripe-customer.service'
import { StripeTenantController } from './stripe-tenant.controller'
import { UsersModule } from '../users/users.module'
import { BillingService } from './billing.service'
import { StripeSharedService } from './stripe-shared.service'

// Webhook sub-module (extracted for SRP)
import { WebhooksModule } from './webhooks/webhooks.module'

// Connect sub-module (extracted for SRP)
import { ConnectModule } from './connect/connect.module'

// Subscription controllers and services (kept in StripeModule to avoid circular deps)
import { SubscriptionController } from './subscriptions/subscription.controller'
import { PaymentMethodsController } from './subscriptions/payment-methods.controller'
import { SubscriptionService } from './subscriptions/subscription.service'
import { PaymentMethodService } from './subscriptions/payment-method.service'

/**
 * Production-Grade Stripe Module
 *
 * Consolidated module following official Stripe patterns:
 * - Direct SDK usage without abstraction layers
 * - Subscription billing with flexible pricing models
 * - Stripe Connect for multi-tenant payments (via ConnectModule)
 * - Type-safe DTOs with comprehensive validation
 *
 * Sub-modules:
 * - WebhooksModule: Webhook processing
 * - ConnectModule: Stripe Connect functionality
 *
 * Note: Subscription controllers/services are kept in StripeModule (not extracted)
 * to avoid circular dependency issues with forwardRef resolution.
 */
@Module({
	imports: [
		SupabaseModule,
		EmailModule,
		SecurityModule,
		MetricsModule,
		UsersModule,
		SseModule,
		forwardRef(() => WebhooksModule),
		ConnectModule
	],
	providers: [
		StripeService,
		StripeCustomerService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeTenantService,
		StripeOwnerService,
		// Subscription services (kept here to avoid circular deps)
		SubscriptionService,
		PaymentMethodService
	],
	controllers: [
		StripeController,
		ChargesController,
		CheckoutController,
		InvoicesController,
		StripeTenantController,
		// Subscription controllers (kept here to avoid circular deps)
		SubscriptionController,
		PaymentMethodsController
	],
	exports: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeTenantService,
		StripeOwnerService,
		SubscriptionService,
		PaymentMethodService,
		// Re-export ConnectModule services for external consumers
		ConnectModule
	]
})
export class StripeModule {}
