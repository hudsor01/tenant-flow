import { Module } from '@nestjs/common'
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
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
		StripeFdwHealthIndicator,
		HealthIndicatorService
		// All custom monitoring services removed - use native Fastify plugins
	],
	exports: []
})
export class HealthModule {}
