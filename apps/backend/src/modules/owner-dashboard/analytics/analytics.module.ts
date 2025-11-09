import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * AnalyticsModule
 *
 * Owner analytics dashboard
 * - Dashboard statistics
 * - Activity feed
 * - System uptime
 * - Unified page data endpoint
 */
@Module({
	imports: [DashboardModule],
	controllers: [AnalyticsController]
})
export class AnalyticsModule {}
