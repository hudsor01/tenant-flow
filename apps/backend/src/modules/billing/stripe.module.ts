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

// Subscriptions sub-module (extracted for SRP)
import { SubscriptionsModule } from './subscriptions/subscriptions.module'

/**
 * Production-Grade Stripe Module
 *
 * Consolidated module following official Stripe patterns:
 * - Direct SDK usage without abstraction layers
 * - Subscription billing with flexible pricing models
 * - Stripe Connect for multi-tenant payments (via ConnectModule)
 * - Type-safe DTOs with comprehensive validation
 *
 * Extracted sub-modules:
 * - WebhooksModule: Webhook processing
 * - ConnectModule: Stripe Connect functionality
 * - SubscriptionsModule: Subscription and payment method management
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
		ConnectModule,
		SubscriptionsModule
	],
	providers: [
		StripeService,
		StripeCustomerService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeTenantService,
		StripeOwnerService
	],
	controllers: [
		StripeController,
		ChargesController,
		CheckoutController,
		InvoicesController,
		StripeTenantController
	],
	exports: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeTenantService,
		StripeOwnerService,
		// Re-export ConnectModule services for external consumers
		ConnectModule,
		// Re-export SubscriptionsModule services for external consumers
		SubscriptionsModule
	]
})
export class StripeModule {}
