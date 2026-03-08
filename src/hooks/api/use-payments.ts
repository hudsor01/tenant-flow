/**
 * Payments Query Hooks
 * TanStack Query hooks for payment data fetching
 *
 * Mutation hooks are in use-payment-mutations.ts.
 * Query keys and options are in query-keys/payment-keys.ts.
 *
 * All operations use Supabase PostgREST directly — no apiRequest calls.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { StripeSessionStatusResponse } from '#types/core'
import type { TenantPaymentStatusResponse } from '#types/api-contracts'
import type { SubscriptionData } from '#types/stripe'

import {
	rentCollectionQueries,
	tenantPaymentQueries,
	rentPaymentKeys,
	paymentVerificationKeys
} from './query-keys/payment-keys'

// Re-export keys and query factories for consumers that import from use-payments
export {
	rentCollectionKeys,
	rentPaymentKeys,
	paymentVerificationKeys,
	paymentQueryKeys,
	rentCollectionQueries,
	tenantPaymentQueries
} from './query-keys/payment-keys'

// ============================================================================
// RENT COLLECTION HOOKS
// ============================================================================

/**
 * Get payment analytics
 */
export function usePaymentAnalytics() {
	return useQuery(rentCollectionQueries.analytics())
}

/**
 * Get upcoming payments
 */
export function useUpcomingPayments() {
	return useQuery(rentCollectionQueries.upcoming())
}

/**
 * Get overdue payments
 */
export function useOverduePayments() {
	return useQuery(rentCollectionQueries.overdue())
}

// ============================================================================
// RENT PAYMENT HOOKS
// ============================================================================

/**
 * Get current payment status for a tenant — PostgREST
 */
export function usePaymentStatus(tenant_id: string) {
	return useQuery({
		queryKey: rentPaymentKeys.status(tenant_id),
		queryFn: async (): Promise<TenantPaymentStatusResponse> => {
			const supabase = createClient()
			const today = new Date().toISOString().split('T')[0] as string
			const { data, error } = await supabase
				.from('rent_payments')
				.select('id, amount, status, due_date, paid_date, stripe_payment_intent_id')
				.eq('tenant_id', tenant_id)
				.order('due_date', { ascending: false })
				.limit(1)
				.maybeSingle()
			if (error) handlePostgrestError(error, 'rent_payments')
			if (!data) {
				return {
					status: 'pending',
					rent_amount: 0,
					nextDueDate: null,
					lastPaymentDate: null,
					outstandingBalance: 0,
					isOverdue: false
				}
			}
			const isOverdue =
				data.status !== 'succeeded' && data.due_date < today
			return {
				status: data.status as TenantPaymentStatusResponse['status'],
				rent_amount: data.amount,
				nextDueDate: data.due_date,
				lastPaymentDate: data.paid_date,
				outstandingBalance: data.status === 'succeeded' ? 0 : data.amount,
				isOverdue
			}
		},
		enabled: !!tenant_id,
		...QUERY_CACHE_TIMES.STATS
	})
}

/**
 * Get tenant payment history from owner perspective — PostgREST
 */
export function useOwnerTenantPayments(
	tenant_id: string,
	options?: { limit?: number; enabled?: boolean }
) {
	return useQuery(tenantPaymentQueries.ownerPayments(tenant_id, options))
}

/**
 * Get tenant's own payment history — PostgREST
 */
export function useTenantPaymentsHistory(options?: { limit?: number; enabled?: boolean }) {
	return useQuery(tenantPaymentQueries.selfPayments(options))
}

// ============================================================================
// PAYMENT VERIFICATION HOOKS
// ============================================================================

/**
 * Verify payment session — retrieves Stripe Checkout session status.
 * Used by the /pricing/success page for subscription checkout verification.
 * Returns null subscription when session ID is missing (graceful degradation).
 */
export function usePaymentVerification(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.verifySession(sessionId ?? ''),
		queryFn: async (): Promise<{ subscription: SubscriptionData | null }> => {
			if (!sessionId) return { subscription: null }
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'stripe-checkout-session',
				{ body: { session_id: sessionId } }
			)
			if (error) throw new Error(error.message ?? 'Session verification failed')
			return { subscription: (data as { subscription: SubscriptionData | null })?.subscription ?? null }
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.SECURITY,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}

/**
 * Get Stripe Checkout session status.
 * Used by the /pricing/complete page for subscription checkout completion.
 * Returns null data when session ID is missing.
 */
export function useSessionStatus(
	sessionId: string | null,
	options: { throwOnError?: boolean } = {}
) {
	return useQuery({
		queryKey: paymentVerificationKeys.sessionStatus(sessionId ?? ''),
		queryFn: async (): Promise<StripeSessionStatusResponse> => {
			if (!sessionId) {
				return { status: 'expired', payment_intent_id: null, payment_status: null, payment_intent_status: null } as StripeSessionStatusResponse
			}
			const supabase = createClient()
			const { data, error } = await supabase.functions.invoke(
				'stripe-checkout-session',
				{ body: { session_id: sessionId } }
			)
			if (error) throw new Error(error.message ?? 'Session status check failed')
			return data as StripeSessionStatusResponse
		},
		enabled: !!sessionId,
		...QUERY_CACHE_TIMES.STATS,
		refetchOnReconnect: false,
		refetchOnMount: false,
		throwOnError: options.throwOnError ?? false
	})
}
