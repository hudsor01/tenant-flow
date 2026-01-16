import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { ExecutiveReportService } from './executive-report.service'
import { ExportService } from './export.service'
import { FinancialReportService } from './financial-report.service'
import { MaintenanceReportService } from './maintenance-report.service'
import { PropertyReportService } from './property-report.service'
import { ReportAnalyticsController } from './report-analytics.controller'
import { ReportExportController } from './report-export.controller'
import { ReportGenerationController } from './report-generation.controller'
import { ReportsController } from './reports.controller'
import { TaxReportService } from './tax-report.service'
import { TenantReportService } from './tenant-report.service'
import { ExecutiveMonthlyTemplate } from './templates/executive-monthly.template'
import { FinancialPerformanceTemplate } from './templates/financial-performance.template'
import { LeasePortfolioTemplate } from './templates/lease-portfolio.template'
import { MaintenanceOperationsTemplate } from './templates/maintenance-operations.template'
import { PropertyPortfolioTemplate } from './templates/property-portfolio.template'
import { TaxPreparationTemplate } from './templates/tax-preparation.template'

@Module({
	imports: [AnalyticsModule, SupabaseModule],
	controllers: [
		ReportsController,
		ReportExportController,
		ReportGenerationController,
		ReportAnalyticsController
	],
	providers: [
		ExportService,
		FinancialReportService,
		PropertyReportService,
		TenantReportService,
		MaintenanceReportService,
		ExecutiveReportService,
		TaxReportService,
		ExecutiveMonthlyTemplate,
		FinancialPerformanceTemplate,
		PropertyPortfolioTemplate,
		LeasePortfolioTemplate,
		MaintenanceOperationsTemplate,
		TaxPreparationTemplate
	],
	exports: [ExportService]
})
export class ReportsModule {}
