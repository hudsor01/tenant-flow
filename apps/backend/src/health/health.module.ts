import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseHealthIndicator } from './supabase.health'
import { StripeFdwHealthIndicator } from './stripe-fdw.health'
import { StripeModule } from '../billing/stripe.module'

@Module({
	imports: [TerminusModule, SupabaseModule, StripeModule],
	controllers: [
		HealthController
		// UnifiedMetricsController removed - use native Fastify metrics
	],
	providers: [
		SupabaseHealthIndicator,
		StripeFdwHealthIndicator
		// HealthCheckService is automatically provided by TerminusModule
		// HealthIndicatorService is automatically provided by TerminusModule  
		// Logger is available via NestJS built-in Logger
	],
	exports: []
})
export class HealthModule {}
