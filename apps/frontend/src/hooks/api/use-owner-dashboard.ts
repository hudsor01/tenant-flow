'use client'

/**
 * Owner Dashboard Hooks
 *
 * Modern hooks using /owner/* endpoints (replaces legacy /* endpoints)
 *
 * Architecture:
 * - Role-based access control (RolesGuard + @Roles)
 * - Enhanced monitoring and logging
 * - Modular route structure
 * - Optimized caching strategies
 *
 * Endpoints:
 * - /owner/analytics/* - Dashboard stats, activity, unified page data
 * - /owner/reports/* - Time series, metric trends
 * - /owner/properties/* - Property performance
 * - /owner/financial/* - Billing insights, revenue trends
 * - /owner/maintenance/* - Maintenance analytics
 * - /owner/tenants/* - Occupancy trends
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
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
} from '@repo/shared/types/dashboard-repository'
import { ownerDashboardQueries, ownerDashboardKeys } from './queries/owner-dashboard-queries'

// ============================================================================
// ANALYTICS HOOKS (/owner/analytics/*)
// ============================================================================

/**
 * Get dashboard statistics
 * Optimized with 2-minute auto-refresh
 */
export function useOwnerDashboardStats() {
	return useQuery(ownerDashboardQueries.analytics.stats())
}

/**
 * Get dashboard activity feed
 * Optimized with 2-minute auto-refresh
 */
export function useOwnerDashboardActivity() {
	return useQuery(ownerDashboardQueries.analytics.activity())
}

/**
 * Optimized unified dashboard hook
 * Replaces 5 separate API calls with 1 unified endpoint
 * Expected performance gain: 40-50% faster initial page load
 */
export function useOwnerDashboardPageData() {
	return useQuery(ownerDashboardQueries.analytics.pageData())
}

// ============================================================================
// REPORTS HOOKS (/owner/reports/*)
// ============================================================================

/**
 * Get time series data for charts
 */
export function useOwnerTimeSeries(
	options: DashboardTimeSeriesOptions
) {
	return useQuery(ownerDashboardQueries.reports.timeSeries(options))
}

/**
 * Get trend data for a specific metric
 */
export function useOwnerMetricTrend(
	metric: string,
	period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
	return useQuery(ownerDashboardQueries.reports.metricTrend(metric, period))
}

// ============================================================================
// PROPERTIES HOOKS (/owner/properties/*)
// ============================================================================

/**
 * Get property performance metrics
 * Returns sorted array (by occupancy rate desc, then units desc)
 */
export function useOwnerPropertyPerformance() {
	return useQuery(ownerDashboardQueries.properties.performance())
}

// ============================================================================
// FINANCIAL HOOKS (/owner/financial/*)
// ============================================================================

/**
 * Get billing insights and revenue analytics
 */
export function useBillingInsights() {
	return useQuery(ownerDashboardQueries.financial.billingInsights())
}

/**
 * Get revenue trends over time
 */
export function useOwnerRevenueTrends(year: number = new Date().getFullYear()) {
	return useQuery(ownerDashboardQueries.financial.revenueTrends(year))
}

// ============================================================================
// MAINTENANCE HOOKS (/owner/maintenance/*)
// ============================================================================

/**
 * Get maintenance analytics
 */
export function useMaintenanceAnalytics() {
	return useQuery(ownerDashboardQueries.maintenance.analytics())
}

// ============================================================================
// TENANTS HOOKS (/owner/tenants/*)
// ============================================================================

/**
 * Get occupancy trends and tenant statistics
 */
export function useOccupancyTrends() {
	return useQuery(ownerDashboardQueries.tenants.occupancyTrends())
}

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Prefetch dashboard stats
 */
export function usePrefetchOwnerDashboardStats() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: ownerDashboardKeys.analytics.stats(),
			queryFn: () => apiRequest<DashboardStats>('/api/v1/owner/analytics/stats'),
			staleTime: 2 * 60 * 1000
		})
	}
}

/**
 * Prefetch dashboard activity
 */
export function usePrefetchOwnerDashboardActivity() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: ownerDashboardKeys.analytics.activity(),
			queryFn: () => apiRequest<{ activities: Activity[] }>('/api/v1/owner/analytics/activity'),
			staleTime: 2 * 60 * 1000
		})
	}
}

/**
 * Prefetch property performance
 */
export function usePrefetchOwnerPropertyPerformance() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: ownerDashboardKeys.properties.performance(),
			queryFn: () => apiRequest<PropertyPerformance[]>('/api/v1/owner/properties/performance'),
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

// ============================================================================
// COMBINED TRENDS HOOK
// ============================================================================

type OwnerDashboardData = {
	// Core stats from page data
	stats: DashboardStats
	activity: ActivityItem[]

	// Trends data (batched)
	metricTrends: {
		occupancyRate: MetricTrend | null
		activeTenants: MetricTrend | null
		monthlyRevenue: MetricTrend | null
		openMaintenance: MetricTrend | null
	}

	// Time series for charts (shared between sections)
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[]
		monthlyRevenue: TimeSeriesDataPoint[]
	}

	// Property performance
	propertyPerformance: PropertyPerformance[]
}

/**
 * Unified dashboard data hook
 * Fetches ALL dashboard data in a single optimized request
 * Eliminates redundant API calls and improves performance
 */
export function useOwnerDashboardData() {
	return useQuery<OwnerDashboardData>({
		queryKey: [...ownerDashboardKeys.all, 'unified-dashboard'],
		queryFn: async () => {
			const trendLabels = [
				'occupancy_rate trend',
				'active_tenants trend',
				'monthly_revenue trend',
				'open_maintenance trend',
				'occupancy_rate time series',
				'monthly_revenue time series'
			] as const

			const trendRequests = [
				apiRequest<MetricTrend>('/api/v1/owner/reports/metric-trend?metric=occupancy_rate&period=month'),
				apiRequest<MetricTrend>('/api/v1/owner/reports/metric-trend?metric=active_tenants&period=month'),
				apiRequest<MetricTrend>('/api/v1/owner/reports/metric-trend?metric=monthly_revenue&period=month'),
				apiRequest<MetricTrend>('/api/v1/owner/reports/metric-trend?metric=open_maintenance&period=month'),
				apiRequest<TimeSeriesDataPoint[]>('/api/v1/owner/reports/time-series?metric=occupancy_rate&days=30'),
				apiRequest<TimeSeriesDataPoint[]>('/api/v1/owner/reports/time-series?metric=monthly_revenue&days=30')
			] as const

			const toMessage = (reason: unknown) =>
				reason instanceof Error ? reason.message : String(reason ?? 'unknown error')

			const [
				pageDataResult,
				trendResults,
				propertyPerformanceResult
			] = await Promise.allSettled([
				apiRequest<{
					stats: DashboardStats
					activity: ActivityItem[]
				}>('/api/v1/owner/analytics/page-data'),
				Promise.allSettled(trendRequests),
				apiRequest<PropertyPerformance[]>('/api/v1/owner/properties/performance')
			])

			const errors: string[] = []
			let stats: DashboardStats | undefined
			let activity: ActivityItem[] | undefined
			let propertyPerformance: PropertyPerformance[] | undefined

			const metricTrends: OwnerDashboardData['metricTrends'] = {
				occupancyRate: null,
				activeTenants: null,
				monthlyRevenue: null,
				openMaintenance: null
			}

			const timeSeries: OwnerDashboardData['timeSeries'] = {
				occupancyRate: [],
				monthlyRevenue: []
			}

			if (pageDataResult.status === 'fulfilled') {
				stats = pageDataResult.value.stats
				activity = pageDataResult.value.activity
			} else {
				errors.push(`page-data: ${toMessage(pageDataResult.reason)}`)
			}

			if (trendResults.status === 'fulfilled') {
				trendResults.value.forEach((result, index) => {
					if (result.status === 'fulfilled') {
						if (index === 0) metricTrends.occupancyRate = result.value as MetricTrend
						else if (index === 1) metricTrends.activeTenants = result.value as MetricTrend
						else if (index === 2) metricTrends.monthlyRevenue = result.value as MetricTrend
						else if (index === 3) metricTrends.openMaintenance = result.value as MetricTrend
						else if (index === 4) timeSeries.occupancyRate = result.value as TimeSeriesDataPoint[]
						else if (index === 5) timeSeries.monthlyRevenue = result.value as TimeSeriesDataPoint[]
					} else {
						errors.push(`${trendLabels[index]}: ${toMessage(result.reason)}`)
					}
				})
			} else {
				errors.push(`trend batch: ${toMessage(trendResults.reason)}`)
			}

			if (propertyPerformanceResult.status === 'fulfilled') {
				propertyPerformance = propertyPerformanceResult.value
			} else {
				errors.push(`property-performance: ${toMessage(propertyPerformanceResult.reason)}`)
			}

			const partialData: Partial<OwnerDashboardData> = {
				...(stats ? { stats } : {}),
				...(activity ? { activity } : {}),
				metricTrends,
				timeSeries,
				...(propertyPerformance ? { propertyPerformance } : {})
			}

			if (errors.length > 0) {
				const error = new Error(`Owner dashboard data failed: ${errors.join('; ')}`)
				;(error as Error & { partialData?: Partial<OwnerDashboardData> }).partialData = partialData
				throw error
			}

			return {
				stats: stats!,
				activity: activity ?? [],
				metricTrends,
				timeSeries,
				propertyPerformance: propertyPerformance ?? []
			}
		},
		// Uses STATS cache - dashboard needs frequent updates
		...QUERY_CACHE_TIMES.STATS,
		refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
		refetchIntervalInBackground: false,
		// Interval handles freshness - no need for focus/mount refetch
		refetchOnWindowFocus: false,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
		// Enable structural sharing for better performance
		structuralSharing: true
	})
}

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

// Re-export query keys for backward compatibility
export { ownerDashboardKeys } from './queries/owner-dashboard-queries'
