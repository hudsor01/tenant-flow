/**
 * Billing History Hooks & Query Options
 * TanStack Query hooks for SaaS subscription billing history with colocated query options
 *
 * Includes:
 * - Subscription payment history
 * - Failed payment attempts
 *
 * Note: This is for SaaS billing (Stripe subscriptions), NOT rent payments.
 * For rent payment history, use use-rent-payments.ts
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Billing history item interface
 */
export interface BillingHistoryItem {
	id: string
	subscriptionId: string
	tenant_id: string
	amount: number
	currency: string
	status: 'succeeded' | 'failed' | 'pending' | 'cancelled'
	stripePaymentIntentId?: string
	description?: string
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string

	// Additional fields for display
	formattedAmount: string
	formattedDate: string
	isSuccessful: boolean
	failureReason?: string
}

/**
 * Failed payment attempts interface
 */
export interface FailedPaymentAttempt {
	id: string
	subscriptionId: string
	tenant_id: string
	amount: number
	attemptNumber: number
	failureReason: string
	stripePaymentIntentId?: string
	nextRetryDate?: string
	created_at: string
}

// Legacy type aliases for backward compatibility
export type PaymentHistoryItem = BillingHistoryItem

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Billing history query keys for cache management
 */
export const billingHistoryKeys = {
	all: ['billing-history'] as const,
	list: () => [...billingHistoryKeys.all, 'list'] as const,
	bySubscription: (subscriptionId: string) =>
		[...billingHistoryKeys.all, 'subscription', subscriptionId] as const,
	byTenant: (tenant_id: string) =>
		[...billingHistoryKeys.all, 'tenants', tenant_id] as const,
	failed: () => [...billingHistoryKeys.all, 'failed'] as const,
	failedBySubscription: (subscriptionId: string) =>
		[...billingHistoryKeys.all, 'failed', subscriptionId] as const
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Billing history query factory
 */
export const billingHistoryQueries = {
	/**
	 * Base key for all billing history queries
	 */
	all: () => ['billing-history'] as const,

	/**
	 * List all billing history
	 */
	list: () =>
		queryOptions({
			queryKey: billingHistoryKeys.list(),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const response = await apiRequest<{ payments: BillingHistoryItem[] }>(
					'/api/v1/rent-payments/history'
				)
				return response.payments
			},
			staleTime: 60 * 1000 // 1 minute
		}),

	/**
	 * List billing history for a specific subscription
	 */
	bySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingHistoryKeys.bySubscription(subscriptionId),
			queryFn: async (): Promise<BillingHistoryItem[]> => {
				const response = await apiRequest<{ payments: BillingHistoryItem[] }>(
					`/api/v1/rent-payments/history/subscription/${subscriptionId}`
				)
				return response.payments
			},
			enabled: !!subscriptionId,
			staleTime: 60 * 1000 // 1 minute
		}),

	/**
	 * List failed payment attempts for all subscriptions
	 */
	failed: () =>
		queryOptions({
			queryKey: billingHistoryKeys.failed(),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const response = await apiRequest<{
					failedAttempts: FailedPaymentAttempt[]
				}>('/api/v1/rent-payments/failed-attempts')
				return response.failedAttempts
			},
			staleTime: 30 * 1000 // 30 seconds
		}),

	/**
	 * List failed payment attempts for a specific subscription
	 */
	failedBySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: billingHistoryKeys.failedBySubscription(subscriptionId),
			queryFn: async (): Promise<FailedPaymentAttempt[]> => {
				const response = await apiRequest<{
					failedAttempts: FailedPaymentAttempt[]
				}>(
					`/api/v1/rent-payments/failed-attempts/subscription/${subscriptionId}`
				)
				return response.failedAttempts
			},
			enabled: !!subscriptionId,
			staleTime: 30 * 1000 // 30 seconds
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

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

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

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
