/**
 * Rent Collection Hooks & Query Options
 * TanStack Query hooks for owner rent collection management with colocated query options
 *
 * Includes:
 * - Payment analytics
 * - Upcoming payments
 * - Overdue payments
 * - Manual payment recording
 * - CSV export
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useMutation,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest, apiRequestRaw } from '#lib/api-request'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Rent collection query keys for cache management
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

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Rent collection query factory
 */
export const rentCollectionQueries = {
	/**
	 * Base key for all rent collection queries
	 */
	all: () => ['rent-collection'] as const,

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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

// ============================================================================
// QUERY HOOKS
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
// MUTATION HOOKS
// ============================================================================

/**
 * Record a manual payment
 */
export function useRecordManualPayment() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: ManualPaymentInput) => recordManualPayment(data),
		onSuccess: () => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: rentCollectionKeys.all })
		}
	})
}

/**
 * Export payments as CSV
 */
export function useExportPayments() {
	return useMutation({
		mutationFn: async (filters?: PaymentFilters) => {
			const blob = await exportPaymentsCSV(filters)

			// Create download link
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)

			return blob
		}
	})
}

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Prefetch payment analytics
 */
export function usePrefetchPaymentAnalytics() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(rentCollectionQueries.analytics())
	}
}

/**
 * Prefetch upcoming payments
 */
export function usePrefetchUpcomingPayments() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(rentCollectionQueries.upcoming())
	}
}

/**
 * Prefetch overdue payments
 */
export function usePrefetchOverduePayments() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(rentCollectionQueries.overdue())
	}
}
