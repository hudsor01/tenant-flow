import { Module, forwardRef } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionStatusService } from './subscription-status.service'
import { FeatureAccessService } from './feature-access.service'
import { StripeModule } from '../stripe/stripe.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
	imports: [
		PrismaModule,
		forwardRef(() => StripeModule)
	],
	controllers: [
		SubscriptionsController
	],
	providers: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService
	],
	exports: [
		SubscriptionsManagerService,
		SubscriptionStatusService,
		FeatureAccessService
	]
})
export class SubscriptionsModule {}