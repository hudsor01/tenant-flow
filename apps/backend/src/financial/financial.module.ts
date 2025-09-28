import { Module } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import { RepositoriesModule } from '../repositories/repositories.module'
import { FinancialAnalyticsController } from './analytics.controller'

@Module({
	imports: [RepositoriesModule],
	controllers: [FinancialAnalyticsController],
	providers: [SupabaseService],
	exports: []
})
export class FinancialModule {}