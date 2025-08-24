import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { LeasesModule } from '../leases/leases.module'

@Module({
	imports: [PropertiesModule, TenantsModule, LeasesModule],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService]
})
export class DashboardModule {}
