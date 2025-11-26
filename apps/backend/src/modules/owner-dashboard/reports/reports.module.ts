import { Module } from '@nestjs/common'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'
import { AnalyticsModule as GlobalAnalyticsModule } from '../../analytics/analytics.module'

/**
 * ReportsModule
 *
 * Owner dashboard reporting functionality:
 * - Time series data for charts
 * - Metric trend comparisons
 */
@Module({
	imports: [GlobalAnalyticsModule],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService]
})
export class ReportsModule {}
