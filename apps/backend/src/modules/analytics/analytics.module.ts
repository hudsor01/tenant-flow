import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { DashboardAnalyticsService } from './dashboard-analytics.service'
import { FinancialAnalyticsController } from './financial-analytics.controller'
import { FinancialAnalyticsService } from './financial-analytics.service'
import { LeaseAnalyticsController } from './lease-analytics.controller'
import { LeaseAnalyticsService } from './lease-analytics.service'
import { MaintenanceInsightsController } from './maintenance-insights.controller'
import { MaintenanceInsightsService } from './maintenance-insights.service'
import { OccupancyTrendsController } from './occupancy-trends.controller'
import { OccupancyTrendsService } from './occupancy-trends.service'
import { PropertyPerformanceController } from './property-performance.controller'
import { PropertyPerformanceService } from './property-performance.service'

@Module({
	imports: [SupabaseModule],
	controllers: [
		AnalyticsController,
		FinancialAnalyticsController,
		PropertyPerformanceController,
		LeaseAnalyticsController,
		MaintenanceInsightsController,
		OccupancyTrendsController
	],
	providers: [
		AnalyticsService,
		DashboardAnalyticsService,
		FinancialAnalyticsService,
		PropertyPerformanceService,
		LeaseAnalyticsService,
		MaintenanceInsightsService,
		OccupancyTrendsService
	],
	exports: [
		AnalyticsService,
		DashboardAnalyticsService,
		FinancialAnalyticsService,
		PropertyPerformanceService,
		LeaseAnalyticsService,
		MaintenanceInsightsService,
		OccupancyTrendsService
	]
})
export class AnalyticsModule {}
