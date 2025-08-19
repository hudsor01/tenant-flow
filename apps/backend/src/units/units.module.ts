import { forwardRef, Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { TypeSafeConfigModule } from '../common/config/config.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

/**
 * Units module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		TypeSafeConfigModule,
		forwardRef(() => SubscriptionsModule) // For usage limits guard
	],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService]
})
export class UnitsModule {}