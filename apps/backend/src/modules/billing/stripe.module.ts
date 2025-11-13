import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { SecurityModule } from '../../security/security.module'
import { MetricsModule } from '../metrics/metrics.module'
import { StripeAccessControlService } from './stripe-access-control.service'
import { StripeDataService } from './stripe-data.service'
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
import { StripeIdentityController } from './stripe-identity.controller'
import { StripeIdentityService } from './stripe-identity.service'
import { UsersModule } from '../users/users.module'

/**
 * Production-Grade Stripe Module
 *
 * Consolidated from 3 controllers into 1 comprehensive controller
 * Based on official Stripe documentation patterns:
 * - Payment Intent lifecycle management
 * - Advanced webhook handling with signature verification
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
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeAccessControlService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService,
		StripeIdentityService,
		StripeWebhookListener,
		WebhookRetryService
	],
	controllers: [
		StripeController,
		StripeConnectController,
		StripeWebhookController,
		StripeIdentityController
	],
	exports: [
		StripeService,
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeAccessControlService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService,
		StripeIdentityService
	]
})
export class StripeModule {}
