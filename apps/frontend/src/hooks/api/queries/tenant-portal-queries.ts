/**
 * Tenant Portal Query Options (TanStack Query v5 Pattern)
 *
 * Queries for tenant portal data fetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

/**
 * Amount due response type
 */
export interface AmountDueResponse {
	base_rent_cents: number
	late_fee_cents: number
	total_due_cents: number
	due_date: string
	days_late: number
	grace_period_days: number
	already_paid: boolean
	breakdown: Array<{
		description: string
		amount_cents: number
	}>
}

/**
 * Pay rent request type
 */
export interface PayRentRequest {
	payment_method_id: string
	amount_cents: number
}

/**
 * Pay rent response type
 */
export interface PayRentResponse {
	success: boolean
	payment_id: string
	status: string
	message: string
}

/**
 * Tenant portal query factory
 */
export const tenantPortalQueries = {
	/**
	 * Base key for all tenant portal queries
	 */
	all: () => ['tenant-portal'] as const,

	/**
	 * Dashboard data
	 */
	dashboard: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'dashboard'],
			queryFn: () => clientFetch('/api/v1/tenant-portal/dashboard'),
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Amount due for current period
	 */
	amountDue: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'amount-due'],
			queryFn: () => clientFetch<AmountDueResponse>('/api/v1/tenant-portal/amount-due'),
			...QUERY_CACHE_TIMES.STATS,
			refetchInterval: 60000, // Refetch every minute to stay current
		}),

	/**
	 * Payment history
	 */
	payments: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'payments'],
			queryFn: () => clientFetch('/api/v1/tenant-portal/payments'),
			...QUERY_CACHE_TIMES.DETAIL,
		}),

	/**
	 * Active lease
	 */
	lease: () =>
		queryOptions({
			queryKey: [...tenantPortalQueries.all(), 'lease'],
			queryFn: () => clientFetch('/api/v1/tenant-portal/lease'),
			...QUERY_CACHE_TIMES.DETAIL,
		}),
}
