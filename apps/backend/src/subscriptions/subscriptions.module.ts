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
import { SubscriptionSupabaseRepository } from './subscription-supabase.repository'
import { UserFeatureAccessSupabaseRepository } from './user-feature-access-supabase.repository'
import { SupabaseModule } from '../supabase/supabase.module'
import { StripeModule } from '../stripe/stripe.module'
import { CommonModule } from '../common/common.module'
import { PropertiesModule } from '../properties/properties.module'

@Module({
	imports: [
		SupabaseModule,
		forwardRef(() => StripeModule), // Fix circular dependency
		CommonModule,
		forwardRef(() => PropertiesModule)
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
		SubscriptionManagementService,
		SubscriptionSupabaseRepository,
		UserFeatureAccessSupabaseRepository
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
