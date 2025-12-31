'use client'

/**
 * Owner Dashboard Hooks - React 19.2 Optimized
 *
 * Architecture:
 * - Independent hooks for each dashboard section
 * - Enables progressive loading with Activity + Suspense
 * - Each section fetches only when needed (viewport-aware)
 *
 * Endpoints:
 * - /owner/analytics/stats - Critical stats (above-fold, loads first)
 * - /owner/analytics/activity - Activity feed (deferred)
 * - /owner/properties/performance - Property table (deferred)
 * - /owner/analytics/trends - Charts data (deferred)
 */

import {
	useQuery,
	useSuspenseQuery,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
// Activity type not required in unified fetch; use ActivityItem from core
import type {
	DashboardStats,
	ActivityItem,
	PropertyPerformance,
	FinancialMetrics
} from '@repo/shared/types/core'
import type {
	MetricTrend,
	TimeSeriesDataPoint,
	DashboardTimeSeriesOptions
} from '@repo/shared/types/stats'
import {
	ownerDashboardKeys,
	ownerDashboardQueries
} from './queries/owner-dashboard-queries'

// Unified dashboard query key (single source of truth)
const DASHBOARD_QUERY_KEY = ownerDashboardKeys.analytics.pageData()

// Fetcher for unified dashboard payload
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
	const response = await apiRequest<{
		stats: DashboardStats
		activity: ActivityItem[]
		metricTrends?: {
			occupancyRate: MetricTrend | null
			activeTenants: MetricTrend | null
			monthlyRevenue: MetricTrend | null
			openMaintenance: MetricTrend | null
		}
		timeSeries?: {
			occupancyRate: TimeSeriesDataPoint[]
			monthlyRevenue: TimeSeriesDataPoint[]
		}
		propertyPerformance?: PropertyPerformance[]
	}>("/api/v1/owner/analytics/dashboard")

	return {
		stats: response.stats,
		activity: response.activity ?? [],
		metricTrends: response.metricTrends ?? {
			occupancyRate: null,
			activeTenants: null,
			monthlyRevenue: null,
			openMaintenance: null
		},
		timeSeries: response.timeSeries ?? {
			occupancyRate: [],
			monthlyRevenue: []
		},
		propertyPerformance: response.propertyPerformance ?? []
	}
}

// Base query options reused across hooks
const DASHBOARD_BASE_QUERY_OPTIONS = {
	queryKey: DASHBOARD_QUERY_KEY,
	queryFn: fetchOwnerDashboardData,
	...QUERY_CACHE_TIMES.STATS,
	refetchIntervalInBackground: false,
	refetchOnWindowFocus: false,
	retry: 2,
	retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
	structuralSharing: true
} as const

// Ensure unified data exists in cache and return it
const ensureDashboardData = (queryClient: ReturnType<typeof useQueryClient>) =>
	queryClient.ensureQueryData<OwnerDashboardData>(DASHBOARD_BASE_QUERY_OPTIONS)

// Unified hook to get full dashboard data (for SSR or rare full-load cases)
export function useOwnerDashboardData() {
	return useQuery<OwnerDashboardData>(DASHBOARD_BASE_QUERY_OPTIONS)
}

// Stats hooks (derive from unified payload)
export function useDashboardStatsSuspense() {
	const queryClient = useQueryClient()
	return useSuspenseQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.analytics.stats(),
		queryFn: async (): Promise<DashboardStatsData> => {
			const data = await ensureDashboardData(queryClient)
			return { stats: data.stats, metricTrends: data.metricTrends }
		},
		staleTime: QUERY_CACHE_TIMES.STATS.staleTime,
		gcTime: QUERY_CACHE_TIMES.STATS.gcTime
	})
}

export function useDashboardStats() {
	const queryClient = useQueryClient()
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.analytics.stats(),
		queryFn: async (): Promise<DashboardStatsData> => {
			const data = await ensureDashboardData(queryClient)
			return { stats: data.stats, metricTrends: data.metricTrends }
		},
		staleTime: QUERY_CACHE_TIMES.STATS.staleTime,
		gcTime: QUERY_CACHE_TIMES.STATS.gcTime,
		refetchOnWindowFocus: false
	})
}

// Charts hooks (deferred)
export function useDashboardChartsSuspense() {
	const queryClient = useQueryClient()
	return useSuspenseQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: [...ownerDashboardKeys.analytics.all(), 'charts'],
		queryFn: async (): Promise<DashboardChartsData> => {
			const data = await ensureDashboardData(queryClient)
			return { timeSeries: data.timeSeries }
		},
		staleTime: QUERY_CACHE_TIMES.DETAIL.staleTime,
		gcTime: QUERY_CACHE_TIMES.DETAIL.gcTime
	})
}

export function useDashboardCharts() {
	const queryClient = useQueryClient()
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: [...ownerDashboardKeys.analytics.all(), 'charts'],
		queryFn: async (): Promise<DashboardChartsData> => {
			const data = await ensureDashboardData(queryClient)
			return { timeSeries: data.timeSeries }
		},
		staleTime: QUERY_CACHE_TIMES.DETAIL.staleTime,
		gcTime: QUERY_CACHE_TIMES.DETAIL.gcTime,
		refetchOnWindowFocus: false
	})
}

// Activity hooks (deferred)
export function useDashboardActivitySuspense() {
	const queryClient = useQueryClient()
	return useSuspenseQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.analytics.activity(),
		queryFn: async (): Promise<DashboardActivityData> => {
			const data = await ensureDashboardData(queryClient)
			return { activities: data.activity }
		},
		staleTime: QUERY_CACHE_TIMES.STATS.staleTime,
		gcTime: QUERY_CACHE_TIMES.STATS.gcTime
	})
}

export function useDashboardActivity() {
	const queryClient = useQueryClient()
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.analytics.activity(),
		queryFn: async (): Promise<DashboardActivityData> => {
			const data = await ensureDashboardData(queryClient)
			return { activities: data.activity }
		},
		staleTime: QUERY_CACHE_TIMES.STATS.staleTime,
		gcTime: QUERY_CACHE_TIMES.STATS.gcTime,
		refetchOnWindowFocus: false
	})
}
// ============================================================================
// TYPES
// ============================================================================

export interface DashboardStatsData {
	stats: DashboardStats
	metricTrends: {
		occupancyRate: MetricTrend | null
		activeTenants: MetricTrend | null
		monthlyRevenue: MetricTrend | null
		openMaintenance: MetricTrend | null
	}
}

export interface DashboardChartsData {
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[]
		monthlyRevenue: TimeSeriesDataPoint[]
	}
}

export interface DashboardActivityData {
	activities: ActivityItem[]
}

// (legacy direct stats hooks removed; unified hooks defined below)

// (legacy direct charts hooks removed; unified hooks defined below)

// (legacy direct activity hooks removed; unified hooks defined below)

// ============================================================================
// DEFERRED: Property Performance
// ============================================================================

/**
 * Property performance - DEFERRED
 * Table of property metrics
 */
export function usePropertyPerformanceSuspense() {
	return useSuspenseQuery({
		queryKey: ownerDashboardKeys.properties.performance(),
		queryFn: async () => {
			const response = await apiRequest<{
				success: boolean
				data: PropertyPerformance[]
			}>('/api/v1/owner/properties/performance')
			return response.data ?? []
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * Property performance - Non-suspense version
 */
export function usePropertyPerformance() {
	return useQuery({
		queryKey: ownerDashboardKeys.properties.performance(),
		queryFn: async () => {
			const response = await apiRequest<{
				success: boolean
				data: PropertyPerformance[]
			}>('/api/v1/owner/properties/performance')
			return response.data ?? []
		},
		...QUERY_CACHE_TIMES.DETAIL,
		refetchOnWindowFocus: false
	})
}

// ============================================================================
// UNIFIED: Full Dashboard Data (Legacy support)
// ============================================================================

type OwnerDashboardData = {
	stats: DashboardStats
	activity: ActivityItem[]
	metricTrends: {
		occupancyRate: MetricTrend | null
		activeTenants: MetricTrend | null
		monthlyRevenue: MetricTrend | null
		openMaintenance: MetricTrend | null
	}
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[]
		monthlyRevenue: TimeSeriesDataPoint[]
	}
	propertyPerformance: PropertyPerformance[]
}

// unified hook implementation declared above; keep type only here

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Prefetch all dashboard data sections
 * Call on hover or route prefetch
 */
export function usePrefetchDashboard() {
	const queryClient = useQueryClient()

	return () => {
		// Prefetch unified dashboard payload (rest derives from this)
		queryClient.prefetchQuery(DASHBOARD_BASE_QUERY_OPTIONS)
	}
}

// ============================================================================
// REPORTS HOOKS (Legacy compatibility)
// ============================================================================

/**
 * Get time series data for charts
 * Re-exports for backward compatibility with use-dashboard-trends.ts
 */
export function useOwnerTimeSeries(options: DashboardTimeSeriesOptions) {
	return useQuery(ownerDashboardQueries.reports.timeSeries(options))
}

/**
 * Get trend data for a specific metric
 * Re-exports for backward compatibility with use-dashboard-trends.ts
 */
export function useOwnerMetricTrend(
	metric: string,
	period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
	return useQuery(ownerDashboardQueries.reports.metricTrend(metric, period))
}

// ============================================================================
// FINANCIAL HOOKS (Revenue/Expense Charts)
// ============================================================================

export interface FinancialChartDatum {
	date: string
	revenue: number
	expenses: number
	profit: number
}

export type FinancialTimeRange = '7d' | '30d' | '6m' | '1y'

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
		queryKey: [
			...ownerDashboardKeys.financial.revenueTrends(currentYear),
			timeRange,
			months
		] as const,
		queryFn: async () => {
			const data = await apiRequest<FinancialMetrics[]>(
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
		// Financial/analytics data changes infrequently - no interval needed
		...QUERY_CACHE_TIMES.ANALYTICS,
		refetchOnWindowFocus: false,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
		structuralSharing: true
	})
}
