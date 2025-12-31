/**
 * Rent Collection Hooks
 *
 * TanStack Query hooks for owner rent collection management including:
 * - Payment analytics
 * - Upcoming payments
 * - Overdue payments
 * - Manual payment recording
 * - CSV export
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
	rentCollectionQueries,
	rentCollectionKeys,
	exportPaymentsCSV,
	recordManualPayment,
	type PaymentFilters,
	type ManualPaymentInput
} from './queries/rent-collection-queries'

// Note: Import rent collection types directly from './queries/rent-collection-queries'
// No re-exports per CLAUDE.md rules

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
