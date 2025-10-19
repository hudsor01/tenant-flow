import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'

/**
 * ULTRA-NATIVE: Subscription-based Access Control Service
 *
 * Handles feature gating and access control based on Stripe subscription status
 * Triggered by Stripe Sync Engine webhook events
 *
 * ALLOWED: Direct Supabase RPC calls
 * FORBIDDEN: Custom abstractions, manual subscription tracking
 */
@Injectable()
export class StripeAccessControlService {
	private readonly logger = new Logger(StripeAccessControlService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Grant access to features when subscription becomes active
	 * Called on: subscription.created, subscription.updated (to active/trialing)
	 */
	async grantSubscriptionAccess(
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			const customerId =
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer.id

			// Get user_id from stripe.customers
			const { data: userId, error: userError } =
				await this.supabaseService.rpcWithRetries(
					'get_user_id_by_stripe_customer',
					{ p_stripe_customer_id: customerId },
					2
				)

			if (userError || !userId) {
				this.logger.warn('Could not find user for subscription', {
					subscriptionId: subscription.id,
					customerId,
					error: userError?.message
				})
				return
			}

			// Log access grant
			this.logger.log('Granting subscription access', {
				userId,
				subscriptionId: subscription.id,
				status: subscription.status,
				planId: subscription.items.data[0]?.price?.id
			})

			// Access is automatically granted via stripe.subscriptions table
			// The get_user_active_subscription() function will return the subscription
			// Frontend and backend can check via check_user_feature_access() RPC

			// No additional database writes needed - stripe.* schema is source of truth
		} catch (error) {
			this.logger.error('Failed to grant subscription access', {
				subscriptionId: subscription.id,
				error: error instanceof Error ? error.message : String(error)
			})
			// Don't throw - webhook should succeed even if business logic fails
		}
	}

	/**
	 * Revoke access when subscription is canceled or expires
	 * Called on: subscription.deleted, subscription.updated (to canceled/incomplete_expired)
	 */
	async revokeSubscriptionAccess(
		subscription: Stripe.Subscription
	): Promise<void> {
		try {
			const customerId =
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer.id

			// Get user_id from stripe.customers
			const { data: userId, error: userError } =
				await this.supabaseService.rpcWithRetries(
					'get_user_id_by_stripe_customer',
					{ p_stripe_customer_id: customerId },
					2
				)

			if (userError || !userId) {
				this.logger.warn('Could not find user for subscription cancellation', {
					subscriptionId: subscription.id,
					customerId,
					error: userError?.message
				})
				return
			}

			// Log access revocation
			this.logger.log('Revoking subscription access', {
				userId,
				subscriptionId: subscription.id,
				status: subscription.status,
				canceledAt: subscription.canceled_at
			})

			// Access is automatically revoked via stripe.subscriptions table
			// The get_user_active_subscription() function filters by status
			// canceled/incomplete_expired subscriptions won't be returned

			// No additional database writes needed - stripe.* schema is source of truth
		} catch (error) {
			this.logger.error('Failed to revoke subscription access', {
				subscriptionId: subscription.id,
				error: error instanceof Error ? error.message : String(error)
			})
			// Don't throw - webhook should succeed even if business logic fails
		}
	}

	/**
	 * Handle trial ending (3 days before expiration)
	 * Called on: customer.subscription.trial_will_end
	 */
	async handleTrialEnding(subscription: Stripe.Subscription): Promise<void> {
		try {
			const customerId =
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer.id

			// Get user_id and email
			const { data: userId, error: userError } =
				await this.supabaseService.rpcWithRetries(
					'get_user_id_by_stripe_customer',
					{ p_stripe_customer_id: customerId },
					2
				)

			if (userError || !userId) {
				this.logger.warn('Could not find user for trial ending', {
					subscriptionId: subscription.id,
					customerId
				})
				return
			}

			// Calculate days remaining
			const trialEnd = subscription.trial_end
				? new Date(subscription.trial_end * 1000)
				: null
			const daysRemaining = trialEnd
				? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
				: 0

			this.logger.log('Trial ending soon', {
				userId,
				subscriptionId: subscription.id,
				daysRemaining,
				trialEnd
			})

			// TODO: Send email notification
			// This will be implemented in the email notifications service
		} catch (error) {
			this.logger.error('Failed to handle trial ending', {
				subscriptionId: subscription.id,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Handle failed payment
	 * Called on: invoice.payment_failed
	 */
	async handlePaymentFailed(
		invoice: Stripe.Invoice & { subscription?: string | Stripe.Subscription }
	): Promise<void> {
		try {
			const customerId =
				typeof invoice.customer === 'string'
					? invoice.customer
					: invoice.customer?.id

			if (!customerId) {
				this.logger.warn('Invoice has no customer', {
					invoiceId: invoice.id
				})
				return
			}

			// Get user_id
			const { data: userId, error: userError } =
				await this.supabaseService.rpcWithRetries(
					'get_user_id_by_stripe_customer',
					{ p_stripe_customer_id: customerId },
					2
				)

			if (userError || !userId) {
				this.logger.warn('Could not find user for failed payment', {
					invoiceId: invoice.id,
					customerId
				})
				return
			}

			this.logger.error('Payment failed', {
				userId,
				invoiceId: invoice.id,
				subscriptionId:
					typeof invoice.subscription === 'string'
						? invoice.subscription
						: invoice.subscription?.id,
				amountDue: invoice.amount_due,
				currency: invoice.currency,
				attemptCount: invoice.attempt_count
			})

			// TODO: Send email notification to customer
			// TODO: Send admin notification if multiple failures
			// This will be implemented in the email notifications service
		} catch (error) {
			this.logger.error('Failed to handle payment failure', {
				invoiceId: invoice.id,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Handle successful payment
	 * Called on: invoice.payment_succeeded
	 */
	async handlePaymentSucceeded(
		invoice: Stripe.Invoice & { subscription?: string | Stripe.Subscription }
	): Promise<void> {
		try {
			const customerId =
				typeof invoice.customer === 'string'
					? invoice.customer
					: invoice.customer?.id

			if (!customerId) {
				return
			}

			// Get user_id
			const { data: userId, error: userError } =
				await this.supabaseService.rpcWithRetries(
					'get_user_id_by_stripe_customer',
					{ p_stripe_customer_id: customerId },
					2
				)

			if (userError || !userId) {
				return
			}

			this.logger.log('Payment succeeded', {
				userId,
				invoiceId: invoice.id,
				subscriptionId:
					typeof invoice.subscription === 'string'
						? invoice.subscription
						: invoice.subscription?.id,
				amountPaid: invoice.amount_paid,
				currency: invoice.currency
			})

			// TODO: Send payment receipt email
			// This will be implemented in the email notifications service
		} catch (error) {
			this.logger.error('Failed to handle payment success', {
				invoiceId: invoice.id,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	/**
	 * Check if user has access to a specific feature
	 * Used by: API guards, frontend feature flags
	 */
	async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
		try {
			// Note: This RPC function will be added to Supabase types after migration is applied
			const { data: hasAccess, error } = (await this.supabaseService
				.getAdminClient()
				.rpc(
					'check_user_feature_access' as never,
					{
						p_user_id: userId,
						p_feature: feature
					} as never
				)) as { data: boolean | null; error: { message: string } | null }

			if (error) {
				this.logger.error('Failed to check feature access', {
					userId,
					feature,
					error: error.message
				})
				return false
			}

			return hasAccess ?? false
		} catch (error) {
			this.logger.error('Exception checking feature access', {
				userId,
				feature,
				error: error instanceof Error ? error.message : String(error)
			})
			return false
		}
	}

	/**
	 * Get user's current plan limits
	 * Used by: Quota enforcement, UI display
	 */
	async getUserPlanLimits(userId: string): Promise<{
		propertyLimit: number
		unitLimit: number
		userLimit: number
		storageGB: number
		hasApiAccess: boolean
		hasWhiteLabel: boolean
		supportLevel: string
	} | null> {
		try {
			// Note: This RPC function will be added to Supabase types after migration is applied
			const { data, error } = (await this.supabaseService
				.getAdminClient()
				.rpc(
					'get_user_plan_limits' as never,
					{
						p_user_id: userId
					} as never
				)
				.single()) as {
				data: {
					property_limit: number
					unit_limit: number
					user_limit: number
					storage_gb: number
					has_api_access: boolean
					has_white_label: boolean
					support_level: string
				} | null
				error: { message: string } | null
			}

			if (error || !data) {
				this.logger.warn('Could not get plan limits', {
					userId,
					error: error?.message
				})
				return null
			}

			return {
				propertyLimit: data.property_limit,
				unitLimit: data.unit_limit,
				userLimit: data.user_limit,
				storageGB: data.storage_gb,
				hasApiAccess: data.has_api_access,
				hasWhiteLabel: data.has_white_label,
				supportLevel: data.support_level
			}
		} catch (error) {
			this.logger.error('Exception getting plan limits', {
				userId,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}
}
