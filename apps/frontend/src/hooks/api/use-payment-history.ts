/**
 * Payment History Hooks
 * Phase 4: Payment History and Failed Payment Attempts
 *
 * TanStack Query hooks for payment history management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentHistoryQueries } from './queries/payment-history-queries'

// Re-export types for backward compatibility
export type {
	PaymentHistoryItem,
	FailedPaymentAttempt
} from './queries/payment-history-queries'

/**
 * List payment history for all subscriptions
 */
export function usePaymentHistory() {
	return useQuery(paymentHistoryQueries.list())
}

/**
 * List payment history for a specific subscription
 */
export function useSubscriptionPaymentHistory(subscriptionId: string) {
	return useQuery(paymentHistoryQueries.bySubscription(subscriptionId))
}

/**
 * List failed payment attempts for all subscriptions
 */
export function useFailedPaymentAttempts() {
	return useQuery(paymentHistoryQueries.failed())
}

/**
 * List failed payment attempts for a specific subscription
 */
export function useSubscriptionFailedAttempts(subscriptionId: string) {
	return useQuery(paymentHistoryQueries.failedBySubscription(subscriptionId))
}

/**
 * Hook for prefetching payment history
 */
export function usePrefetchPaymentHistory() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(paymentHistoryQueries.list())
	}
}

/**
 * Hook for prefetching subscription payment history
 */
export function usePrefetchSubscriptionPaymentHistory() {
	const queryClient = useQueryClient()

	return (subscriptionId: string) => {
		queryClient.prefetchQuery(
			paymentHistoryQueries.bySubscription(subscriptionId)
		)
	}
}

/**
 * Hook for prefetching failed payment attempts
 */
export function usePrefetchFailedPaymentAttempts() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(paymentHistoryQueries.failed())
	}
}

/**
 * Hook for prefetching subscription failed attempts
 */
export function usePrefetchSubscriptionFailedAttempts() {
	const queryClient = useQueryClient()

	return (subscriptionId: string) => {
		queryClient.prefetchQuery(
			paymentHistoryQueries.failedBySubscription(subscriptionId)
		)
	}
}
