import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { LeasesModule } from '../leases/leases.module'
<<<<<<< HEAD
import { ErrorHandlerService } from '../services/error-handler.service'

@Module({
	imports: [PropertiesModule, TenantsModule, LeasesModule],
	controllers: [DashboardController],
	providers: [DashboardService, ErrorHandlerService],
	exports: [DashboardService]
})
export class DashboardModule {}
=======
import { MaintenanceModule } from '../maintenance/maintenance.module'

@Module({
	imports: [PropertiesModule, TenantsModule, LeasesModule, MaintenanceModule],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService]
})
export class DashboardModule {}
>>>>>>> origin/copilot/vscode1755830877462
