'use client'

/**
 * Performance-first dashboard hooks.
 *
 * This file is now a thin compatibility layer that forwards legacy
 * `use-dashboard` imports to the optimized owner dashboard hooks. All
 * legacy /manage endpoints have been removed to avoid duplicate traffic.
 * Prefer importing directly from `#hooks/api/use-owner-dashboard` in new code.
 */

import { useQuery } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { FinancialMetrics } from '@repo/shared/types/core'
import {
	ownerDashboardKeys,
	useOwnerDashboardActivity,
	useOwnerDashboardPageData,
	useOwnerDashboardStats,
	useOwnerPropertyPerformance,
	usePrefetchOwnerDashboardActivity,
	usePrefetchOwnerDashboardStats,
	usePrefetchOwnerPropertyPerformance
} from '#hooks/api/use-owner-dashboard'

export interface FinancialChartDatum {
	date: string
	revenue: number
	expenses: number
	profit: number
}

export type FinancialTimeRange = '7d' | '30d' | '6m' | '1y'

// Re-export owner dashboard query keys for backward compatibility and add a
// financialChart key used by the revenue/expense chart hook.
export const dashboardKeys = {
	...ownerDashboardKeys,
	financialChart: (timeRange: FinancialTimeRange) =>
		['dashboard', 'financial-chart', timeRange] as const
}

// ---------------------------------------------------------------------------
// Backwards-compatible wrappers (forward to owner hooks)
// ---------------------------------------------------------------------------

export const useDashboardStats = useOwnerDashboardStats
export const useDashboardActivity = useOwnerDashboardActivity
export const useDashboardPageDataUnified = useOwnerDashboardPageData
// Alias for older name used in a few components
export const useDashboardPageData = useOwnerDashboardPageData
export const usePropertyPerformance = useOwnerPropertyPerformance

export const usePrefetchDashboardStats = usePrefetchOwnerDashboardStats
export const usePrefetchDashboardActivity = usePrefetchOwnerDashboardActivity
export const usePrefetchPropertyPerformance = usePrefetchOwnerPropertyPerformance

// ---------------------------------------------------------------------------
// Financial chart (revenue vs expenses)
// ---------------------------------------------------------------------------

const timeRangeToMonths: Record<FinancialTimeRange, number> = {
	'7d': 1,
	'30d': 1,
	'6m': 6,
	'1y': 12
}

/**
 * Revenue/expense chart data fetched from the financial analytics endpoint.
 * Uses server-calculated revenue/expense/netIncome so the chart reflects
 * actual expenses instead of placeholders.
 */
export function useFinancialChartData(timeRange: FinancialTimeRange = '6m') {
	const months = timeRangeToMonths[timeRange] ?? 6
	const currentYear = new Date().getFullYear()

	return useQuery<FinancialChartDatum[]>({
		queryKey: [...dashboardKeys.financialChart(timeRange), currentYear, months] as const,
		queryFn: async () => {
			const data = await clientFetch<FinancialMetrics[]>(
				`/api/v1/financial/analytics/revenue-trends?year=${currentYear}`
			)

			if (!Array.isArray(data) || data.length === 0) return []

			// Keep UX consistent with the previous time-range selector by
			// trimming to the most recent N months when the caller requests
			// shorter ranges (7d/30d map to 1 month of aggregated data).
			const trimmed = data
				.sort((a, b) => a.period.localeCompare(b.period))
				.slice(-months)

			return trimmed.map(item => ({
				date: item.period,
				revenue: item.revenue ?? 0,
				expenses: item.expenses ?? 0,
				profit: item.netIncome ?? (item.revenue ?? 0) - (item.expenses ?? 0)
			}))
		},
		...QUERY_CACHE_TIMES.ANALYTICS,
		refetchInterval: 5 * 60 * 1000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
		structuralSharing: true
	})
}
