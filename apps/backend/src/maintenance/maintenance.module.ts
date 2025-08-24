import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SupabaseModule } from '../database/supabase.module'
@Module({
	imports: [SupabaseModule],
	controllers: [MaintenanceController],
	providers: [
		MaintenanceService
	],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
