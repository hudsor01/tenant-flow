/**
 * Billing Hooks & Query Options
 * TanStack Query hooks for billing and invoice management with colocated query options
 *
 * React 19 + TanStack Query v5 patterns
 */

import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Invoice response from Stripe API
 */
export interface StripeInvoice {
	id: string
	amount_paid: number
	status: string
	created: number
	invoice_pdf: string | null
	hosted_invoice_url: string | null
	currency: string
	description: string | null
}

/**
 * Invoices list response
 */
interface InvoicesResponse {
	invoices: StripeInvoice[]
}

/**
 * Formatted invoice for display
 */
export interface FormattedInvoice {
	id: string
	date: string
	amount: string
	status: string
	invoicePdf: string | null
	hostedUrl: string | null
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format cents to currency string
 */
function formatCurrency(amountInCents: number, currency: string): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase()
	}).format(amountInCents / 100)
}

/**
 * Format Unix timestamp to readable date
 */
function formatDate(timestamp: number): string {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	}).format(new Date(timestamp * 1000))
}

/**
 * Map status to display-friendly text
 */
function formatStatus(status: string): string {
	const statusMap: Record<string, string> = {
		paid: 'Paid',
		open: 'Open',
		draft: 'Draft',
		uncollectible: 'Uncollectible',
		void: 'Void'
	}
	return statusMap[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
}

/**
 * Transform Stripe invoice to formatted display invoice
 */
function formatInvoice(invoice: StripeInvoice): FormattedInvoice {
	return {
		id: invoice.id,
		date: formatDate(invoice.created),
		amount: formatCurrency(invoice.amount_paid, invoice.currency),
		status: formatStatus(invoice.status),
		invoicePdf: invoice.invoice_pdf,
		hostedUrl: invoice.hosted_invoice_url
	}
}

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Billing query keys
 */
export const billingKeys = {
	all: ['billing'] as const,
	invoices: () => [...billingKeys.all, 'invoices'] as const
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Billing queries factory
 */
export const billingQueries = {
	/**
	 * List user's invoices from Stripe
	 */
	invoices: () =>
		queryOptions({
			queryKey: billingKeys.invoices(),
			queryFn: async (): Promise<FormattedInvoice[]> => {
				const response = await apiRequest<InvoicesResponse>(
					'/api/v1/stripe/invoices'
				)
				return response.invoices.map(formatInvoice)
			},
			staleTime: 5 * 60 * 1000 // 5 minutes - billing data doesn't change frequently
		})
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch user's billing invoices from Stripe
 */
export function useInvoices() {
	return useQuery(billingQueries.invoices())
}

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Hook for prefetching invoices
 */
export function usePrefetchInvoices() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(billingQueries.invoices())
	}
}
