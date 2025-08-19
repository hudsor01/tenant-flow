import { forwardRef, Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

/**
 * Maintenance module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		forwardRef(() => SubscriptionsModule) // For usage limits guard
	],
	controllers: [MaintenanceController],
	providers: [MaintenanceService],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}