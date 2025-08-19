import { forwardRef, Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesSupabaseRepository } from './properties-supabase.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'
import { SupabaseModule } from '../common/supabase/supabase.module'

@Module({
	imports: [
		SupabaseModule,
		StorageModule,
		forwardRef(() => StripeModule),
		ErrorModule,
		forwardRef(() => SubscriptionsModule),
		ZodValidationModule
	],
	controllers: [PropertiesController],
	providers: [PropertiesService, PropertiesSupabaseRepository],
	exports: [PropertiesService, PropertiesSupabaseRepository]
})
export class PropertiesModule {}
