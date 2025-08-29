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
import { Cron, CronExpression } from '@nestjs/schedule'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
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
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Main webhook handler - processes Stripe events synchronously
	 * Returns 2xx after processing completes (Stripe's recommended pattern)
	 */
	async handleWebhook(event: Stripe.Event): Promise<void> {
		// Use insert-first idempotency gate: try to insert row at start
		// On unique violation, treat as duplicate and exit
		// If processing fails, delete the row so Stripe can retry
		const isNewEvent = await this.tryMarkEventAsProcessing(event.id, event.type)
		if (!isNewEvent) {
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

		this.logger.info(`Processing webhook: ${event.type} (${event.id})`)

		try {
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

			// Processing successful - event remains marked as processed
			this.logger.info(`Successfully processed webhook: ${event.type} (${event.id})`)
		} catch (error) {
			this.logger.error(`Failed to process webhook ${event.id}: ${error}`)
			
			// Remove the processed event record so Stripe can retry
			await this.removeProcessedEvent(event.id)
			
			throw error // Let Stripe retry
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

	/**
	 * Insert-first idempotency gate: try to insert event record
	 * Returns true if new event (should process), false if duplicate (skip)
	 */
	private async tryMarkEventAsProcessing(stripeEventId: string, eventType: string): Promise<boolean> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('processed_stripe_events')
				.insert({
					stripe_event_id: stripeEventId,
					event_type: eventType
				})

			if (error) {
				// Check if it's a unique constraint violation (duplicate event)
				if (error.code === '23505') {
					return false // Duplicate event - skip processing
				}
				
				// Other database error - log but assume new event to avoid skipping
				this.logger.error(`Failed to mark event for processing: ${error.message}`)
				return true
			}

			return true // Successfully inserted - new event
		} catch (error) {
			this.logger.error(`Failed to mark event for processing: ${error}`)
			return true // On error, assume new event to avoid skipping
		}
	}

	/**
	 * Remove processed event record (for failed processing, allowing Stripe retry)
	 */
	private async removeProcessedEvent(stripeEventId: string): Promise<void> {
		try {
			const { error } = await this.supabaseService
				.getAdminClient()
				.from('processed_stripe_events')
				.delete()
				.eq('stripe_event_id', stripeEventId)

			if (error) {
				this.logger.error(`Failed to remove processed event for retry: ${error.message}`)
			}
		} catch (error) {
			this.logger.error(`Failed to remove processed event for retry: ${error}`)
		}
	}

	/**
	 * Cleanup old processed events (scheduled daily at 2 AM)
	 * Keeps events for 30 days to handle Stripe's retry window
	 */
	@Cron(CronExpression.EVERY_DAY_AT_2AM)
	async cleanupOldProcessedEvents(): Promise<void> {
		try {
			const cutoffDate = new Date()
			cutoffDate.setDate(cutoffDate.getDate() - 30)

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('processed_stripe_events')
				.delete()
				.lt('processed_at', cutoffDate.toISOString())

			if (error) {
				this.logger.error(`Failed to cleanup old processed events: ${error.message}`)
			} else {
				this.logger.info('Cleaned up old processed events')
			}
		} catch (error) {
			this.logger.error(`Failed to cleanup old processed events: ${error}`)
		}
	}
}
