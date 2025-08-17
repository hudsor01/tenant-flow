import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantsSupabaseRepository } from './tenants-supabase.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
import { FairHousingService } from '../common/validation/fair-housing.service'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'
import { SupabaseModule } from '../common/supabase/supabase.module'

@Module({
	imports: [
		SupabaseModule,
		StorageModule,
		StripeModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [TenantsController],
	providers: [TenantsService, TenantsSupabaseRepository, FairHousingService],
	exports: [TenantsService]
})
export class TenantsModule {}
