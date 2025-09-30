import { Module } from '@nestjs/common'
import { MaintenanceAnalyticsController } from './analytics.controller'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SupabaseModule } from '../database/supabase.module'
import { RepositoriesModule } from '../repositories/repositories.module'
import { AnalyticsModule } from '../analytics/analytics.module'

@Module({
	imports: [SupabaseModule, RepositoriesModule, AnalyticsModule],
	controllers: [MaintenanceController, MaintenanceAnalyticsController],
	providers: [MaintenanceService],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
