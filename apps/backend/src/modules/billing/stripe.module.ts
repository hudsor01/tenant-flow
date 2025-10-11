import { Module } from '@nestjs/common'

import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseModule } from '../../database/supabase.module'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { StripeDataService } from './stripe-data.service'
import { StripeEventProcessor } from './stripe-event-processor.service'
import { StripeRecoveryService } from './stripe-recovery.service'
import { StripeSyncService } from './stripe-sync.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeController } from './stripe.controller'
import { StripeService } from './stripe.service'

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
	imports: [SupabaseModule, RepositoriesModule],
	providers: [
		// Native Stripe SDK service
		StripeService,

		// Stripe Sync Engine integration (using native @supabase/stripe-sync-engine)
		StripeSyncService,

		// Data access layer using Stripe API directly
		StripeDataService,

		// Database-backed webhook idempotency service
		StripeWebhookService,

		// Async event processor for webhook events
		StripeEventProcessor,

		// Event recovery service for failed webhooks
		StripeRecoveryService,

		// Event system (native NestJS)
		EventEmitter2
	],
	controllers: [
		StripeController // Single production-grade controller with all Stripe functionality
	],
	exports: [
		StripeService,
		StripeSyncService,
		StripeDataService,
		StripeWebhookService,
		StripeEventProcessor,
		StripeRecoveryService
	]
})
export class StripeModule {}
