import { Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from '../email/email.service'
import {
	MAX_STRIPE_PAYMENT_ATTEMPTS,
	DEFAULT_RPC_RETRY_ATTEMPTS
} from './stripe.constants'
import { userIdByStripeCustomerSchema } from '@repo/shared/validation/database-rpc.schemas'
import type { Database } from '@repo/shared/types/supabase'

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

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly emailService: EmailService
	) {}

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

			// Get user_id from stripe.customers with Zod validation
			const rpcResult = await this.supabaseService.rpcWithRetries(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: customerId },
				DEFAULT_RPC_RETRY_ATTEMPTS
			)

			const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId,
					subscriptionId: subscription.id
				})
				return
			}

			const { data: userId, error: userError } = validatedResult.data

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

			// Get user_id from stripe.customers with Zod validation
		const rpcResult = await this.supabaseService.rpcWithRetries(
			'get_user_id_by_stripe_customer',
			{ p_stripe_customer_id: customerId },
			DEFAULT_RPC_RETRY_ATTEMPTS
		)

		const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
		if (!validatedResult.success) {
			this.logger.error('RPC response validation failed', {
				errors: validatedResult.error.issues,
				customerId
			})
			return
		}

		const { data: userId, error: userError } = validatedResult.data

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

			// Get user email for sending cancellation notice
			const { data: userData, error: emailError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('email')
				.eq('id', userId)
				.single<Pick<Database['public']['Tables']['users']['Row'], 'email'>>()

			if (emailError || !userData?.email) {
				this.logger.warn('Could not fetch user email for cancellation notice', {
					userId,
				error: emailError instanceof Error ? emailError.message : String(emailError)
				})
			} else {
				// Send subscription canceled email using React template
				// Type assertion needed because Stripe types don't expose all fields
				const sub = subscription as Stripe.Subscription & {
					current_period_end?: number
				}
				const currentPeriodEnd = sub.current_period_end
					? new Date(sub.current_period_end * 1000)
					: null

				await this.emailService.sendSubscriptionCanceledEmail({
					customerEmail: userData.email,
					subscriptionId: subscription.id,
					cancelAtPeriodEnd: subscription.cancel_at_period_end,
					currentPeriodEnd
				})
			}

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

			// Get user_id with Zod validation
			const rpcResult = await this.supabaseService.rpcWithRetries(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: customerId },
				DEFAULT_RPC_RETRY_ATTEMPTS
			)

			const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId,
					subscriptionId: subscription.id
				})
				return
			}

			const { data: userId, error: userError } = validatedResult.data

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

			// Send trial ending email via Supabase function with retries
		if (trialEnd) {
			try {
				const result = await this.supabaseService.rpcWithRetries(
					'send_trial_ending_email',
					{
						p_user_id: userId,
						p_subscription_id: subscription.id,
						p_days_remaining: daysRemaining,
						p_trial_end: trialEnd.toISOString()
					},
					DEFAULT_RPC_RETRY_ATTEMPTS
				)
				if (result.error) {
					this.logger.warn('Failed to send trial ending email after retries', {
						userId,
						subscriptionId: subscription.id,
						error:
							result.error instanceof Error
								? result.error.message
								: String(result.error as unknown)
					})
				} else {
					this.logger.log('Trial ending email sent successfully', {
						userId,
						subscriptionId: subscription.id,
						daysRemaining
					})
				}
			} catch (emailError) {
				this.logger.error('Exception sending trial ending email', {
					userId,
					subscriptionId: subscription.id,
					error: emailError instanceof Error ? emailError.message : String(emailError)
				})
			}
		}
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

			// Get user_id with Zod validation
			const rpcResult = await this.supabaseService.rpcWithRetries(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: customerId },
				DEFAULT_RPC_RETRY_ATTEMPTS
			)

			const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId,
					invoiceId: invoice.id
				})
				return
			}

			const { data: userId, error: userError } = validatedResult.data

			if (userError || !userId) {
				this.logger.warn('Could not find user for failed payment', {
					invoiceId: invoice.id,
					customerId
				})
				return
			}

			this.logger.warn('Payment failed', {
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

			// Get user email for sending failed payment notice
			const { data: userData, error: emailError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('email')
				.eq('id', userId)
				.single<Pick<Database['public']['Tables']['users']['Row'], 'email'>>()

			if (emailError || !userData?.email) {
				this.logger.warn(
					'Could not fetch user email for payment failed notice',
					{
						userId,
						error:
							emailError instanceof Error
								? emailError.message
								: String(emailError)
					}
				)
				return
			}

			// Determine if this is the last attempt
			const isLastAttempt = invoice.attempt_count >= MAX_STRIPE_PAYMENT_ATTEMPTS

			// Send payment failed email using React template
			await this.emailService.sendPaymentFailedEmail({
				customerEmail: userData.email,
				amount: invoice.amount_due,
				currency: invoice.currency,
				attemptCount: invoice.attempt_count,
				invoiceUrl: invoice.hosted_invoice_url ?? null,
				isLastAttempt
			})
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

			// Get user_id with Zod validation
			const rpcResult = await this.supabaseService.rpcWithRetries(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: customerId },
				DEFAULT_RPC_RETRY_ATTEMPTS
			)

			const validatedResult = userIdByStripeCustomerSchema.safeParse(rpcResult)
			if (!validatedResult.success) {
				this.logger.error('RPC response validation failed', {
					errors: validatedResult.error.issues,
					customerId,
					invoiceId: invoice.id
				})
				return
			}

			const { data: userId, error: userError } = validatedResult.data

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

			// Get user email for sending receipt
			const { data: userData, error: emailError } = await this.supabaseService
				.getAdminClient()
				.from('users')
				.select('email')
				.eq('id', userId)
				.single<Pick<Database['public']['Tables']['users']['Row'], 'email'>>()

			if (emailError || !userData?.email) {
				this.logger.warn('Could not fetch user email for payment receipt', {
					userId,
				error: emailError instanceof Error ? emailError.message : String(emailError)
				})
				return
			}

			// Send payment success receipt email using React template
			await this.emailService.sendPaymentSuccessEmail({
				customerEmail: userData.email,
				amount: invoice.amount_paid,
				currency: invoice.currency,
				invoiceUrl: invoice.hosted_invoice_url ?? null,
				invoicePdf: invoice.invoice_pdf ?? null
			})
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
			const { data: hasAccess, error } = await this.supabaseService
				.getAdminClient()
				.rpc('check_user_feature_access', {
					p_user_id: userId,
					p_feature: feature
				})

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
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.rpc('get_user_plan_limits', {
					p_user_id: userId
				})
				.single()

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
