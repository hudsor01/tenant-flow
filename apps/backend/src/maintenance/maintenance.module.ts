import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { PrismaModule } from '../prisma/prisma.module'
import { SupabaseService } from '../common/supabase.service'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
	imports: [
		PrismaModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [MaintenanceController],
	providers: [
		MaintenanceService,
		MaintenanceRequestRepository,
		SupabaseService
	],
	exports: [MaintenanceService, MaintenanceRequestRepository]
})
export class MaintenanceModule {}
