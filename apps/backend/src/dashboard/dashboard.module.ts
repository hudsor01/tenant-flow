import { Module, forwardRef } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { LeasesModule } from '../leases/leases.module'
import { StripeModule } from '../billing/stripe.module'
// Removed ErrorHandlerService - using native NestJS exceptions

@Module({
	imports: [
		forwardRef(() => PropertiesModule), 
		forwardRef(() => TenantsModule), 
		forwardRef(() => LeasesModule),
		forwardRef(() => StripeModule), // Stripe Sync Engine integration
		LoggerModule
	],
	controllers: [DashboardController],
	providers: [DashboardService],
	exports: [DashboardService]
})
export class DashboardModule {}
