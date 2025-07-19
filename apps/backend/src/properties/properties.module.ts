import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'

@Module({
	imports: [StorageModule, StripeModule],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}
