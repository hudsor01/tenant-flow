import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { LeasesModule } from '../leases/leases.module'
import { ErrorHandlerService } from '../services/error-handler.service'

@Module({
	imports: [PropertiesModule, TenantsModule, LeasesModule],
	controllers: [DashboardController],
	providers: [DashboardService, ErrorHandlerService],
	exports: [DashboardService]
})
export class DashboardModule {}
