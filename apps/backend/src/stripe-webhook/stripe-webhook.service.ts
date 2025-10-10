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
	 * Phase 4: Create RentPayment record for successful subscription charge
	 */
	private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
		this.logger.log(`Invoice payment succeeded: ${invoice.id}`)

		// Type guard for expanded invoice fields from webhooks
		const invoiceData = invoice as Stripe.Invoice & {
			subscription?: string | Stripe.Subscription
			payment_intent?: string | Stripe.PaymentIntent
		}

		if (!invoiceData.subscription) {
			this.logger.warn('Invoice has no subscription, skipping')
			return
		}

		const subscriptionId =
			typeof invoiceData.subscription === 'string'
				? invoiceData.subscription
				: invoiceData.subscription?.id

		// Get subscription from database
		const { data: subscription } = await this.supabase
			.getAdminClient()
			.from('RentSubscription')
			.select('*')
			.eq('stripeSubscriptionId', subscriptionId)
			.single()

		if (!subscription) {
			this.logger.warn(`Subscription not found for invoice: ${subscriptionId}`)
			return
		}

		// Get payment intent ID
		const paymentIntentId =
			typeof invoiceData.payment_intent === 'string'
				? invoiceData.payment_intent
				: invoiceData.payment_intent?.id || null

		// Calculate fees (amounts in cents)
		const amountPaid = invoice.amount_paid || 0
		const platformFee = Math.round(amountPaid * 0.029) // 2.9% platform fee
		const stripeFee = Math.round(amountPaid * 0.029 + 30) // Stripe's fee estimate
		const landlordReceives = amountPaid - platformFee - stripeFee

		// Create RentPayment record for this charge
		await this.supabase.getAdminClient().from('RentPayment').insert({
			tenantId: subscription.tenantId,
			landlordId: subscription.landlordId,
			leaseId: subscription.leaseId,
			subscriptionId: subscription.id,
			amount: amountPaid,
			platformFee,
			stripeFee,
			landlordReceives,
			status: 'succeeded',
			paymentType: 'ach', // Subscription payments default to ACH
			stripePaymentIntentId: paymentIntentId,
			stripeInvoiceId: invoice.id,
			paidAt: new Date().toISOString()
		})
	}

	/**
	 * Handle failed Invoice payment (subscription retry logic)
	 * Phase 4: Track failed attempts and auto-pause after max retries
	 */
	private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
		this.logger.log(
			`Invoice payment failed: ${invoice.id}, attempt ${invoice.attempt_count}`
		)

		// Type guard for expanded invoice fields from webhooks
		const invoiceData = invoice as Stripe.Invoice & {
			subscription?: string | Stripe.Subscription
			payment_intent?: string | Stripe.PaymentIntent
		}

		if (!invoiceData.subscription) {
			this.logger.warn('Invoice has no subscription, skipping')
			return
		}

		const subscriptionId =
			typeof invoiceData.subscription === 'string'
				? invoiceData.subscription
				: invoiceData.subscription?.id

		// Get subscription from database
		const { data: subscription } = await this.supabase
			.getAdminClient()
			.from('RentSubscription')
			.select('*')
			.eq('stripeSubscriptionId', subscriptionId)
			.single()

		if (!subscription) {
			this.logger.warn(`Subscription not found for invoice: ${subscriptionId}`)
			return
		}

		// Update subscription to past_due status
		await this.supabase
			.getAdminClient()
			.from('RentSubscription')
			.update({
				status: 'past_due'
			})
			.eq('id', subscription.id)

		// Smart Retries: After 4 attempts (configurable in Stripe Dashboard)
		// Stripe will automatically pause the subscription
		// We handle the subscription.updated webhook to sync status
		if ((invoice.attempt_count || 0) >= 4) {
			this.logger.warn(
				`Subscription ${subscription.id} exceeded retry limit, pausing`
			)
			await this.supabase
				.getAdminClient()
				.from('RentSubscription')
				.update({
					status: 'paused',
					pausedAt: new Date().toISOString()
				})
				.eq('id', subscription.id)
		}
	}

	/**
	 * Handle subscription updates
	 * Phase 4: Sync subscription status changes from Stripe
	 */
	private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
		this.logger.log(`Subscription updated: ${subscription.id}`)

		// Map Stripe status to our status
		const statusMap: Record<string, string> = {
			active: 'active',
			past_due: 'past_due',
			canceled: 'canceled',
			incomplete: 'incomplete',
			incomplete_expired: 'incomplete',
			paused: 'paused',
			unpaid: 'past_due'
		}

		const dbStatus = statusMap[subscription.status] || subscription.status

		await this.supabase
			.getAdminClient()
			.from('RentSubscription')
			.update({
				status: dbStatus,
				updatedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', subscription.id)
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
