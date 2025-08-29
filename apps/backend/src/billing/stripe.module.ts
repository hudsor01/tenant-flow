import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { PaymentRecoveryService } from './payment-recovery.service'
import { PaymentNotificationService } from './payment-notification.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripePortalService } from './stripe-portal.service'
import { SubscriptionSupabaseRepository } from './subscription-supabase.repository'
import { SupabaseService } from '../database/supabase.service'
import { UserSupabaseRepository } from '../database/user-supabase.repository'

@Module({
	providers: [
		// Core services
		StripeService,
		PaymentRecoveryService,
		PaymentNotificationService,

		// New minimal services
		StripeWebhookService,
		StripePortalService,

		// Repositories
		SubscriptionSupabaseRepository,
		UserSupabaseRepository,

		// Database
		SupabaseService
	],
	exports: [
		StripeService,
		PaymentRecoveryService,
		PaymentNotificationService,
		StripeWebhookService,
		StripePortalService
	]
})
export class StripeModule {}
