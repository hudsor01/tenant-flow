import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'

@Module({
	imports: [SupabaseModule],
	controllers: [AnalyticsController],
	providers: [AnalyticsService],
	exports: [AnalyticsService]
})
export class AnalyticsModule {}
