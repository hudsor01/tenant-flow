import { Module } from '@nestjs/common'

// REMOVED: EventEmitter2 - Event emission now handled by Stripe Sync Engine
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeAccessControlService } from './stripe-access-control.service'
import { StripeDataService } from './stripe-data.service'
// REMOVED: StripeEventProcessor - Event processing now handled by Stripe Sync Engine
import { StripeRecoveryService } from './stripe-recovery.service'
import { StripeSyncService } from './stripe-sync.service'
import { StripeTenantService } from './stripe-tenant.service'
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
		// Native Stripe SDK service
		StripeService,

		// Stripe Sync Engine integration (using native @supabase/stripe-sync-engine)
		StripeSyncService,

		// Data access layer using Stripe API directly
		StripeDataService,

		// Database-backed webhook idempotency service
		StripeWebhookService,

		// REMOVED: StripeEventProcessor - Event processing now handled by Stripe Sync Engine

		// Event recovery service for failed webhooks
		StripeRecoveryService,

		// Subscription-based access control service
		StripeAccessControlService,

		// Tenant Stripe management service
		StripeTenantService,

		// Stripe Connect service for multi-landlord SaaS
		StripeConnectService

		// REMOVED: EventEmitter2 - Event emission now handled by Stripe Sync Engine
	],
	controllers: [
		StripeController, // Main Stripe controller
		StripeConnectController // Stripe Connect for multi-landlord SaaS
	],
	exports: [
		StripeService,
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		// REMOVED: StripeEventProcessor - Event processing now handled by Stripe Sync Engine
		StripeRecoveryService,
		StripeAccessControlService,
		StripeTenantService,
		StripeConnectService
	]
})
export class StripeModule {}
