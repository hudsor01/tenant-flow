import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { StripeService } from './stripe.service'
import { PaymentRecoveryService } from './payment-recovery.service'
import { PaymentNotificationService } from './payment-notification.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripePortalService } from './stripe-portal.service'
import { SupabaseService } from '../database/supabase.service'

@Module({
	imports: [EventEmitterModule],
	providers: [
		// Core services
		StripeService,
		PaymentRecoveryService,
		PaymentNotificationService,

		// New minimal services
		StripeWebhookService,
		StripePortalService,

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
