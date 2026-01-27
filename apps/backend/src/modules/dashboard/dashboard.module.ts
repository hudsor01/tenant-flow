import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { DashboardStatsService } from './dashboard-stats.service'
import { DashboardTrendsService } from './dashboard-trends.service'
import { DashboardPerformanceService } from './dashboard-performance.service'

/**
 * Dashboard Module
 *
 * Note: Legacy /manage routes controller was removed.
 * All API consumers should use /owner/... endpoints.
 */
@Module({
	imports: [AnalyticsModule],
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
