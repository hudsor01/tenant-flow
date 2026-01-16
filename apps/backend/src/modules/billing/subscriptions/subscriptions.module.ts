import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../../database/supabase.module'
import { SecurityModule } from '../../../security/security.module'
import { SubscriptionService } from './subscription.service'
import { PaymentMethodService } from './payment-method.service'
import { SubscriptionController } from './subscription.controller'
import { PaymentMethodsController } from './payment-methods.controller'

/**
 * Subscriptions Sub-Module
 *
 * Handles subscription and payment method functionality:
 * - Subscription management (create, update, list)
 * - Payment method management (list, detach)
 * - Billing portal session creation
 * - Invoice retrieval
 *
 * Extracted from StripeModule for Single Responsibility Principle.
 */
@Module({
	imports: [
		SupabaseModule,
		SecurityModule,
		// StripeModule is imported by the parent, services injected via providers
	],
	controllers: [
		SubscriptionController,
		PaymentMethodsController
	],
	providers: [
		SubscriptionService,
		PaymentMethodService
	],
	exports: [
		SubscriptionService,
		PaymentMethodService
	]
})
export class SubscriptionsModule {}
