import { forwardRef, Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { SupabaseModule } from '../database/supabase.module'
import { SubscriptionsModule } from '../billing/subscriptions.module'

/**
 * Properties module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		forwardRef(() => SubscriptionsModule) // For usage limits guard
	],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}