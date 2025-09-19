import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseService } from '../database/supabase.service'
import { SupabaseHealthIndicator } from './supabase.health'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { StripeModule } from '../billing/stripe.module'
import { ResilienceService } from '../shared/services/resilience.service'

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
		// UnifiedMetricsController removed - use native Fastify metrics
	],
	providers: [
		SupabaseHealthIndicator,
		StripeFdwHealthIndicator,
		ResilienceService,
		SupabaseServiceFactory
		// HealthCheckService is automatically provided by TerminusModule
		// HealthIndicatorService is automatically provided by TerminusModule
		// Logger is provided globally via LoggerModule in app.module.ts
		// StripeSyncService is exported by StripeModule
	],
	exports: []
})
export class HealthModule {}
