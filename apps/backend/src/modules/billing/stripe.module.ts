import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { SecurityModule } from '../../security/security.module'
import { MetricsModule } from '../metrics/metrics.module'
import { StripeSyncService } from './stripe-sync.service'
import { StripeTenantService } from './stripe-tenant.service'
import { StripeOwnerService } from './stripe-owner.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeController } from './stripe.controller'
import { StripeService } from './stripe.service'
import { StripeConnectService } from './stripe-connect.service'
import { ConnectSetupService } from './connect-setup.service'
import { ConnectBillingService } from './connect-billing.service'
import { ConnectPayoutsService } from './connect-payouts.service'
import { StripeConnectController } from './stripe-connect.controller'
import { StripeTenantController } from './stripe-tenant.controller'
import { StripeWebhookController } from './stripe-webhook.controller'
import { WebhookProcessor } from './webhook-processor.service'
import { StripeWebhookQueueProcessor } from './stripe-webhook.queue'
import {
	SubscriptionWebhookHandler,
	PaymentWebhookHandler,
	CheckoutWebhookHandler,
	ConnectWebhookHandler
} from './handlers'
import { UsersModule } from '../users/users.module'
import { BillingService } from './billing.service'
import { StripeSharedService } from './stripe-shared.service'

const WORKERS_ENABLED =
	process.env.BULLMQ_WORKERS_ENABLED !== 'false' &&
	process.env.BULLMQ_WORKERS_ENABLED !== '0'

/**
 * Production-Grade Stripe Module
 *
 * Consolidated module following official Stripe patterns:
 * - Direct SDK usage without abstraction layers
 * - Simple webhook handling with signature verification
 * - Subscription billing with flexible pricing models
 * - Stripe Connect for multi-tenant payments
 * - Type-safe DTOs with comprehensive validation
 */
@Module({
	imports: [
		SupabaseModule,
		EmailModule,
		SecurityModule,
		MetricsModule,
		UsersModule,
		BullModule.registerQueue({
			name: 'stripe-webhooks',
			defaultJobOptions: {
				attempts: 5, // More retries for critical webhooks
				backoff: {
					type: 'exponential',
					delay: 2000 // 2s, 4s, 8s, 16s, 32s
				},
				removeOnComplete: {
					age: 24 * 3600, // Keep completed jobs for 24 hours
					count: 1000
				},
				removeOnFail: {
					age: 7 * 24 * 3600 // Keep failed jobs for 7 days
				}
			}
		})
	],
	providers: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeWebhookService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService,
		ConnectSetupService,
		ConnectBillingService,
		ConnectPayoutsService,
		// Webhook handlers (SRP-compliant decomposition)
		SubscriptionWebhookHandler,
		PaymentWebhookHandler,
		CheckoutWebhookHandler,
		ConnectWebhookHandler,
		WebhookProcessor,
		...(WORKERS_ENABLED ? [StripeWebhookQueueProcessor] : [])
	],
	controllers: [
		StripeController,
		StripeConnectController,
		StripeTenantController,
		StripeWebhookController
	],
	exports: [
		StripeService,
		StripeSharedService,
		BillingService,
		StripeSyncService,
		StripeWebhookService,
		StripeTenantService,
		StripeOwnerService,
		StripeConnectService,
		ConnectSetupService,
		ConnectBillingService,
		ConnectPayoutsService,
		BullModule
	]
})
export class StripeModule {}
