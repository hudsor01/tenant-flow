import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { DashboardController } from './dashboard.controller'
import { DashboardStatsService } from './dashboard-stats.service'
import { DashboardTrendsService } from './dashboard-trends.service'
import { DashboardPerformanceService } from './dashboard-performance.service'

/**
 * Dashboard Module
 */
@Module({
	imports: [AnalyticsModule],
	controllers: [DashboardController],
	providers: [
		DashboardStatsService,
		DashboardTrendsService,
		DashboardPerformanceService
	],
	exports: [
		DashboardStatsService,
		DashboardTrendsService,
		DashboardPerformanceService
	]
})
export class DashboardModule {}
