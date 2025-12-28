/**
 * Payment History Query Options (TanStack Query v5 Pattern)
 *
 * Uses queryOptions API for type-safe, reusable query configurations.
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

/**
 * Payment history query keys
 */
export const paymentHistoryKeys = {
	all: ['payment-history'] as const,
	list: () => [...paymentHistoryKeys.all, 'list'] as const,
	bySubscription: (subscriptionId: string) =>
		[...paymentHistoryKeys.all, 'subscription', subscriptionId] as const,
	byTenant: (tenant_id: string) =>
		[...paymentHistoryKeys.all, 'tenants', tenant_id] as const,
	failed: () => [...paymentHistoryKeys.all, 'failed'] as const,
	failedBySubscription: (subscriptionId: string) =>
		[...paymentHistoryKeys.all, 'failed', subscriptionId] as const
}

/**
 * Payment history response interface
 */
export interface PaymentHistoryItem {
	id: string
	subscriptionId: string
	tenant_id: string
	amount: number
	currency: string
	status: 'succeeded' | 'failed' | 'pending' | 'canceled'
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

/**
 * Payment history queries
 */
export const paymentHistoryQueries = {
	/**
	 * List all payment history
	 */
	list: () =>
		queryOptions({
			queryKey: paymentHistoryKeys.list(),
			queryFn: async (): Promise<PaymentHistoryItem[]> => {
				const response = await apiRequest<{ payments: PaymentHistoryItem[] }>(
					'/api/v1/rent-payments/history'
				)
				return response.payments
			},
			staleTime: 60 * 1000 // 1 minute
		}),

	/**
	 * List payment history for a specific subscription
	 */
	bySubscription: (subscriptionId: string) =>
		queryOptions({
			queryKey: paymentHistoryKeys.bySubscription(subscriptionId),
			queryFn: async (): Promise<PaymentHistoryItem[]> => {
				const response = await apiRequest<{ payments: PaymentHistoryItem[] }>(
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
			queryKey: paymentHistoryKeys.failed(),
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
			queryKey: paymentHistoryKeys.failedBySubscription(subscriptionId),
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
