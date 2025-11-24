import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseService } from '../database/supabase.service'
import { StripeModule } from '../modules/billing/stripe.module'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
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
	controllers: [HealthController],
	providers: [
		HealthService,
		MetricsService,
		CircuitBreakerService,
		SupabaseHealthIndicator,
		SupabaseServiceFactory
	],
	exports: []
})
export class HealthModule {}
