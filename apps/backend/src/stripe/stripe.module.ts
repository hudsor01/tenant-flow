import { forwardRef, Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { StripeCheckoutController } from './stripe-checkout.controller'
import { WebhookController } from './webhook.controller'
import { StripeAnalyticsController } from './stripe-analytics.controller'
import { WebhookService } from './webhook.service'
import { StripeCheckoutService } from './stripe-checkout.service'
import { StripeBillingService } from './stripe-billing.service'
import { StripeDBService } from './stripe-db.service'
import { WebhookHealthService } from './webhook-health.service'
import { PaymentRecoveryService } from './payment-recovery.service'
import { StripeFdwSimpleService } from './stripe-fdw-simple.service'
import { StripeFdwService } from './stripe-fdw.service'
import { SupabaseModule } from '../supabase/supabase.module'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { NotificationsModule } from '../notifications/notifications.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { ConfigModule } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'
import { CommonModule } from '../common/common.module'
import { HealthModule } from '../health/health.module'

@Module({
	imports: [
		ConfigModule,
		SupabaseModule,
		forwardRef(() => NotificationsModule),
		forwardRef(() => SubscriptionsModule),
		forwardRef(() => CommonModule),
		forwardRef(() => HealthModule),
		BullModule.registerQueue({
			name: 'payment-recovery',
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 60000
				}
			}
		})
	],
	providers: [
		StripeService,
		WebhookService,
		StripeCheckoutService,
		StripeBillingService,
		StripeDBService,
		WebhookHealthService,
		PaymentRecoveryService,
		StripeFdwSimpleService,
		StripeFdwService,
		ErrorHandlerService
	],
	controllers: [
		StripeCheckoutController,
		WebhookController,
		StripeAnalyticsController
	],
	exports: [
		StripeService,
		WebhookService,
		StripeCheckoutService,
		StripeBillingService,
		StripeDBService,
		PaymentRecoveryService,
		StripeFdwSimpleService,
		StripeFdwService
	]
})
export class StripeModule {}
