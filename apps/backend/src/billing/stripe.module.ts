import { Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { PaymentRecoveryService } from './payment-recovery.service'
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
		StripeWebhookService,
		StripePortalService
	]
})
export class StripeModule {}
