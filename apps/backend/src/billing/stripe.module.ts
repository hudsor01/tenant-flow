import { Module } from '@nestjs/common'

import { StripeSyncService } from './stripe-sync.service'
import { StripeDataService } from './stripe-data.service'
import { StripeController } from './stripe.controller'
import { SupabaseModule } from '../database/supabase.module'
import { EventEmitter2 } from '@nestjs/event-emitter'

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
		// Stripe Sync Engine integration (using native @supabase/stripe-sync-engine)
		StripeSyncService,
		
		// Data access layer for stripe.* tables  
		StripeDataService,

		// Event system (native NestJS)
		EventEmitter2
	],
	controllers: [
		StripeController // Single production-grade controller with all Stripe functionality
	],
	exports: [
		StripeSyncService,
		StripeDataService
	]
})
export class StripeModule {}
