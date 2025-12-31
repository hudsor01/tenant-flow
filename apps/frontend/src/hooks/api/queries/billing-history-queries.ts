/**
 * Billing History Query Options (TanStack Query v5 Pattern)
 *
 * Uses queryOptions API for type-safe, reusable query configurations.
 * Note: This is for SaaS subscription billing, NOT rent payments.
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

/**
 * Billing history query keys
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

/**
 * Billing history item interface
 */
export interface BillingHistoryItem {
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
 * Billing history queries
 */
export const billingHistoryQueries = {
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

// Legacy type aliases for backward compatibility
export type PaymentHistoryItem = BillingHistoryItem
