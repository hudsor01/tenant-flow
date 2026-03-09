/**
 * Billing & Subscriptions Query Hooks
 * TanStack Query hooks for billing, invoices, and subscription data fetching
 *
 * Mutation hooks are in use-billing-mutations.ts.
 * Query keys and options are in query-keys/billing-keys.ts.
 *
 * Data source: stripe.* tables synced by Supabase Stripe Sync Engine (Decision #13).
 * Billing hooks (PAY-19, PAY-20) query stripe.* tables which must have current data.
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createLogger } from '#lib/frontend-logger'
import type {
	RentSubscriptionResponse,
	SubscriptionStatusResponse
} from '#types/api-contracts'

import {
	billingKeys,
	billingQueries,
	subscriptionsKeys
} from './query-keys/billing-keys'

// Re-export keys and types for consumers that import from use-billing
export { billingKeys, subscriptionsKeys, billingQueries } from './query-keys/billing-keys'
export type { FormattedInvoice } from './query-keys/billing-keys'

const logger = createLogger({ component: 'UseBilling' })

// ============================================================================
// INVOICE HOOKS
// ============================================================================

export function useInvoices() {
	return useQuery(billingQueries.invoices())
}

// ============================================================================
// BILLING HISTORY HOOKS
// ============================================================================

export function useBillingHistory() {
	return useQuery(billingQueries.history())
}

export function useFailedPaymentAttempts() {
	return useQuery(billingQueries.failed())
}

// ============================================================================
// SUBSCRIPTION STATUS HOOK
// ============================================================================

export function useSubscriptionStatus(options: { enabled?: boolean } = {}) {
	const { enabled = true } = options

	return useQuery<SubscriptionStatusResponse>({
		queryKey: billingKeys.subscriptionStatus(),
		queryFn: async () => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) {
				logger.warn('Subscription status check: no user')
				throw new Error('Not authenticated')
			}

			// Get stripe_customer_id from users table
			const { data: userData, error: userError } = await supabase
				.from('users')
				.select('stripe_customer_id')
				.eq('id', user.id)
				.single()

			if (userError) handlePostgrestError(userError, 'users')

			const stripeCustomerId = userData?.stripe_customer_id ?? null

			if (!stripeCustomerId) {
				logger.debug('No stripe_customer_id, returning null status')
				return {
					subscriptionStatus: null,
					stripeCustomerId: null,
					stripePriceId: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false
				} satisfies SubscriptionStatusResponse
			}

			// Query stripe.subscriptions for real subscription status
			const { data: subData, error: subError } = await supabase
				.rpc('get_subscription_status', { p_customer_id: stripeCustomerId })

			if (subError) {
				logger.debug('get_subscription_status RPC not available, falling back to leases', {
					error: subError.message
				})

				const { data: leaseData } = await supabase
					.from('leases')
					.select('stripe_subscription_status')
					.eq('owner_user_id', user.id)
					.not('stripe_subscription_id', 'is', null)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle()

				const leaseStatus = leaseData?.stripe_subscription_status as string | null

				return {
					subscriptionStatus: (leaseStatus ?? null) as SubscriptionStatusResponse['subscriptionStatus'],
					stripeCustomerId,
					stripePriceId: null,
					currentPeriodEnd: null,
					cancelAtPeriodEnd: false
				} satisfies SubscriptionStatusResponse
			}

			const sub = (Array.isArray(subData) ? subData[0] : subData) as Record<string, unknown> | null

			const status = (sub?.status as string) ?? null
			logger.debug('Subscription status from stripe.subscriptions', { status })

			return {
				subscriptionStatus: status as SubscriptionStatusResponse['subscriptionStatus'],
				stripeCustomerId,
				stripePriceId: (sub?.price_id as string) ?? null,
				currentPeriodEnd: (sub?.current_period_end as string) ?? null,
				cancelAtPeriodEnd: (sub?.cancel_at_period_end as boolean) ?? false
			} satisfies SubscriptionStatusResponse
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		enabled
	})
}

// ============================================================================
// SUBSCRIPTION QUERY HOOKS
// ============================================================================

export function useSubscriptions() {
	return useQuery({
		queryKey: subscriptionsKeys.list(),
		queryFn: async (): Promise<RentSubscriptionResponse[]> => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('leases')
				.select('id, stripe_subscription_id, stripe_subscription_status, rent_amount, rent_currency, primary_tenant_id, unit_id')
				.not('stripe_subscription_id', 'is', null)
				.order('created_at', { ascending: false })
			if (error) handlePostgrestError(error, 'leases')
			return (data ?? []).map((row): RentSubscriptionResponse => ({
				id: row.id,
				leaseId: row.id,
				tenantId: row.primary_tenant_id ?? '',
				ownerId: '',
				stripeSubscriptionId: row.stripe_subscription_id ?? '',
				stripeCustomerId: '',
				amount: row.rent_amount ?? undefined,
				currency: row.rent_currency ?? 'USD',
				billingDayOfMonth: 1,
				status: row.stripe_subscription_status ?? 'unknown',
				platformFeePercentage: 0,
				createdAt: '',
				updatedAt: ''
			}))
		},
		staleTime: 30 * 1000
	})
}

export function useSubscription(id: string) {
	return useQuery({
		queryKey: subscriptionsKeys.detail(id),
		queryFn: async (): Promise<RentSubscriptionResponse> => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('leases')
				.select('id, stripe_subscription_id, stripe_subscription_status, rent_amount, rent_currency, primary_tenant_id, unit_id')
				.eq('id', id)
				.single()
			if (error) handlePostgrestError(error, 'leases')
			const row = data!
			return {
				id: row.id,
				leaseId: row.id,
				tenantId: row.primary_tenant_id ?? '',
				ownerId: '',
				stripeSubscriptionId: row.stripe_subscription_id ?? '',
				stripeCustomerId: '',
				amount: row.rent_amount ?? undefined,
				currency: row.rent_currency ?? 'USD',
				billingDayOfMonth: 1,
				status: row.stripe_subscription_status ?? 'unknown',
				platformFeePercentage: 0,
				createdAt: '',
				updatedAt: ''
			} satisfies RentSubscriptionResponse
		},
		enabled: !!id
	})
}

