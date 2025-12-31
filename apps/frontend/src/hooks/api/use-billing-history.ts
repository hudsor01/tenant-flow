/**
 * Billing History Hooks
 *
 * TanStack Query hooks for SaaS subscription billing history:
 * - Subscription payment history
 * - Failed payment attempts
 *
 * Note: This is for SaaS billing (Stripe subscriptions), NOT rent payments.
 * For rent payment history, use use-rent-payments.ts
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { billingHistoryQueries } from './queries/billing-history-queries'

// Re-export types for backward compatibility
export type {
	BillingHistoryItem,
	FailedPaymentAttempt
} from './queries/billing-history-queries'

/**
 * List billing history for all subscriptions
 */
export function useBillingHistory() {
	return useQuery(billingHistoryQueries.list())
}

/**
 * List billing history for a specific subscription
 */
export function useSubscriptionBillingHistory(subscriptionId: string) {
	return useQuery(billingHistoryQueries.bySubscription(subscriptionId))
}

/**
 * List failed payment attempts for all subscriptions
 */
export function useFailedPaymentAttempts() {
	return useQuery(billingHistoryQueries.failed())
}

/**
 * List failed payment attempts for a specific subscription
 */
export function useSubscriptionFailedAttempts(subscriptionId: string) {
	return useQuery(billingHistoryQueries.failedBySubscription(subscriptionId))
}

/**
 * Hook for prefetching billing history
 */
export function usePrefetchBillingHistory() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(billingHistoryQueries.list())
	}
}

/**
 * Hook for prefetching subscription billing history
 */
export function usePrefetchSubscriptionBillingHistory() {
	const queryClient = useQueryClient()

	return (subscriptionId: string) => {
		queryClient.prefetchQuery(
			billingHistoryQueries.bySubscription(subscriptionId)
		)
	}
}

/**
 * Hook for prefetching failed payment attempts
 */
export function usePrefetchFailedPaymentAttempts() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(billingHistoryQueries.failed())
	}
}

/**
 * Hook for prefetching subscription failed attempts
 */
export function usePrefetchSubscriptionFailedAttempts() {
	const queryClient = useQueryClient()

	return (subscriptionId: string) => {
		queryClient.prefetchQuery(
			billingHistoryQueries.failedBySubscription(subscriptionId)
		)
	}
}

// Legacy aliases for backward compatibility during migration
export {
	useBillingHistory as usePaymentHistory,
	useSubscriptionBillingHistory as useSubscriptionPaymentHistory
}
