import { Module } from '@nestjs/common'

import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
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
	imports: [SupabaseModule, EmailModule],
	providers: [
		StripeService,
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeAccessControlService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService
	],
	controllers: [StripeController, StripeConnectController],
	exports: [
		StripeService,
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		StripeRecoveryService,
		StripeAccessControlService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService
	]
})
export class StripeModule {}
