import { Module } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { FinancialAnalyticsController } from './analytics.controller'

@Module({
	controllers: [FinancialAnalyticsController],
	providers: [SupabaseService],
	exports: []
})
export class FinancialModule {}