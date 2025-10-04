import { Injectable, Logger } from '@nestjs/common'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)
	private readonly stripe: Stripe

	constructor(private readonly supabase: SupabaseService) {
		this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
			apiVersion: '2025-08-27' as Stripe.LatestApiVersion
		})
	}

	/**
	 * Check if webhook event has already been processed (idempotency)
	 */
	async checkEventProcessed(eventId: string): Promise<boolean> {
		const { data } = await this.supabase
			.getAdminClient()
			.from('StripeWebhookEvent')
			.select('eventId')
			.eq('eventId', eventId)
			.single()

		return !!data
	}

	/**
	 * Store webhook event ID to prevent duplicate processing
	 */
	async storeEventId(eventId: string, eventType: string) {
		await this.supabase.getAdminClient().from('StripeWebhookEvent').insert({
			eventId,
			type: eventType
		})
	}

	/**
	 * Route webhook events to appropriate handlers
	 */
	async processWebhookEvent(event: Stripe.Event) {
		this.logger.log(`Processing webhook event: ${event.type}`)

		switch (event.type) {
			case 'account.updated':
				return this.handleAccountUpdated(event.data.object as Stripe.Account)

			case 'payment_intent.succeeded':
				return this.handlePaymentSucceeded(
					event.data.object as Stripe.PaymentIntent
				)

			case 'payment_intent.payment_failed':
				return this.handlePaymentFailed(
					event.data.object as Stripe.PaymentIntent
				)

			case 'invoice.payment_succeeded':
				return this.handleInvoicePaymentSucceeded(
					event.data.object as Stripe.Invoice
				)

			case 'invoice.payment_failed':
				return this.handleInvoicePaymentFailed(
					event.data.object as Stripe.Invoice
				)

			case 'customer.subscription.updated':
				return this.handleSubscriptionUpdated(
					event.data.object as Stripe.Subscription
				)

			case 'customer.subscription.deleted':
				return this.handleSubscriptionDeleted(
					event.data.object as Stripe.Subscription
				)

			default:
				this.logger.log(`Unhandled event type: ${event.type}`)
		}
	}

	/**
	 * Handle Connected Account updates
	 */
	private async handleAccountUpdated(account: Stripe.Account) {
		this.logger.log(`Account updated: ${account.id}`)

		await this.supabase
			.getAdminClient()
			.from('ConnectedAccount')
			.update({
				accountStatus: account.details_submitted
					? account.charges_enabled
						? 'active'
						: 'pending'
					: 'incomplete',
				chargesEnabled: account.charges_enabled,
				payoutsEnabled: account.payouts_enabled,
				updatedAt: new Date().toISOString()
			})
			.eq('stripeAccountId', account.id)
	}

	/**
	 * Handle successful PaymentIntent (one-time payments)
	 */
	private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(`Payment succeeded: ${paymentIntent.id}`)

		await this.supabase
			.getAdminClient()
			.from('RentPayment')
			.update({
				status: 'succeeded',
				paidAt: new Date().toISOString()
			})
			.eq('stripePaymentIntentId', paymentIntent.id)
	}

	/**
	 * Handle failed PaymentIntent
	 */
	private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
		this.logger.log(`Payment failed: ${paymentIntent.id}`)

		await this.supabase
			.getAdminClient()
			.from('RentPayment')
			.update({
				status: 'failed',
				failureReason:
					paymentIntent.last_payment_error?.message || 'Unknown error'
			})
			.eq('stripePaymentIntentId', paymentIntent.id)
	}

	/**
	 * Handle successful Invoice payment (subscriptions)
	 */
	private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
		this.logger.log(`Invoice payment succeeded: ${invoice.id}`)
		// Implementation will be added in Phase 4
	}

	/**
	 * Handle failed Invoice payment (subscription retry logic)
	 */
	private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.log(
			`Invoice payment failed: ${invoice.id}, attempt ${invoice.attempt_count}`
		)
		// Smart Retries handling will be added in Phase 4
	}

	/**
	 * Handle subscription updates
	 */
	private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription updated: ${subscription.id}`)
		// Implementation will be added in Phase 4
	}

	/**
	 * Handle subscription cancellation
	 */
	private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription deleted: ${subscription.id}`)

		await this.supabase
			.getAdminClient()
			.from('RentSubscription')
			.update({
				status: 'cancelled',
				updatedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', subscription.id)
	}
}
