/**
 * Rent Collection Query Options (TanStack Query v5 Pattern)
 *
 * Uses queryOptions API for type-safe, reusable query configurations.
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { apiRequest, apiRequestRaw } from '#lib/api-request'

/**
 * Rent collection query keys
 */
export const rentCollectionKeys = {
	all: ['rent-collection'] as const,
	analytics: () => [...rentCollectionKeys.all, 'analytics'] as const,
	upcoming: () => [...rentCollectionKeys.all, 'upcoming'] as const,
	overdue: () => [...rentCollectionKeys.all, 'overdue'] as const,
	list: (filters?: PaymentFilters) =>
		[...rentCollectionKeys.all, 'list', filters] as const,
	detail: (id: string) => [...rentCollectionKeys.all, 'detail', id] as const
}

/**
 * Payment Analytics Response
 */
export interface PaymentAnalytics {
	totalCollected: number
	totalPending: number
	totalOverdue: number
	collectionRate: number
	averagePaymentTime: number
	onTimePaymentRate: number
	monthlyTrend: MonthlyPaymentTrend[]
}

export interface MonthlyPaymentTrend {
	month: string
	monthNumber: number
	collected: number
	pending: number
	failed: number
}

/**
 * Upcoming Payment
 */
export interface UpcomingPayment {
	id: string
	tenantId: string
	tenantName: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	autopayEnabled: boolean
	paymentMethodConfigured: boolean
}

/**
 * Overdue Payment
 */
export interface OverduePayment {
	id: string
	tenantId: string
	tenantName: string
	tenantEmail: string
	propertyName: string
	unitNumber: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeAmount: number
	lateFeeApplied: boolean
}

/**
 * Payment Filters
 */
export interface PaymentFilters {
	status?: string
	startDate?: string
	endDate?: string
}

/**
 * Manual Payment Input
 */
export interface ManualPaymentInput {
	lease_id: string
	tenant_id: string
	amount: number
	payment_method: 'cash' | 'check' | 'money_order' | 'other'
	paid_date: string
	notes?: string
}

/**
 * Rent collection queries
 */
export const rentCollectionQueries = {
	/**
	 * Get payment analytics
	 */
	analytics: () =>
		queryOptions({
			queryKey: rentCollectionKeys.analytics(),
			queryFn: async (): Promise<PaymentAnalytics> => {
				const response = await apiRequest<{
					success: boolean
					analytics: PaymentAnalytics
				}>('/api/v1/rent-payments/analytics')
				return response.analytics
			},
			staleTime: 60 * 1000 // 1 minute
		}),

	/**
	 * Get upcoming payments
	 */
	upcoming: () =>
		queryOptions({
			queryKey: rentCollectionKeys.upcoming(),
			queryFn: async (): Promise<UpcomingPayment[]> => {
				const response = await apiRequest<{
					success: boolean
					payments: UpcomingPayment[]
				}>('/api/v1/rent-payments/upcoming')
				return response.payments
			},
			staleTime: 60 * 1000 // 1 minute
		}),

	/**
	 * Get overdue payments
	 */
	overdue: () =>
		queryOptions({
			queryKey: rentCollectionKeys.overdue(),
			queryFn: async (): Promise<OverduePayment[]> => {
				const response = await apiRequest<{
					success: boolean
					payments: OverduePayment[]
				}>('/api/v1/rent-payments/overdue')
				return response.payments
			},
			staleTime: 30 * 1000 // 30 seconds
		})
}

/**
 * Export payments as CSV
 */
export async function exportPaymentsCSV(
	filters?: PaymentFilters
): Promise<Blob> {
	const params = new URLSearchParams()
	if (filters?.status) params.append('status', filters.status)
	if (filters?.startDate) params.append('startDate', filters.startDate)
	if (filters?.endDate) params.append('endDate', filters.endDate)

	const queryString = params.toString()
	const url = `/api/v1/rent-payments/export${queryString ? `?${queryString}` : ''}`

	const response = await apiRequestRaw(url)
	return response.blob()
}

/**
 * Record a manual payment
 */
export async function recordManualPayment(
	data: ManualPaymentInput
): Promise<{ success: boolean; payment: unknown }> {
	return apiRequest<{ success: boolean; payment: unknown }>(
		'/api/v1/rent-payments/manual',
		{
			method: 'POST',
			body: JSON.stringify(data)
		}
	)
}
