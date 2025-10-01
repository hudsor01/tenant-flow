import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { SupabaseModule } from '../database/supabase.module'
import { ExportService } from './export.service'
import { GeneratedReportService } from './generated-report.service'
import { ReportsController } from './reports.controller'
import { ScheduledReportService } from './scheduled-report.service'
import { SchedulerService } from './scheduler.service'
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
		GeneratedReportService,
		ScheduledReportService,
		SchedulerService,
		ExecutiveMonthlyTemplate,
		FinancialPerformanceTemplate,
		PropertyPortfolioTemplate,
		LeasePortfolioTemplate,
		MaintenanceOperationsTemplate,
		TaxPreparationTemplate
	],
	exports: [ExportService, GeneratedReportService, ScheduledReportService]
})
export class ReportsModule {}
