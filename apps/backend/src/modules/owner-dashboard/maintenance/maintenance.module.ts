import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * MaintenanceModule
 *
 * Owner maintenance analytics
 * - Request statistics
 * - Cost analysis
 * - Response time metrics
 */
@Module({
	imports: [DashboardModule],
	controllers: [MaintenanceController]
})
export class MaintenanceModule {}
