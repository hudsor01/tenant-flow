import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { VisitorAnalyticsController } from './visitor-analytics.controller'

@Module({
	imports: [SupabaseModule],
	controllers: [AnalyticsController, VisitorAnalyticsController],
	providers: [AnalyticsService],
	exports: [AnalyticsService]
})
export class AnalyticsModule {}
