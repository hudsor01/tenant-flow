import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertiesRepository } from './properties.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
import { ErrorModule } from '../common/errors/error.module'

@Module({
	imports: [StorageModule, StripeModule, ErrorModule],
	controllers: [PropertiesController],
	providers: [PropertiesService, PropertiesRepository],
	exports: [PropertiesService]
})
export class PropertiesModule {}
