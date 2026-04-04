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

import {
	billingQueries,
	subscriptionQueries
} from './query-keys/billing-keys'

// Re-export keys and types for consumers that import from use-billing
export { billingKeys, subscriptionsKeys, billingQueries, subscriptionQueries } from './query-keys/billing-keys'
export type { FormattedInvoice } from './query-keys/billing-keys'

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
	return useQuery(billingQueries.subscriptionStatus(options))
}

// ============================================================================
// SUBSCRIPTION QUERY HOOKS
// ============================================================================

export function useSubscriptions() {
	return useQuery(subscriptionQueries.list())
}

export function useSubscription(id: string) {
	return useQuery(subscriptionQueries.detail(id))
}

