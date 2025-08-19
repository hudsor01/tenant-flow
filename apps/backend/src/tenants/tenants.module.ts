import { forwardRef, Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

/**
 * Tenants module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [
		SupabaseModule,
		forwardRef(() => SubscriptionsModule) // For usage limits guard
	],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}