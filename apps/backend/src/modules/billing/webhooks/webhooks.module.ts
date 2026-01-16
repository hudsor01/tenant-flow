import { Module, forwardRef } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SupabaseModule } from '../../../database/supabase.module'
import { EmailModule } from '../../email/email.module'
import { SseModule } from '../../notifications/sse/sse.module'

import { WebhookController } from './webhook.controller'
import { WebhookService } from './webhook.service'
import { WebhookProcessor } from './webhook-processor.service'
import { WebhookQueueProcessor } from './webhook-queue.processor'

import { SubscriptionWebhookHandler } from './handlers/subscription-webhook.handler'
import { PaymentWebhookHandler } from './handlers/payment-webhook.handler'
import { CheckoutWebhookHandler } from './handlers/checkout-webhook.handler'
import { ConnectWebhookHandler } from './handlers/connect-webhook.handler'

// Import StripeModule to get StripeConnectService
// Use forwardRef to avoid circular dependency
import { StripeModule } from '../stripe.module'

const WORKERS_ENABLED =
	process.env.BULLMQ_WORKERS_ENABLED !== 'false' &&
	process.env.BULLMQ_WORKERS_ENABLED !== '0'

/**
 * Webhooks Module
 *
 * Handles all Stripe webhook processing:
 * - Signature verification and event queuing (WebhookController)
 * - Idempotent event processing (WebhookService)
 * - Event routing to domain handlers (WebhookProcessor)
 * - Background queue processing (WebhookQueueProcessor)
 *
 * Domain-specific handlers:
 * - SubscriptionWebhookHandler: subscription lifecycle
 * - PaymentWebhookHandler: payment processing
 * - CheckoutWebhookHandler: checkout flow
 * - ConnectWebhookHandler: Connect account updates
 */
@Module({
	imports: [
		SupabaseModule,
		EmailModule,
		SseModule,
		forwardRef(() => StripeModule),
		BullModule.registerQueue({
			name: 'stripe-webhooks',
			defaultJobOptions: {
				attempts: 5,
				backoff: {
					type: 'exponential',
					delay: 2000
				},
				removeOnComplete: {
					age: 24 * 3600,
					count: 1000
				},
				removeOnFail: {
					age: 7 * 24 * 3600
				}
			}
		})
	],
	controllers: [WebhookController],
	providers: [
		WebhookService,
		WebhookProcessor,
		SubscriptionWebhookHandler,
		PaymentWebhookHandler,
		CheckoutWebhookHandler,
		ConnectWebhookHandler,
		...(WORKERS_ENABLED ? [WebhookQueueProcessor] : [])
	],
	exports: [WebhookService, BullModule]
})
export class WebhooksModule {}
