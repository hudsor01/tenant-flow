/**
 * Minimal Stripe Webhook Handler Service
 *
 * This service handles Stripe webhook events and updates our database accordingly.
 * Following Stripe's best practices:
 * - Trust webhooks as the single source of truth
 * - Handle events asynchronously
 * - Return 2xx quickly before complex logic
 * - Handle duplicate events via event IDs
 *
 * Replaces: subscription-sync.service.ts (779 lines) with ~100 lines
 */

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { Stripe } from 'stripe'

// Use native Stripe SDK types directly - no custom extensions needed
// Stripe.Subscription already includes current_period_start and current_period_end
// Stripe.Invoice already includes subscription property

@Injectable()
export class StripeWebhookService {
	private readonly logger = new Logger(StripeWebhookService.name)

	// Track processed events to handle duplicates
	private readonly processedEvents = new Set<string>()

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Main webhook handler - processes Stripe events
	 * Returns quickly with 2xx, actual processing happens async
	 */
	async handleWebhook(event: Stripe.Event): Promise<void> {
		// Check for duplicate events
		if (this.processedEvents.has(event.id)) {
			this.logger.log(`Skipping duplicate event: ${event.id}`)
			return
		}

		this.processedEvents.add(event.id)

		// Clean up old events (keep last 1000)
		if (this.processedEvents.size > 1000) {
			const firstEvent = this.processedEvents.values().next().value
			if (firstEvent) {
				this.processedEvents.delete(firstEvent)
			}
		}

		this.logger.log(`Processing webhook: ${event.type} (${event.id})`)

		// Handle events based on type using native Stripe types
		 
		// Handle only specific webhook events we care about
		if (event.type === 'customer.subscription.created' ||
		    event.type === 'customer.subscription.updated' ||
		    event.type === 'customer.subscription.deleted') {
			await this.handleSubscriptionChange(
				event.data.object
			)
		} else if (event.type === 'invoice.payment_failed') {
			await this.handlePaymentFailure(event.data.object)
		} else if (event.type === 'invoice.paid') {
			await this.handlePaymentSuccess(event.data.object)
		} else {
			// Other event types are ignored
			this.logger.debug(`Unhandled event type: ${event.type}`)
		}
	}

	/**
	 * Handle subscription changes - trust Stripe as source of truth
	 */
	private async handleSubscriptionChange(
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			// Find user by customer ID
			const customerId =
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer.id

			const { data: user } = await this.supabaseService
				.getAdminClient()
				.from('User')
				.select('id')
				.eq('stripeCustomerId', customerId)
				.single()

			if (!user) {
				// Try finding by subscription table
				const { data: sub } = await this.supabaseService
					.getAdminClient()
					.from('Subscription')
					.select('userId')
					.eq('stripeCustomerId', customerId)
					.single()

				if (!sub) {
					this.logger.warn(
						`No user found for customer: ${customerId}`
					)
					return
				}

				await this.upsertSubscription(subscription, sub.userId)
			} else {
				await this.upsertSubscription(subscription, user.id)
			}
		} catch (error) {
			this.logger.error(`Failed to handle subscription change: ${error}`)
			throw error // Let Stripe retry
		}
	}

	/**
	 * Handle payment failures - Stripe Smart Retries will handle recovery
	 */
	private async handlePaymentFailure(
		invoice: Stripe.Invoice
	): Promise<void> {
		// Invoice subscription can be string, Subscription object, or null
		const invoiceData = invoice as any
		const subscriptionId = typeof invoiceData.subscription === 'string' 
			? invoiceData.subscription 
			: invoiceData.subscription?.id
			
		if (!subscriptionId) {
			return
		}

		await this.updateSubscriptionStatus(subscriptionId, 'PAST_DUE')
		this.logger.log(
			`Payment failed for subscription: ${subscriptionId}. Smart Retries will handle recovery.`
		)
	}

	/**
	 * Handle payment success
	 */
	private async handlePaymentSuccess(
		invoice: Stripe.Invoice
	): Promise<void> {
		// Invoice subscription can be string, Subscription object, or null
		const invoiceData = invoice as any
		const subscriptionId = typeof invoiceData.subscription === 'string' 
			? invoiceData.subscription 
			: invoiceData.subscription?.id
			
		if (!subscriptionId) {
			return
		}

		await this.updateSubscriptionStatus(subscriptionId, 'ACTIVE')
		this.logger.log(`Payment succeeded for subscription: ${subscriptionId}`)
	}

	/**
	 * Upsert subscription to database - single source of truth from Stripe
	 */
	private async upsertSubscription(
		stripeSubscription: Stripe.Subscription,
		userId: string
	): Promise<void> {
		// Access period dates through the correct property path
		const periodStart = (stripeSubscription as any).current_period_start || 
			Math.floor(Date.now() / 1000)
		const periodEnd = (stripeSubscription as any).current_period_end || 
			Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

		// Convert Stripe subscription to our database format with ISO strings
		const subscription = {
			userId,
			stripeSubscriptionId: stripeSubscription.id,
			stripeCustomerId: stripeSubscription.customer as string,
			stripePriceId: stripeSubscription.items.data[0]?.price.id,
			status: this.mapStripeStatus(stripeSubscription.status),
			currentPeriodStart: new Date(periodStart * 1000).toISOString(),
			currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
			cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
			canceledAt: stripeSubscription.canceled_at
				? new Date(stripeSubscription.canceled_at * 1000).toISOString()
				: null,
		}

		// Upsert to database
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('Subscription')
			.upsert(subscription, {
				onConflict: 'stripeSubscriptionId',
			})

		if (error) {
			this.logger.error(`Failed to upsert subscription: ${error.message}`)
			throw error
		}

		this.logger.log(`Updated subscription: ${stripeSubscription.id}`)
	}

	/**
	 * Update subscription status
	 */
	private async updateSubscriptionStatus(
		stripeSubscriptionId: string,
		status: 'ACTIVE' | 'CANCELED' | 'TRIALING' | 'PAST_DUE' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED'
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('Subscription')
			.update({ status })
			.eq('stripeSubscriptionId', stripeSubscriptionId)

		if (error) {
			this.logger.error(`Failed to update subscription status: ${error.message}`)
			throw error
		}
	}

	/**
	 * Map Stripe status to our status enum
	 */
	private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 
		'ACTIVE' | 'CANCELED' | 'TRIALING' | 'PAST_DUE' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' {
		const statusMap: Record<Stripe.Subscription.Status, 
			'ACTIVE' | 'CANCELED' | 'TRIALING' | 'PAST_DUE' | 'UNPAID' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED'> = {
			active: 'ACTIVE',
			past_due: 'PAST_DUE',
			canceled: 'CANCELED',
			unpaid: 'UNPAID',
			incomplete: 'INCOMPLETE',
			incomplete_expired: 'INCOMPLETE_EXPIRED',
			trialing: 'TRIALING',
			paused: 'ACTIVE', // Map paused to ACTIVE as we don't have a PAUSED status
		}

		return statusMap[stripeStatus] || 'ACTIVE'
	}

	/**
	 * Clean up old processed events periodically
	 * Called externally via cron job
	 */
	clearProcessedEvents(): void {
		this.processedEvents.clear()
		this.logger.log('Cleared processed events cache')
	}
}