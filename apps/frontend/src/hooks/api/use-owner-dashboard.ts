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

import { useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Activity } from '@repo/shared/types/activity'
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
import { ownerDashboardKeys, ownerDashboardQueries } from './queries/owner-dashboard-queries'

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

// ============================================================================
// CRITICAL PATH: Stats (Above-fold, loads first)
// ============================================================================

/**
 * Dashboard stats - CRITICAL PATH
 * Uses useSuspenseQuery for Suspense integration
 * This is the first thing users see - must load fast
 */
export function useDashboardStatsSuspense() {
	return useSuspenseQuery({
		queryKey: ownerDashboardKeys.analytics.stats(),
		queryFn: async (): Promise<DashboardStatsData> => {
			const response = await apiRequest<{
				stats: DashboardStats
				metricTrends?: {
					occupancyRate: MetricTrend | null
					activeTenants: MetricTrend | null
					monthlyRevenue: MetricTrend | null
					openMaintenance: MetricTrend | null
				}
			}>('/api/v1/owner/analytics/stats')

			return {
				stats: response.stats ?? response as unknown as DashboardStats,
				metricTrends: response.metricTrends ?? {
					occupancyRate: null,
					activeTenants: null,
					monthlyRevenue: null,
					openMaintenance: null
				}
			}
		},
		staleTime: 60 * 1000, // 1 minute - stats change frequently
		gcTime: 5 * 60 * 1000
	})
}

/**
 * Dashboard stats - Non-suspense version for conditional rendering
 */
export function useDashboardStats() {
	return useQuery({
		queryKey: ownerDashboardKeys.analytics.stats(),
		queryFn: async (): Promise<DashboardStatsData> => {
			const response = await apiRequest<{
				stats: DashboardStats
				metricTrends?: {
					occupancyRate: MetricTrend | null
					activeTenants: MetricTrend | null
					monthlyRevenue: MetricTrend | null
					openMaintenance: MetricTrend | null
				}
			}>('/api/v1/owner/analytics/stats')

			return {
				stats: response.stats ?? response as unknown as DashboardStats,
				metricTrends: response.metricTrends ?? {
					occupancyRate: null,
					activeTenants: null,
					monthlyRevenue: null,
					openMaintenance: null
				}
			}
		},
		...QUERY_CACHE_TIMES.STATS,
		refetchOnWindowFocus: true
	})
}

// ============================================================================
// DEFERRED: Charts (Below-fold, loads on viewport)
// ============================================================================

/**
 * Dashboard charts - DEFERRED
 * Time series data for occupancy and revenue charts
 */
export function useDashboardChartsSuspense() {
	return useSuspenseQuery({
		queryKey: [...ownerDashboardKeys.analytics.all(), 'charts'],
		queryFn: async (): Promise<DashboardChartsData> => {
			const response = await apiRequest<{
				occupancyTrends: Array<{ month: string; occupancy_rate: number }>
				revenueTrends: Array<{ month: string; revenue: number }>
			}>('/api/v1/owner/analytics/trends')

			return {
				timeSeries: {
					occupancyRate: (response.occupancyTrends ?? []).map(t => ({
						date: t.month,
						value: t.occupancy_rate
					})),
					monthlyRevenue: (response.revenueTrends ?? []).map(t => ({
						date: t.month,
						value: t.revenue
					}))
				}
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - trends don't change often
		gcTime: 10 * 60 * 1000
	})
}

/**
 * Dashboard charts - Non-suspense version
 */
export function useDashboardCharts() {
	return useQuery({
		queryKey: [...ownerDashboardKeys.analytics.all(), 'charts'],
		queryFn: async (): Promise<DashboardChartsData> => {
			const response = await apiRequest<{
				occupancyTrends: Array<{ month: string; occupancy_rate: number }>
				revenueTrends: Array<{ month: string; revenue: number }>
			}>('/api/v1/owner/analytics/trends')

			return {
				timeSeries: {
					occupancyRate: (response.occupancyTrends ?? []).map(t => ({
						date: t.month,
						value: t.occupancy_rate
					})),
					monthlyRevenue: (response.revenueTrends ?? []).map(t => ({
						date: t.month,
						value: t.revenue
					}))
				}
			}
		},
		...QUERY_CACHE_TIMES.DETAIL,
		refetchOnWindowFocus: false
	})
}

// ============================================================================
// DEFERRED: Activity Feed
// ============================================================================

/**
 * Dashboard activity - DEFERRED
 * Recent activity feed
 */
export function useDashboardActivitySuspense() {
	return useSuspenseQuery({
		queryKey: ownerDashboardKeys.analytics.activity(),
		queryFn: async (): Promise<DashboardActivityData> => {
			const response = await apiRequest<{ activities: Activity[] }>(
				'/api/v1/owner/analytics/activity'
			)
			return {
				activities: response.activities ?? []
			}
		},
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 5 * 60 * 1000
	})
}

/**
 * Dashboard activity - Non-suspense version
 */
export function useDashboardActivity() {
	return useQuery({
		queryKey: ownerDashboardKeys.analytics.activity(),
		queryFn: async (): Promise<DashboardActivityData> => {
			const response = await apiRequest<{ activities: Activity[] }>(
				'/api/v1/owner/analytics/activity'
			)
			return {
				activities: response.activities ?? []
			}
		},
		...QUERY_CACHE_TIMES.STATS,
		refetchOnWindowFocus: true
	})
}

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
			const response = await apiRequest<{ success: boolean; data: PropertyPerformance[] }>(
				'/api/v1/owner/properties/performance'
			)
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
			const response = await apiRequest<{ success: boolean; data: PropertyPerformance[] }>(
				'/api/v1/owner/properties/performance'
			)
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

/**
 * Unified dashboard data hook (Legacy)
 * Fetches ALL dashboard data in a SINGLE API request
 * Use individual hooks for React 19.2 progressive loading
 */
export function useOwnerDashboardData() {
	return useQuery<OwnerDashboardData>({
		queryKey: [...ownerDashboardKeys.all, 'unified-dashboard'],
		queryFn: async () => {
			const response = await apiRequest<{
				stats: DashboardStats
				activity: ActivityItem[]
				propertyPerformance: PropertyPerformance[]
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
			}>('/api/v1/owner/analytics/page-data')

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
		},
		...QUERY_CACHE_TIMES.STATS,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
		structuralSharing: true
	})
}

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
		// Prefetch stats (critical)
		queryClient.prefetchQuery({
			queryKey: ownerDashboardKeys.analytics.stats(),
			queryFn: () => apiRequest('/api/v1/owner/analytics/stats'),
			staleTime: 60 * 1000
		})

		// Prefetch charts (deferred)
		queryClient.prefetchQuery({
			queryKey: [...ownerDashboardKeys.analytics.all(), 'charts'],
			queryFn: () => apiRequest('/api/v1/owner/analytics/trends'),
			staleTime: 5 * 60 * 1000
		})

		// Prefetch activity (deferred)
		queryClient.prefetchQuery({
			queryKey: ownerDashboardKeys.analytics.activity(),
			queryFn: () => apiRequest('/api/v1/owner/analytics/activity'),
			staleTime: 2 * 60 * 1000
		})
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
		queryKey: [...ownerDashboardKeys.financial.revenueTrends(currentYear), timeRange, months] as const,
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

// Re-export query keys
export { ownerDashboardKeys } from './queries/owner-dashboard-queries'
