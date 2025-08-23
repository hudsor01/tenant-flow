import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SupabaseModule } from '../database/supabase.module'
import { ErrorHandlerService } from '../services/error-handler.service'

@Module({
	imports: [SupabaseModule],
	controllers: [MaintenanceController],
<<<<<<< HEAD
	providers: [MaintenanceService, ErrorHandlerService],
=======
	providers: [
		MaintenanceService,
		ErrorHandlerService
	],
>>>>>>> origin/copilot/vscode1755830877462
	exports: [MaintenanceService]
})
export class MaintenanceModule {}