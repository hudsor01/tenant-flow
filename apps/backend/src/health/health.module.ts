import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseService } from '../database/supabase.service'
import { EmailModule } from '../modules/email/email.module'
import { StripeModule } from '../modules/billing/stripe.module'
import { CircuitBreakerService } from './circuit-breaker.service'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { MetricsService } from './metrics.service'
import { SupabaseHealthIndicator } from './supabase.health'
import { BullMqHealthIndicator } from './bullmq.health'

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
		EmailModule,
		StripeModule // StripeModule exports StripeSyncService
	],
	controllers: [HealthController],
	providers: [
		HealthService,
		MetricsService,
		CircuitBreakerService,
		SupabaseHealthIndicator,
		BullMqHealthIndicator,
		SupabaseServiceFactory
	],
	exports: []
})
export class HealthModule {}
