import { Module } from '@nestjs/common'
import { AnalyticsModule } from '../analytics/analytics.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

/**
 * Dashboard Module - Repository Pattern Implementation
 * Controller → Service → Repository → Database
 * DashboardService uses IDashboardRepository for data access
 */
@Module({
	imports: [AnalyticsModule],
	controllers: [DashboardController],
	providers: [DashboardService]
})
export class DashboardModule {}
