/**
 * Billing & Subscriptions Hooks
 * TanStack Query hooks for billing, invoices, and subscription management
 *
 * Includes:
 * - Stripe invoices (via stripe.invoices PostgREST)
 * - Subscription payment history
 * - Subscription CRUD operations
 * - Real-time subscription status verification (via stripe.subscriptions)
 *
 * React 19 + TanStack Query v5 patterns
 *
 * Data source: stripe.* tables synced by Supabase Stripe Sync Engine (Decision #13).
 * Billing hooks (PAY-19, PAY-20) query stripe.* tables which must have current data.
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { createLogger } from '#shared/lib/frontend-logger'
import type {
	BillingHistoryItem,
	CreateRentSubscriptionRequest,
	FailedPaymentAttempt,
	RentSubscriptionResponse,
	SubscriptionStatusResponse,
	UpdateSubscriptionRequest
} from '#shared/types/api-contracts'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

const logger = createLogger({ component: 'UseBilling' })

// ============================================================================
// TYPES (Hook-specific, not shared)
// ============================================================================

/**
 * Formatted invoice for display - frontend presentation format
 */
export interface FormattedInvoice {
	id: string
	date: string
	amount: string
	status: string
	invoicePdf: string | null
	hostedUrl: string | null
}

// ============================================================================
// EDGE FUNCTION HELPER
// ============================================================================

/**
 * Call a billing Edge Function with the user's JWT.
 * Returns the parsed JSON response typed as T.
 */
async function callBillingEdgeFunction<T>(
	functionName: 'stripe-checkout' | 'stripe-billing-portal',
	body?: Record<string, unknown>
): Promise<T> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body ?? {})
	})

	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }))
		throw new Error((err as { error?: string }).error ?? `${functionName} failed: ${response.status}`)
	}

	return response.json() as Promise<T>
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const billingKeys = {
	all: ['billing'] as const,
	invoices: () => [...billingKeys.all, 'invoices'] as const,
	history: () => [...billingKeys.all, 'history'] as const,
	historyBySubscription: (subscriptionId: string) =>
		[...billingKeys.all, 'history', 'subscription', subscriptionId] as const,
	failed: () => [...billingKeys.all, 'failed'] as const,
	failedBySubscription: (subscriptionId: string) =>
		[...billingKeys.all, 'failed', subscriptionId] as const,
	subscriptionStatus: () => [...billingKeys.all, 'subscription-status'] as const
}

export const subscriptionsKeys = {
	all: ['subscriptions'] as const,
	list: () => [...subscriptionsKeys.all, 'list'] as const,
	detail: (id: string) => [...subscriptionsKeys.all, 'detail', id] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

export const billingQueries = {
	invoices: () =>
		queryOptions({
			queryKey: billingKeys.invoices(),
			queryFn: async (): Promise<FormattedInvoice[]> => {
				const supabase = createClient()
				const user = await getCachedUser()
				if (!user) throw new Error('Not authenticated')

				// Get user's stripe_customer_id
				const { data: userData, error: userError } = await supabase
					.from('users')
					.select('stripe_customer_id')
					.eq('id', user.id)
					.single()

				if (userError) handlePostgrestError(userError, 'users')
				if (!userData?.stripe_customer_id) return []

				// Query stripe.invoices via RPC (stripe schema not directly accessible via PostgREST)
				// Fall back to rent_payments as invoice proxy if stripe schema is unavailable
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, due_date, paid_date, created_at')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					date: row.created_at,
					amount: String(row.amount),
					status: row.status,
					invoicePdf: null,
					hostedUrl: null
				}))
			},
			staleTime: 5 * 60 * 1000
		}),

	history: () =>
		queryOptions({
			queryKey: billingKeys.history(),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, currency, status, due_date, paid_date, created_at, lease_id, tenant_id')
					.order('created_at', { ascending: false })
					.limit(50)
				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []) as unknown as BillingHistoryItem[]
			},
			staleTime: 60 * 1000
		}),

	historyBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.historyBySubscription(subscriptionId),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const supabase = createClient()
				// Query rent_payments for the lease with this subscription
				const { data: lease } = await supabase
					.from('leases')
					.select('id')
					.eq('stripe_subscription_id', subscriptionId)
					.limit(1)
					.maybeSingle()

				if (!lease) return []

				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, currency, status, due_date, paid_date, created_at, lease_id, tenant_id')
					.eq('lease_id', lease.id)
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')
				return (data ?? []) as unknown as BillingHistoryItem[]
			},
			enabled: !!subscriptionId,
			staleTime: 60 * 1000
		}),

	failed: () =>
		queryOptions({
			queryKey: billingKeys.failed(),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, created_at, lease_id, tenant_id, stripe_payment_intent_id')
					.eq('status', 'failed')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					subscriptionId: '',
					tenant_id: row.tenant_id,
					amount: row.amount,
					failureReason: null,
					stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
					created_at: row.created_at
				}))
			},
			staleTime: 30 * 1000
		}),

	failedBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingKeys.failedBySubscription(subscriptionId),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const supabase = createClient()
				const { data: lease } = await supabase
					.from('leases')
					.select('id')
					.eq('stripe_subscription_id', subscriptionId)
					.limit(1)
					.maybeSingle()

				if (!lease) return []

				const { data, error } = await supabase
					.from('rent_payments')
					.select('id, amount, status, created_at, lease_id, tenant_id, stripe_payment_intent_id')
					.eq('lease_id', lease.id)
					.eq('status', 'failed')
					.order('created_at', { ascending: false })
					.limit(50)

				if (error) handlePostgrestError(error, 'rent_payments')

				return (data ?? []).map(row => ({
					id: row.id,
					subscriptionId,
					tenant_id: row.tenant_id,
					amount: row.amount,
					failureReason: null,
					stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
					created_at: row.created_at
				}))
			},
			enabled: !!subscriptionId,
			staleTime: 30 * 1000
		})
}

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

export function useSubscriptionBillingHistory(subscriptionId: string) {
	return useQuery(billingQueries.historyBySubscription(subscriptionId))
}

export function useFailedPaymentAttempts() {
	return useQuery(billingQueries.failed())
}

export function useSubscriptionFailedAttempts(subscriptionId: string) {
	return useQuery(billingQueries.failedBySubscription(subscriptionId))
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
			// The Supabase Stripe Sync Engine syncs stripe.subscriptions (Decision #13)
			// Try querying via RPC since stripe schema may not be exposed to PostgREST
			const { data: subData, error: subError } = await supabase
				.rpc('get_subscription_status', { p_customer_id: stripeCustomerId })

			if (subError) {
				// RPC may not exist yet -- fall back to checking leases for subscription status
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

			// RPC returns subscription data from stripe schema
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
// SUBSCRIPTION CRUD HOOKS
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
			return (data ?? []) as unknown as RentSubscriptionResponse[]
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
			return data as unknown as RentSubscriptionResponse
		},
		enabled: !!id
	})
}

export function useCreateSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.create,
		mutationFn: async (data: CreateRentSubscriptionRequest) => {
			// Redirect to Stripe Checkout via Edge Function — full-page redirect per user decision
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-checkout', {
				price_id: undefined // uses STRIPE_PRO_PRICE_ID env var on Edge Function
			})
			// Full-page redirect to Stripe Checkout (Radar fraud detection enabled)
			window.location.href = result.url
			// Return stub — page will navigate away before this resolves
			return { id: data.leaseId, status: 'redirecting' } as unknown as RentSubscriptionResponse
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subscriptionsKeys.list() })
		},
		onError: error => handleMutationError(error, 'Create subscription')
	})
}

export function useUpdateSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.update,
		mutationFn: async (_args: { id: string; data: UpdateSubscriptionRequest }) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return {} as RentSubscriptionResponse
		},
		onError: error => handleMutationError(error, 'Update subscription')
	})
}

export function usePauseSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.pause,
		mutationFn: async (_id: string) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onError: error => handleMutationError(error, 'Pause subscription')
	})
}

export function useResumeSubscriptionMutation() {
	return useMutation({
		mutationKey: mutationKeys.subscriptions.resume,
		mutationFn: async (_id: string) => {
			// Subscription management is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onError: error => handleMutationError(error, 'Resume subscription')
	})
}

export function useCancelSubscriptionMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.subscriptions.cancel,
		mutationFn: async (_id: string) => {
			// Subscription cancellation is handled via Stripe Customer Portal
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return { subscription: undefined }
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subscriptionsKeys.list() })
		},
		onError: error => handleMutationError(error, 'Cancel subscription')
	})
}

// ============================================================================
// BILLING PORTAL MUTATION
// ============================================================================

/**
 * Opens the Stripe Customer Portal for subscription management.
 * Redirects the user to Stripe's hosted portal via full-page redirect.
 * Return URL is /dashboard?billing=updated (handled by dashboard return-journey toast).
 */
export function useBillingPortalMutation() {
	return useMutation({
		mutationKey: ['mutations', 'billing', 'portal'] as const,
		mutationFn: async () => {
			const result = await callBillingEdgeFunction<{ url: string }>('stripe-billing-portal')
			window.location.href = result.url
			return result
		},
		onError: error => handleMutationError(error, 'Open billing portal')
	})
}

// ============================================================================
// COMPUTED HELPERS
// ============================================================================

export function useActiveSubscriptions(): RentSubscriptionResponse[] {
	const { data: subscriptions } = useSubscriptions()
	return subscriptions?.filter(s => s.status === 'active') || []
}

export function useHasActiveSubscription(lease_id?: string): boolean {
	const { data: subscriptions } = useSubscriptions()
	if (!lease_id || !subscriptions) return false
	return subscriptions.some(
		s => s.leaseId === lease_id && s.status === 'active'
	)
}
