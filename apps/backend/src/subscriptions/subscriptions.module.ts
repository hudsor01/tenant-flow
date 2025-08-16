import { forwardRef, Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionStatusService } from './subscription-status.service'
import { FeatureAccessService } from './feature-access.service'
import { FeatureAccessEventListener } from './feature-access-event.listener'
import { SubscriptionSyncService } from './subscription-sync.service'
import { SubscriptionSyncController } from './subscription-sync.controller'
import { SubscriptionManagementService } from './subscription-management.service'
import { SubscriptionManagementController } from './subscription-management.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { StripeModule } from '../stripe/stripe.module'
import { CommonModule } from '../common/common.module'

@Module({
	imports: [
		PrismaModule,
		forwardRef(() => StripeModule), // Fix circular dependency
		CommonModule
	],
	controllers: [
		SubscriptionsController,
		SubscriptionSyncController,
		SubscriptionManagementController
	],
	providers: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService,
		FeatureAccessEventListener,
		SubscriptionSyncService,
		SubscriptionManagementService
	],
	exports: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService,
		SubscriptionSyncService,
		SubscriptionManagementService
	]
})
export class SubscriptionsModule {}