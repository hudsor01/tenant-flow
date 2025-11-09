import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * TenantsModule
 *
 * Owner tenant analytics
 * - Occupancy trends
 * - Tenant statistics
 */
@Module({
	imports: [DashboardModule],
	controllers: [TenantsController]
})
export class TenantsModule {}
