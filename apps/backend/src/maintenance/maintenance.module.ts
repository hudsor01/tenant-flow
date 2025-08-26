import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SupabaseModule } from '../database/supabase.module'
<<<<<<< HEAD
@Module({
	imports: [SupabaseModule],
	controllers: [MaintenanceController],
	providers: [MaintenanceService],
=======
import { ErrorHandlerService } from '../services/error-handler.service'

@Module({
	imports: [SupabaseModule],
	controllers: [MaintenanceController],
	providers: [
		MaintenanceService,
		ErrorHandlerService
	],
>>>>>>> origin/main
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
