import { Module } from '@nestjs/common'

import { EventEmitter2 } from '@nestjs/event-emitter'
import { SupabaseModule } from '../database/supabase.module'
import { StripeDataService } from './stripe-data.service'
import { StripeSyncService } from './stripe-sync.service'
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
	imports: [SupabaseModule],
	providers: [
		// Native Stripe SDK service
		StripeService,

		// Stripe Sync Engine integration (using native @supabase/stripe-sync-engine)
		StripeSyncService,

		// Data access layer using Stripe API directly
		StripeDataService,

		// Event system (native NestJS)
		EventEmitter2
	],
	controllers: [
		StripeController // Single production-grade controller with all Stripe functionality
	],
	exports: [StripeService, StripeSyncService, StripeDataService]
})
export class StripeModule {}
