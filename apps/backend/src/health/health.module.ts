import { Module } from '@nestjs/common'
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseHealthIndicator } from './supabase.health'

@Module({
	imports: [TerminusModule, SupabaseModule],
	controllers: [
		HealthController
		// UnifiedMetricsController removed - use native Fastify metrics
	],
	providers: [
		SupabaseHealthIndicator, 
		HealthIndicatorService
		// All custom monitoring services removed - use native Fastify plugins
	],
	exports: []
})
export class HealthModule {}
