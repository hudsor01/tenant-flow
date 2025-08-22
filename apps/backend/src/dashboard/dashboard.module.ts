import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { LeasesModule } from '../leases/leases.module'
import { MaintenanceModule } from '../maintenance/maintenance.module'

@Module({
	imports: [PropertiesModule, TenantsModule, LeasesModule, MaintenanceModule],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService]
})
export class DashboardModule {}