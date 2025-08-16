import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
import { ErrorModule } from '../common/errors/error.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ZodValidationModule } from '../common/validation/zod-validation.module'

@Module({
	imports: [
		StorageModule,
		StripeModule,
		ErrorModule,
		SubscriptionsModule,
		ZodValidationModule
	],
	controllers: [PropertiesController],
	providers: [PropertiesService, PropertiesRepository],
	exports: [PropertiesService]
})
export class PropertiesModule {}
