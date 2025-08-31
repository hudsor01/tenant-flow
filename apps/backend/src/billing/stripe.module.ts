import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ConfigModule } from '@nestjs/config'
import { PaymentRecoveryService } from './payment-recovery.service'
import { PaymentNotificationService } from './payment-notification.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { SupabaseService } from '../database/supabase.service'

@Module({
	imports: [EventEmitterModule, ConfigModule],
	providers: [
		// Core services
		// StripeService, // Temporarily disabled due to logger injection issue
		PaymentRecoveryService,
		PaymentNotificationService,

		// New minimal services
		StripeWebhookService,
		// StripePortalService, // Temporarily disabled due to ConfigService injection issue

		// Database
		SupabaseService
	],
	exports: [
		// StripeService, // Temporarily disabled due to logger injection issue
		PaymentRecoveryService,
		PaymentNotificationService,
		StripeWebhookService,
		// StripePortalService // Temporarily disabled
	]
})
export class StripeModule {}
