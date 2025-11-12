import { Module } from '@nestjs/common'
import { ReportsController } from './reports.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * ReportsModule
 *
 * Owner reports and analytics
 * - Time-series data
 * - Metric trends
 */
@Module({
	imports: [DashboardModule],
	controllers: [ReportsController]
})
export class ReportsModule {}
