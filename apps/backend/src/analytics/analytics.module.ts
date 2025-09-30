import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { DashboardAnalyticsService } from './dashboard-analytics.service'

@Module({
	imports: [SupabaseModule],
	controllers: [AnalyticsController],
	providers: [
		AnalyticsService,
		DashboardAnalyticsService
	],
	exports: [
		AnalyticsService,
		DashboardAnalyticsService
	]
})
export class AnalyticsModule {}
