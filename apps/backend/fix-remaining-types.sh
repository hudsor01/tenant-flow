#!/bin/bash

echo "Applying remaining type fixes..."

# Fix stripe module imports
cat > apps/backend/src/stripe/stripe.module.ts << 'EOF'
import { forwardRef, Module } from '@nestjs/common'
import { StripeService } from './stripe.service'
import { StripeController } from './stripe.controller'
import { StripeWebhookController } from './webhook.controller'
import { StripeWebhookService } from './webhook.service'
import { StripePriceService } from './stripe-price.service'
import { StripeProductService } from './stripe-product.service'
import { StripeSubscriptionService } from './stripe-subscription.service'
import { StripeCheckoutService } from './stripe-checkout.service'
import { StripeBillingService } from './stripe-billing.service'
import { StripeDbService } from './stripe-db.service'
import { WebhookHealthService } from './webhook-health.service'
import { PaymentRecoveryService } from './payment-recovery.service'
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
		StripeWebhookService,
		StripePriceService,
		StripeProductService,
		StripeSubscriptionService,
		StripeCheckoutService,
		StripeBillingService,
		StripeDbService,
		WebhookHealthService,
		PaymentRecoveryService,
		ErrorHandlerService
	],
	controllers: [StripeController, StripeWebhookController],
	exports: [
		StripeService,
		StripeWebhookService,
		StripeCheckoutService,
		StripeBillingService,
		StripeDbService,
		PaymentRecoveryService
	]
})
export class StripeModule {}
EOF

# Fix subscriptions-manager.service
cat > apps/backend/src/subscriptions/subscriptions-manager.service.ts << 'EOF'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseService } from '../supabase/supabase.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { StripeBillingService } from '../stripe/stripe-billing.service'
import type { Database } from '@repo/shared/types/supabase-generated'

type User = Database['public']['Tables']['User']['Row']
type Subscription = Database['public']['Tables']['Subscription']['Row']

@Injectable()
export class SubscriptionsManagerService {
	private readonly logger = new Logger(SubscriptionsManagerService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly configService: ConfigService,
		private readonly errorHandler: ErrorHandlerService,
		private readonly stripeBillingService: StripeBillingService
	) {}

	async getUserSubscription(userId: string): Promise<Subscription | null> {
		try {
			const { data, error } = await this.supabaseService
				.getClient()
				.from('Subscription')
				.select('*')
				.eq('userId', userId)
				.single()

			if (error) {
				this.logger.error('Error fetching subscription:', error)
				return null
			}

			return data
		} catch (error) {
			this.logger.error('Failed to get user subscription:', error)
			return null
		}
	}

	async createOrUpdateSubscription(
		userId: string,
		subscriptionData: Partial<Subscription>
	): Promise<Subscription | null> {
		try {
			const { data, error } = await this.supabaseService
				.getClient()
				.from('Subscription')
				.upsert(
					{
						...subscriptionData,
						userId,
						updatedAt: new Date().toISOString()
					},
					{ onConflict: 'userId' }
				)
				.select()
				.single()

			if (error) {
				this.logger.error('Error creating/updating subscription:', error)
				return null
			}

			return data
		} catch (error) {
			this.logger.error('Failed to create/update subscription:', error)
			return null
		}
	}

	async cancelSubscription(userId: string): Promise<boolean> {
		try {
			const subscription = await this.getUserSubscription(userId)
			if (!subscription?.stripeSubscriptionId) {
				return false
			}

			// Cancel in Stripe
			await this.stripeBillingService.cancelSubscription(
				subscription.stripeSubscriptionId
			)

			// Update local record
			await this.createOrUpdateSubscription(userId, {
				status: 'canceled',
				canceledAt: new Date().toISOString()
			})

			return true
		} catch (error) {
			this.logger.error('Failed to cancel subscription:', error)
			return false
		}
	}
}
EOF

echo "Type fixes applied successfully!"