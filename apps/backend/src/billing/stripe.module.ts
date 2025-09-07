import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { StripeSyncService } from './stripe-sync.service'
import { StripeController } from './stripe.controller'
import { SupabaseService } from '../database/supabase.service'

@Module({
	imports: [
		ConfigModule
	],
	providers: [
		// Only StripeSyncService for @supabase/stripe-sync-engine integration
		StripeSyncService,

		// Database
		SupabaseService
	],
	controllers: [
		StripeController
	],
	exports: [
		StripeSyncService
	]
})
export class StripeModule {}
