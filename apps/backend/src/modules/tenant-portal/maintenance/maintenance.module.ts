import { Module } from '@nestjs/common'
import { TenantMaintenanceController } from './maintenance.controller'

/**
 * Tenant Maintenance Module
 *
 * Handles maintenance request submission and history for tenants.
 * Routes are prefixed with /tenant/maintenance via RouterModule.
 */
@Module({
	controllers: [TenantMaintenanceController]
})
export class TenantMaintenanceModule {}
