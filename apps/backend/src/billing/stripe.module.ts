import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StripeService } from './stripe.service'
import { PaymentRecoveryService } from './payment-recovery.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripePortalService } from './stripe-portal.service'
import { SupabaseService } from '../database/supabase.service'
import { StripeController } from './stripe.controller'

@Module({
	imports: [ConfigModule],
	controllers: [StripeController],
	providers: [
		// Core services
		StripeService,
		PaymentRecoveryService,

		// New minimal services
		StripeWebhookService,
		StripePortalService,

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
