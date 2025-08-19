import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { SubscriptionStatusService } from './subscription-status.service'
import { StripeModule } from './stripe.module'
import { CommonModule } from '../shared/common.module'

@Module({
	imports: [StripeModule, CommonModule],
	controllers: [SubscriptionsController],
	providers: [
		SubscriptionsManagerService,
		UsageLimitsGuard,
		SubscriptionStatusService
	],
	exports: [
		SubscriptionsManagerService,
		UsageLimitsGuard,
		SubscriptionStatusService
	]
})
export class SubscriptionsModule {}
