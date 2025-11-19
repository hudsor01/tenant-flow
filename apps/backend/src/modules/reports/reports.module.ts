import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ExportService } from './export.service'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'

@Module({
	imports: [AnalyticsModule, SupabaseModule],
	controllers: [ReportsController],
	providers: [
		ExportService,
		ReportsService,
		ExecutiveMonthlyTemplate,
		FinancialPerformanceTemplate,
		PropertyPortfolioTemplate,
		LeasePortfolioTemplate,
		MaintenanceOperationsTemplate,
		TaxPreparationTemplate
	],
	exports: [
		ExportService,
		ReportsService
	]
})
export class ReportsModule {}
