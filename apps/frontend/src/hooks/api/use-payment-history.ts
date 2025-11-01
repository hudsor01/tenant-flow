/**
 * Payment History Hooks
 * Phase 4: Payment History and Failed Payment Attempts
 *
 * TanStack Query hooks for payment history management
 */

import { API_BASE_URL } from '#lib/api-config'
import { useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Query keys for payment history endpoints
 */
export const paymentHistoryKeys = {
	all: ['payment-history'] as const,
	list: () => [...paymentHistoryKeys.all, 'list'] as const,
	bySubscription: (subscriptionId: string) =>
		[...paymentHistoryKeys.all, 'subscription', subscriptionId] as const,
	byTenant: (tenantId: string) =>
		[...paymentHistoryKeys.all, 'tenant', tenantId] as const
}

/**
 * Payment history response interface
 */
export interface PaymentHistoryItem {
	id: string
	subscriptionId: string
	tenantId: string
	amount: number
	currency: string
	status: 'succeeded' | 'failed' | 'pending' | 'canceled'
	stripePaymentIntentId?: string
	description?: string
	metadata?: Record<string, unknown>
	createdAt: string
	updatedAt: string

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
	tenantId: string
	amount: number
	attemptNumber: number
	failureReason: string
	stripePaymentIntentId?: string
	nextRetryDate?: string
	createdAt: string
}

/**
 * List payment history for all subscriptions
 */
export function usePaymentHistory() {
	return useQuery({
		queryKey: paymentHistoryKeys.list(),
		queryFn: async (): Promise<PaymentHistoryItem[]> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/rent-payments/history`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch payment history')
			}
			const response = await res.json() as { payments: PaymentHistoryItem[] }
			return response.payments
		},
		staleTime: 60 * 1000 // 1 minute
	})
}

/**
 * List payment history for a specific subscription
 */
export function useSubscriptionPaymentHistory(subscriptionId: string) {
	return useQuery({
		queryKey: paymentHistoryKeys.bySubscription(subscriptionId),
		queryFn: async (): Promise<PaymentHistoryItem[]> => {
			const res = await fetch(
				`/api/v1/rent-payments/history/subscription/${subscriptionId}`,
				{ credentials: 'include' }
			)
			if (!res.ok) {
				throw new Error('Failed to fetch subscription payment history')
			}
			const response = await res.json() as { payments: PaymentHistoryItem[] }
			return response.payments
		},
		enabled: !!subscriptionId,
		staleTime: 60 * 1000 // 1 minute
	})
}

/**
 * List failed payment attempts for all subscriptions
 */
export function useFailedPaymentAttempts() {
	return useQuery({
		queryKey: [...paymentHistoryKeys.all, 'failed'],
		queryFn: async (): Promise<FailedPaymentAttempt[]> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/rent-payments/failed-attempts`, {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch failed payment attempts')
			}
			const response = await res.json() as { failedAttempts: FailedPaymentAttempt[] }
			return response.failedAttempts
		},
		staleTime: 30 * 1000 // 30 seconds
	})
}

/**
 * List failed payment attempts for a specific subscription
 */
export function useSubscriptionFailedAttempts(subscriptionId: string) {
	return useQuery({
		queryKey: [...paymentHistoryKeys.all, 'failed', subscriptionId],
		queryFn: async (): Promise<FailedPaymentAttempt[]> => {
			const res = await fetch(
				`/api/v1/rent-payments/failed-attempts/subscription/${subscriptionId}`,
				{ credentials: 'include' }
			)
			if (!res.ok) {
				throw new Error('Failed to fetch subscription failed attempts')
			}
			const response = await res.json() as { failedAttempts: FailedPaymentAttempt[] }
			return response.failedAttempts
		},
		enabled: !!subscriptionId,
		staleTime: 30 * 1000 // 30 seconds
	})
}

/**
 * Hook for prefetching payment history
 */
export function usePrefetchPaymentHistory() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: paymentHistoryKeys.list(),
			queryFn: async (): Promise<PaymentHistoryItem[]> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/rent-payments/history`, {
					credentials: 'include'
				})
				if (!res.ok) {
					throw new Error('Failed to fetch payment history')
				}
				const response = await res.json() as { payments: PaymentHistoryItem[] }
				return response.payments
			},
			staleTime: 60 * 1000
		})
	}
}

/**
 * Hook for prefetching subscription payment history
 */
export function usePrefetchSubscriptionPaymentHistory() {
	const queryClient = useQueryClient()

	return (subscriptionId: string) => {
		queryClient.prefetchQuery({
			queryKey: paymentHistoryKeys.bySubscription(subscriptionId),
			queryFn: async (): Promise<PaymentHistoryItem[]> => {
				const res = await fetch(
					`/api/v1/rent-payments/history/subscription/${subscriptionId}`,
					{ credentials: 'include' }
				)
				if (!res.ok) {
					throw new Error('Failed to fetch subscription payment history')
				}
				const response = await res.json() as { payments: PaymentHistoryItem[] }
				return response.payments
			},
			staleTime: 60 * 1000
		})
	}
}
