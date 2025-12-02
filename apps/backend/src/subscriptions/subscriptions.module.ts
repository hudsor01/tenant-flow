/**
 * Subscriptions Module - Refactored with Decomposed Services
 *
 * Architecture:
 * SubscriptionsService (Facade) → Delegates to specialized services
 * ├─ SubscriptionQueryService (getSubscription, listSubscriptions, data loading)
 * ├─ SubscriptionBillingService (createSubscription, updateSubscription)
 * └─ SubscriptionLifecycleService (pauseSubscription, resumeSubscription, cancelSubscription)
 *
 * Supporting:
 * └─ SubscriptionCacheService (entity-level caching)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service (<300 lines each)
 * - Independent development
 * - Clear dependency graph
 */

import { Module } from '@nestjs/common'
import { SharedModule } from '../shared/shared.module'
import { SubscriptionsController } from './subscriptions.controller'

// Cache service
import { SubscriptionCacheService } from './subscription-cache.service'

// Decomposed services
import { SubscriptionQueryService } from './subscription-query.service'
import { SubscriptionBillingService } from './subscription-billing.service'
import { SubscriptionLifecycleService } from './subscription-lifecycle.service'

// Facade service
import { SubscriptionsService } from './subscriptions.service'

@Module({
	imports: [SharedModule],
	controllers: [SubscriptionsController],
	providers: [
		// Cache service (no dependencies on other subscription services)
		SubscriptionCacheService,
		// Query service (depends on Cache)
		SubscriptionQueryService,
		// Billing service (depends on Query, Cache)
		SubscriptionBillingService,
		// Lifecycle service (depends on Query, Cache)
		SubscriptionLifecycleService,
		// Facade service (coordinates all services)
		SubscriptionsService
	],
	exports: [
		// Export specialized services for direct use if needed
		SubscriptionQueryService,
		SubscriptionBillingService,
		SubscriptionLifecycleService,
		// Export facade (main entry point)
		SubscriptionsService
	]
})
export class SubscriptionsModule {}
