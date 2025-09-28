import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { RepositoriesModule } from '../repositories/repositories.module'

/**
 * Dashboard Module - Repository Pattern Implementation
 * Controller → Service → Repository → Database
 * DashboardService uses IDashboardRepository for data access
 */
@Module({
	imports: [RepositoriesModule],
	controllers: [DashboardController],
	providers: [DashboardService]
})
export class DashboardModule {}
