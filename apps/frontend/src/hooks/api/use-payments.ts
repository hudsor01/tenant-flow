/**
 * Payment Hooks
 *
 * TanStack Query hooks for payment management including:
 * - Payment analytics
 * - Upcoming payments
 * - Overdue payments
 * - Manual payment recording
 * - CSV export
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	paymentQueries,
	paymentKeys,
	exportPaymentsCSV,
	recordManualPayment,
	type PaymentFilters,
	type ManualPaymentInput
} from './queries/payment-queries'

// Re-export types
export type {
	PaymentAnalytics,
	MonthlyPaymentTrend,
	UpcomingPayment,
	OverduePayment,
	PaymentFilters,
	ManualPaymentInput
} from './queries/payment-queries'

/**
 * Get payment analytics
 */
export function usePaymentAnalytics() {
	return useQuery(paymentQueries.analytics())
}

/**
 * Get upcoming payments
 */
export function useUpcomingPayments() {
	return useQuery(paymentQueries.upcoming())
}

/**
 * Get overdue payments
 */
export function useOverduePayments() {
	return useQuery(paymentQueries.overdue())
}

/**
 * Record a manual payment
 */
export function useRecordManualPayment() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: ManualPaymentInput) => recordManualPayment(data),
		onSuccess: () => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: paymentKeys.all })
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

/**
 * Prefetch payment analytics
 */
export function usePrefetchPaymentAnalytics() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(paymentQueries.analytics())
	}
}

/**
 * Prefetch upcoming payments
 */
export function usePrefetchUpcomingPayments() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(paymentQueries.upcoming())
	}
}

/**
 * Prefetch overdue payments
 */
export function usePrefetchOverduePayments() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(paymentQueries.overdue())
	}
}
