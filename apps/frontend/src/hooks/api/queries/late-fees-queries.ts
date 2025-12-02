/**
 * Late Fees Query Options
 * Phase 6.1: Late Fee System
 *
 * TanStack Query options for late fee management
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { clientFetch } from '#lib/api/client'

/**
 * Late fee types
 */
export interface LateFeeConfig {
	lease_id: string
	gracePeriodDays: number
	flatFeeAmount: number | null
	percentageFee: number | null
	maxFeeAmount: number | null
}

export interface OverduePayment {
	id: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeApplied: boolean
}

export interface ProcessLateFeesResult {
	processed: number
	totalLateFees: number
	details: Array<{
		paymentId: string
		late_fee_amount: number
		daysOverdue: number
	}>
}

export interface ApplyLateFeeResult {
	invoiceItemId: string
	amount: number
	paymentId: string
}

/**
 * Late fees query factory
 */
export const lateFeesQueries = {
	/**
	 * Base key for all late fee queries
	 */
	all: () => ['late-fees'] as const,

	/**
	 * Late fee configuration for a lease
	 */
	config: (lease_id: string) =>
		queryOptions({
			queryKey: [...lateFeesQueries.all(), 'config', lease_id],
			queryFn: () => clientFetch<LateFeeConfig>(`/api/v1/late-fees/lease/${lease_id}/config`),
			enabled: !!lease_id,
			...QUERY_CACHE_TIMES.DETAIL
		}),

	/**
	 * Overdue payments for a lease
	 */
	overdue: (lease_id: string) =>
		queryOptions({
			queryKey: [...lateFeesQueries.all(), 'overdue', lease_id],
			queryFn: () =>
				clientFetch<{ payments: OverduePayment[]; gracePeriod: number }>(
					`/api/v1/late-fees/lease/${lease_id}/overdue`
				),
			enabled: !!lease_id,
			staleTime: 60 * 1000 // 1 minute
		})
}

/**
 * Late fees query keys for cache management
 */
export const lateFeesKeys = {
	all: lateFeesQueries.all(),
	config: (lease_id: string) => [...lateFeesQueries.all(), 'config', lease_id],
	overdue: (lease_id: string) => [...lateFeesQueries.all(), 'overdue', lease_id]
}