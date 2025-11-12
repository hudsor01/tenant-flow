import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

/**
 * Dashboard Module
 */
@Module({
	imports: [AnalyticsModule],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService]
})
export class DashboardModule {}
