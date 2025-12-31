/**
 * Billing Hooks
 * TanStack Query hooks for billing and invoice management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { billingQueries } from './queries/billing-queries'

/**
 * Fetch user's billing invoices from Stripe
 */
export function useInvoices() {
	return useQuery(billingQueries.invoices())
}

/**
 * Hook for prefetching invoices
 */
export function usePrefetchInvoices() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(billingQueries.invoices())
	}
}
