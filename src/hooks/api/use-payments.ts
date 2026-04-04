/**
 * Payments Query Hooks
 * TanStack Query hooks for payment data fetching
 *
 * Mutation hooks are in use-payment-mutations.ts.
 * Query keys and options are in query-keys/payment-keys.ts and query-keys/payment-verification-keys.ts.
 *
 * All operations use Supabase PostgREST directly — no apiRequest calls.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery } from '@tanstack/react-query'

import {
	rentCollectionQueries,
	tenantPaymentQueries
} from './query-keys/payment-keys'
import { paymentStatusQueries } from './query-keys/payment-verification-keys'

// Re-export keys and query factories for consumers that import from use-payments
export {
	rentCollectionKeys,
	rentPaymentKeys,
	rentCollectionQueries,
	tenantPaymentQueries
} from './query-keys/payment-keys'
export {
	paymentVerificationKeys,
	paymentStatusQueries
} from './query-keys/payment-verification-keys'

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
	return useQuery(paymentStatusQueries.status(tenant_id))
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
	return useQuery(paymentStatusQueries.verifySession(sessionId, options))
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
	return useQuery(paymentStatusQueries.sessionStatus(sessionId, options))
}
