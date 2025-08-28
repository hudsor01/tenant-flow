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

import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import { PaymentReceivedEvent, PaymentFailedEvent } from '../notifications/events/notification.events'
import type { Stripe } from 'stripe'

// Extended interfaces for Stripe objects with missing properties
interface StripeInvoiceWithSubscription extends Stripe.Invoice {
	subscription?: string | Stripe.Subscription | null
}

// Extended interface for Stripe Subscription with period properties
// Note: These properties exist at runtime but are missing from the TypeScript definitions
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
	current_period_start: number
	current_period_end: number
}

@Injectable()
export class StripeWebhookService {
	// Track processed events to handle duplicates
	private readonly processedEvents = new Set<string>()

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: PinoLogger,
		private readonly eventEmitter: EventEmitter2
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Main webhook handler - processes Stripe events
	 * Returns quickly with 2xx, actual processing happens async
	 */
	async handleWebhook(event: Stripe.Event): Promise<void> {
		// Check for duplicate events
		if (this.processedEvents.has(event.id)) {
			this.logger.info(
				{
					webhook: {
						eventId: event.id,
						type: event.type,
						duplicate: true
					}
				},
				`Skipping duplicate event: ${event.id}`
			)
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

		this.logger.info(`Processing webhook: ${event.type} (${event.id})`)

		// Handle events based on type
		switch (event.type) {
			case 'customer.subscription.created':
			case 'customer.subscription.updated':
			case 'customer.subscription.deleted':
				await this.handleSubscriptionChange(
					event.data.object as StripeSubscriptionWithPeriods
				)
				break

			case 'invoice.payment_failed':
				await this.handlePaymentFailure(
					event.data.object as Stripe.Invoice
				)
				break

			case 'invoice.paid':
				await this.handlePaymentSuccess(
					event.data.object as Stripe.Invoice
				)
				break

			default:
				this.logger.debug(`Unhandled event type: ${event.type}`)
		}
	}

	/**
	 * Handle subscription changes - trust Stripe as source of truth
	 */
	private async handleSubscriptionChange(
		subscription: StripeSubscriptionWithPeriods
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
		invoice: StripeInvoiceWithSubscription
	): Promise<void> {
		const subscription = invoice.subscription
		if (!subscription) {
			return
		}

		const subscriptionId =
			typeof subscription === 'string' ? subscription : subscription.id

		await this.updateSubscriptionStatus(subscriptionId || '', 'PAST_DUE')
		this.logger.warn(
			`Payment failed for subscription: ${subscriptionId}. Smart Retries will handle recovery.`
		)

		// Emit payment failed event for notification service using native EventEmitter2
		try {
			// Get user by customer ID to emit event
			const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
			if (customerId) {
				const { data: user } = await this.supabaseService
					.getAdminClient()
					.from('User')
					.select('id, name, email')
					.eq('stripeCustomerId', customerId)
					.single()

				if (user) {
					this.eventEmitter.emit(
						'payment.failed',
						new PaymentFailedEvent(
							user.id,
							subscriptionId || '',
							invoice.amount_due || 0,
							invoice.currency || 'usd',
							invoice.hosted_invoice_url || '',
							`Payment failed for subscription ${subscriptionId}`
						)
					)
				}
			}
		} catch (error) {
			this.logger.error('Failed to emit payment failed event:', error)
		}
	}

	/**
	 * Handle payment success
	 */
	private async handlePaymentSuccess(
		invoice: StripeInvoiceWithSubscription
	): Promise<void> {
		const subscription = invoice.subscription
		if (!subscription) {
			return
		}

		const subscriptionId =
			typeof subscription === 'string' ? subscription : subscription.id

		await this.updateSubscriptionStatus(subscriptionId || '', 'ACTIVE')
		this.logger.info(`Payment succeeded for subscription: ${subscriptionId}`)

		// Emit payment received event for notification service using native EventEmitter2
		try {
			// Get user by customer ID to emit event
			const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
			if (customerId) {
				const { data: user } = await this.supabaseService
					.getAdminClient()
					.from('User')
					.select('id, name, email')
					.eq('stripeCustomerId', customerId)
					.single()

				if (user) {
					this.eventEmitter.emit(
						'payment.received',
						new PaymentReceivedEvent(
							user.id,
							subscriptionId || '',
							invoice.amount_paid || 0,
							invoice.currency || 'usd',
							invoice.hosted_invoice_url || '',
							`Payment of ${((invoice.amount_paid || 0) / 100).toFixed(2)} ${invoice.currency?.toUpperCase()} received successfully`
						)
					)
				}
			}
		} catch (error) {
			this.logger.error('Failed to emit payment received event:', error)
		}
	}

	/**
	 * Upsert subscription to database - single source of truth from Stripe
	 */
	private async upsertSubscription(
		stripeSubscription: StripeSubscriptionWithPeriods,
		userId: string
	): Promise<void> {
		// Convert Stripe subscription to our database format
		const subscription = {
			userId,
			stripeSubscriptionId: stripeSubscription.id,
			stripeCustomerId:
				typeof stripeSubscription.customer === 'string'
					? stripeSubscription.customer
					: stripeSubscription.customer.id,
			status: stripeSubscription.status,
			currentPeriodStart: new Date(
				stripeSubscription.current_period_start * 1000
			),
			currentPeriodEnd: new Date(
				stripeSubscription.current_period_end * 1000
			),
			createdAt: new Date(stripeSubscription.created * 1000),
			updatedAt: new Date(),
			cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
			canceledAt: stripeSubscription.canceled_at
				? new Date(stripeSubscription.canceled_at * 1000)
				: null,
			trialStart: stripeSubscription.trial_start
				? new Date(stripeSubscription.trial_start * 1000)
				: null,
			trialEnd: stripeSubscription.trial_end
				? new Date(stripeSubscription.trial_end * 1000)
				: null,
			planType:
				(stripeSubscription.items.data[0]?.price?.lookup_key as
					| 'FREETRIAL'
					| 'STARTER'
					| 'GROWTH'
					| 'TENANTFLOW_MAX') || 'UNKNOWN',
			stripePriceId:
				stripeSubscription.items.data[0]?.price?.id ||
				'UNKNOWN_PRICE_ID'
		}

		const { error } = await this.supabaseService
			.getAdminClient()
			.from('Subscription')
			.upsert({
				userId: userId,
				stripeSubscriptionId: subscription.stripeSubscriptionId,
				stripeCustomerId: subscription.stripeCustomerId,
				status: subscription.status.toUpperCase() as
					| 'ACTIVE'
					| 'CANCELED'
					| 'TRIALING'
					| 'PAST_DUE'
					| 'UNPAID'
					| 'INCOMPLETE'
					| 'INCOMPLETE_EXPIRED',
				planType: subscription.planType,
				stripePriceId: subscription.stripePriceId,
				currentPeriodStart:
					subscription.currentPeriodStart?.toISOString(),
				currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
				canceledAt: subscription.canceledAt?.toISOString(),
				trialStart: subscription.trialStart?.toISOString(),
				trialEnd: subscription.trialEnd?.toISOString(),
				updatedAt: new Date().toISOString()
			})

		if (error) {
			this.logger.error(`Failed to upsert subscription: ${error.message}`)
			throw error
		}
	}

	/**
	 * Update subscription status only
	 */
	private async updateSubscriptionStatus(
		stripeSubscriptionId: string,
		status: string
	): Promise<void> {
		const { error } = await this.supabaseService
			.getAdminClient()
			.from('Subscription')
			.update({
				status: status as
					| 'ACTIVE'
					| 'CANCELED'
					| 'TRIALING'
					| 'PAST_DUE'
					| 'UNPAID'
					| 'INCOMPLETE'
					| 'INCOMPLETE_EXPIRED',
				updatedAt: new Date().toISOString()
			})
			.eq('stripeSubscriptionId', stripeSubscriptionId)

		if (error) {
			this.logger.error(
				`Failed to update subscription status: ${error.message}`
			)
		}
	}
}
