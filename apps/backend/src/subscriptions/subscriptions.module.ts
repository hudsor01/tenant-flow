import { Module } from '@nestjs/common'
import { SharedModule } from '../shared/shared.module'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'

@Module({
	imports: [SharedModule],
	controllers: [SubscriptionsController],
	providers: [SubscriptionsService],
	exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
