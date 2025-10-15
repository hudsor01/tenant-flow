import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { MaintenanceAnalyticsController } from './analytics.controller'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'

@Module({
	imports: [SupabaseModule, AnalyticsModule],
	controllers: [MaintenanceController, MaintenanceAnalyticsController],
	providers: [MaintenanceService],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
