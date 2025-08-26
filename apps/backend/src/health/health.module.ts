import { Module } from '@nestjs/common'
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
import { HealthController } from './health.controller'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseHealthIndicator } from './supabase.health'

@Module({
	imports: [TerminusModule, SupabaseModule],
	controllers: [HealthController], // Only essential health check
	providers: [SupabaseHealthIndicator, HealthIndicatorService],
	exports: []
})
export class HealthModule {}
