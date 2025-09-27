import { Module } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { FinancialAnalyticsController } from './analytics.controller'
import { FinancialController } from './financial.controller'

@Module({
	controllers: [FinancialAnalyticsController, FinancialController],
	providers: [SupabaseService],
	exports: []
})
export class FinancialModule {}