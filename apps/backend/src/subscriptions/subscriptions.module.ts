import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionStatusService } from './subscription-status.service'
import { FeatureAccessService } from './feature-access.service'
import { FeatureAccessEventListener } from './feature-access-event.listener'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [
		PrismaModule
	],
	controllers: [
		SubscriptionsController
	],
	providers: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService,
		FeatureAccessEventListener
	],
	exports: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService
	]
})
export class SubscriptionsModule {}