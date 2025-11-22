import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { SecurityModule } from '../../security/security.module'
import { MetricsModule } from '../metrics/metrics.module'
import { StripeRecoveryService } from './stripe-recovery.service'
import { StripeSyncService } from './stripe-sync.service'
import { StripeTenantService } from './stripe-tenant.service'
import { StripeOwnerService } from './stripe-owner.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeController } from './stripe.controller'
import { StripeService } from './stripe.service'
import { StripeConnectService } from './stripe-connect.service'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeWebhookListener } from './stripe-webhook.listener'
import { WebhookRetryService } from './webhook-retry.service'
import { StripeWebhookController } from './stripe-webhook.controller'
import { UsersModule } from '../users/users.module'
import { BillingService } from './billing.service'
import { StripeSharedService } from './stripe-shared.service'

/**
 * Production-Grade Stripe Module
 *
 * Consolidated module following official Stripe patterns:
 * - Direct SDK usage without abstraction layers
 * - Simple webhook handling with signature verification
 * - Subscription billing with flexible pricing models
 * - Stripe Connect for multi-tenant payments
 * - Type-safe DTOs with comprehensive validation
 */
@Module({
	imports: [
		SupabaseModule,
		EmailModule,
		SecurityModule,
		MetricsModule,
		UsersModule
	],
	providers: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService,
		StripeWebhookListener,
		WebhookRetryService
	],
	controllers: [
		StripeController,
		StripeConnectController,
		StripeWebhookController
	],
	exports: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService
	]
})
export class StripeModule {}
