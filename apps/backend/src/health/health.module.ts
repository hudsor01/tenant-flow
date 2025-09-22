import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { StripeModule } from '../billing/stripe.module'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseService } from '../database/supabase.service'
import { ResilienceService } from '../shared/services/resilience.service'
import { HealthController } from './health.controller'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { SupabaseHealthIndicator } from './supabase.health'

// Factory provider pattern for explicit SupabaseService injection
const SupabaseServiceFactory = {
	provide: 'SUPABASE_SERVICE_FOR_HEALTH',
	useFactory: (supabaseService: SupabaseService) => {
		return supabaseService
	},
	inject: [SupabaseService]
}

@Module({
	imports: [
		TerminusModule.forRoot(),
		SupabaseModule,
		StripeModule // StripeModule exports StripeSyncService
	],
	controllers: [
		HealthController
	],
	providers: [
		SupabaseHealthIndicator,
		StripeFdwHealthIndicator,
		ResilienceService,
		SupabaseServiceFactory
	],
	exports: []
})
export class HealthModule {}
