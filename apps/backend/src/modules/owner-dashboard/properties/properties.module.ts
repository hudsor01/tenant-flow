import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * PropertiesModule
 *
 * Owner property analytics
 * - Property performance metrics
 * - Portfolio statistics
 */
@Module({
	imports: [DashboardModule],
	controllers: [PropertiesController]
})
export class PropertiesModule {}
