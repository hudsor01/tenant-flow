/**
 * Subscription Query Keys & Options
 * Extracted from billing-keys.ts for the 300-line file size rule.
 *
 * Contains:
 * - subscriptionStatusKey: cache key for SaaS subscription status
 * - subscriptionStatusQuery: SaaS subscription status check
 *
 * Note: Legacy rent-subscription factories (tenants paying rent via Stripe
 * subscriptions on leases) were removed with the landlord-only refactor —
 * the leases.stripe_subscription_* columns are gone.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createLogger } from '#lib/frontend-logger'
import type { SubscriptionStatusResponse } from '#types/api-contracts'

const logger = createLogger({ component: 'SubscriptionKeys' })

/**
 * Subscription status key lives here (colocated with its query factory).
 * Exported so mutation hooks (cancel/reactivate) can write/invalidate the same cache entry.
 */
export const subscriptionStatusKey = ['billing', 'subscription-status'] as const

export const subscriptionStatusQuery = {
	subscriptionStatus: (options?: { enabled?: boolean }) =>
		queryOptions({
			queryKey: subscriptionStatusKey,
			queryFn: async (): Promise<SubscriptionStatusResponse> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) {
					logger.warn('Subscription status check: no user')
					throw new Error('Not authenticated')
				}

				// Get stripe_customer_id + trial_ends_at + subscription_status from users table
				const { data: userData, error: userError } = await supabase
					.from('users')
					.select('stripe_customer_id, trial_ends_at, subscription_status')
					.eq('id', user.id)
					.single()

				if (userError) handlePostgrestError(userError, 'users')

				const stripeCustomerId = userData?.stripe_customer_id ?? null
				const trialEndsAt = userData?.trial_ends_at ?? null
				const localStatus = userData?.subscription_status ?? null

				if (!stripeCustomerId) {
					logger.debug('No stripe_customer_id, returning local status')
					return {
						subscriptionStatus: localStatus as SubscriptionStatusResponse['subscriptionStatus'],
						stripeCustomerId: null,
						stripePriceId: null,
						currentPeriodEnd: null,
						cancelAtPeriodEnd: false,
						trialEndsAt
					} satisfies SubscriptionStatusResponse
				}

				// Query stripe.subscriptions for real subscription status
				const { data: subData, error: subError } = await supabase
					.rpc('get_subscription_status', { p_customer_id: stripeCustomerId })

				if (subError) {
					logger.debug('get_subscription_status RPC failed, falling back to local status', {
						error: subError.message
					})
					return {
						subscriptionStatus: localStatus as SubscriptionStatusResponse['subscriptionStatus'],
						stripeCustomerId,
						stripePriceId: null,
						currentPeriodEnd: null,
						cancelAtPeriodEnd: false,
						trialEndsAt
					} satisfies SubscriptionStatusResponse
				}

				const sub = (Array.isArray(subData) ? subData[0] : subData) as Record<string, unknown> | null

				const status = (sub?.status as string) ?? localStatus
				logger.debug('Subscription status from stripe.subscriptions', { status })

				return {
					subscriptionStatus: status as SubscriptionStatusResponse['subscriptionStatus'],
					stripeCustomerId,
					stripePriceId: (sub?.price_id as string) ?? null,
					currentPeriodEnd: (sub?.current_period_end as string) ?? null,
					cancelAtPeriodEnd: (sub?.cancel_at_period_end as boolean) ?? false,
					trialEndsAt
				} satisfies SubscriptionStatusResponse
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: options?.enabled ?? true
		})
}
