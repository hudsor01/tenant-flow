import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestSupabaseRepository } from './maintenance-request-supabase.repository'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
	imports: [
		SupabaseModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [MaintenanceController],
	providers: [MaintenanceService, MaintenanceRequestSupabaseRepository],
	exports: [MaintenanceService, MaintenanceRequestSupabaseRepository]
})
export class MaintenanceModule {}
