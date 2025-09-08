import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { StripeSyncService } from './stripe-sync.service'
import { StripeDataService } from './stripe-data.service'
import { StripeController } from './stripe.controller'
import { StripeWebhookController } from './stripe-webhook.controller'
import { SupabaseService } from '../database/supabase.service'

@Module({
	imports: [
		ConfigModule
	],
	providers: [
		// Stripe Sync Engine integration
		StripeSyncService,
		
		// Data access layer for stripe.* tables
		StripeDataService,

		// Database
		SupabaseService
	],
	controllers: [
		StripeController,
		StripeWebhookController // Dedicated webhook controller
	],
	exports: [
		StripeSyncService,
		StripeDataService
	]
})
export class StripeModule {}
