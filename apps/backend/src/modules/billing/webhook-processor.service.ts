/**
 * Webhook Processor Service
 *
 * Orchestrates Stripe webhook event processing by delegating to focused handlers.
 * Used by StripeWebhookQueueProcessor.
 *
 * RESPONSIBILITY: Event routing only - no business logic
 * Business logic is in domain-specific handlers:
 * - SubscriptionWebhookHandler: subscription lifecycle
 * - PaymentWebhookHandler: payment processing
 * - CheckoutWebhookHandler: checkout flow
 * - ConnectWebhookHandler: Connect account updates
 */

import { Injectable } from '@nestjs/common'
import type Stripe from 'stripe'
import { AppLogger } from '../../logger/app-logger.service'
import {
	SubscriptionWebhookHandler,
	PaymentWebhookHandler,
	CheckoutWebhookHandler,
	ConnectWebhookHandler
} from './handlers'

// Re-export for backward compatibility
export { MAX_PAYMENT_RETRY_ATTEMPTS } from './handlers'

@Injectable()
export class WebhookProcessor {

	constructor(private readonly subscriptionHandler: SubscriptionWebhookHandler,
		private readonly paymentHandler: PaymentWebhookHandler,
		private readonly checkoutHandler: CheckoutWebhookHandler,
		private readonly connectHandler: ConnectWebhookHandler, private readonly logger: AppLogger) {}

	async processEvent(event: Stripe.Event): Promise<void> {
		switch (event.type) {
			case 'checkout.session.completed':
				await this.checkoutHandler.handleCheckoutCompleted(
					event.data.object as Stripe.Checkout.Session
				)
				break

			case 'payment_method.attached':
				await this.paymentHandler.handlePaymentAttached(
					event.data.object as Stripe.PaymentMethod
				)
				break

			case 'customer.subscription.created':
				await this.subscriptionHandler.handleSubscriptionCreated(
					event.data.object as Stripe.Subscription
				)
				break

			case 'customer.subscription.updated':
				await this.subscriptionHandler.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription
				)
				break

			case 'invoice.payment_failed':
				await this.paymentHandler.handlePaymentFailed(
					event.data.object as Stripe.Invoice
				)
				break

			case 'customer.subscription.deleted':
				await this.subscriptionHandler.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription
				)
				break

			case 'account.updated':
				await this.connectHandler.handleAccountUpdated(
					event.data.object as Stripe.Account
				)
				break

			case 'payment_intent.succeeded':
				await this.paymentHandler.handlePaymentIntentSucceeded(
					event.data.object as Stripe.PaymentIntent
				)
				break

			case 'payment_intent.payment_failed':
				await this.paymentHandler.handlePaymentIntentFailed(
					event.data.object as Stripe.PaymentIntent
				)
				break

			default:
				this.logger.debug('Unhandled webhook event type', { type: event.type })
		}
	}
}
