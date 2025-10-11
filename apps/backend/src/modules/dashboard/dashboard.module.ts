import { Module } from '@nestjs/common'
import { RepositoriesModule } from '../../repositories/repositories.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

/**
 * Dashboard Module - Repository Pattern Implementation
 * Controller → Service → Repository → Database
 * DashboardService uses IDashboardRepository for data access
 */
@Module({
	imports: [RepositoriesModule, AnalyticsModule],
	controllers: [DashboardController],
	providers: [DashboardService]
})
export class DashboardModule {}
