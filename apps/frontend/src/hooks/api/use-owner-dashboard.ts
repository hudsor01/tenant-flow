'use client'

/**
 * Owner Dashboard Hooks & Query Options
 * TanStack Query hooks for owner dashboard with colocated query options
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
 *
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useSuspenseQuery,
	useQueryClient
} from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { Activity } from '@repo/shared/types/activity'
import type {
	DashboardStats,
	ActivityItem,
	PropertyPerformance,
	FinancialMetrics
} from '@repo/shared/types/core'
import type { MetricTrend, TimeSeriesDataPoint } from '@repo/shared/types/analytics'
import type { DashboardTimeSeriesOptions } from '@repo/shared/types/stats'

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Hierarchical query keys for owner dashboard
 * Enables targeted cache invalidation
 */
export const ownerDashboardKeys = {
	all: ['owner-dashboard'] as const,

	// Analytics endpoints (/owner/analytics/*)
	analytics: {
		all: () => [...ownerDashboardKeys.all, 'analytics'] as const,
		stats: () => [...ownerDashboardKeys.analytics.all(), 'stats'] as const,
		activity: () =>
			[...ownerDashboardKeys.analytics.all(), 'activity'] as const,
		pageData: () =>
			[...ownerDashboardKeys.analytics.all(), 'page-data'] as const
	},

	// Reports endpoints (/owner/reports/*)
	reports: {
		all: () => [...ownerDashboardKeys.all, 'reports'] as const,
		timeSeries: (metric: string, days: number) =>
			[
				...ownerDashboardKeys.reports.all(),
				'time-series',
				metric,
				days
			] as const,
		metricTrend: (metric: string, period: string) =>
			[
				...ownerDashboardKeys.reports.all(),
				'metric-trend',
				metric,
				period
			] as const
	},

	// Properties endpoints (/owner/properties/*)
	properties: {
		all: () => [...ownerDashboardKeys.all, 'properties'] as const,
		performance: () =>
			[...ownerDashboardKeys.properties.all(), 'performance'] as const
	},

	// Financial endpoints (/owner/financial/*)
	financial: {
		all: () => [...ownerDashboardKeys.all, 'financial'] as const,
		billingInsights: () =>
			[...ownerDashboardKeys.financial.all(), 'billing-insights'] as const,
		revenueTrends: (year: number) =>
			[...ownerDashboardKeys.financial.all(), 'revenue-trends', year] as const
	},

	// Maintenance endpoints (/owner/maintenance/*)
	maintenance: {
		all: () => [...ownerDashboardKeys.all, 'maintenance'] as const,
		analytics: () =>
			[...ownerDashboardKeys.maintenance.all(), 'analytics'] as const
	},

	// Tenants endpoints (/owner/tenants/*)
	tenants: {
		all: () => [...ownerDashboardKeys.all, 'tenants'] as const,
		occupancyTrends: () =>
			[...ownerDashboardKeys.tenants.all(), 'occupancy-trends'] as const
	}
}

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Owner dashboard query factory
 */
export const ownerDashboardQueries = {
	/**
	 * Analytics queries (/owner/analytics/*)
	 */
	analytics: {
		/**
		 * Dashboard statistics
		 * Primary: SSE push via 'dashboard.stats_updated' event
		 * Fallback: 2 min polling to catch missed events
		 */
		stats: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.stats(),
				queryFn: () =>
					apiRequest<DashboardStats>('/api/v1/owner/analytics/stats'),
				...QUERY_CACHE_TIMES.STATS,
				refetchInterval: 2 * 60 * 1000, // Fallback: 2 min polling (SSE is primary)
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true // Catch missed events on tab focus
			}),

		/**
		 * Dashboard activity feed
		 * Primary: SSE push via 'dashboard.stats_updated' event
		 * Fallback: 2 min polling to catch missed events
		 */
		activity: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.activity(),
				queryFn: () =>
					apiRequest<{ activities: Activity[] }>(
						'/api/v1/owner/analytics/activity'
					),
				...QUERY_CACHE_TIMES.STATS,
				refetchInterval: 2 * 60 * 1000, // Fallback: 2 min polling (SSE is primary)
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true // Catch missed events on tab focus
			}),

		/**
		 * Unified dashboard page data
		 * Primary: SSE push via 'dashboard.stats_updated' event
		 * Fallback: 2 min polling to catch missed events
		 */
		pageData: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.pageData(),
				queryFn: () =>
					apiRequest<{
						stats: DashboardStats
						activity: ActivityItem[]
					}>('/api/v1/owner/analytics/page-data'),
				...QUERY_CACHE_TIMES.STATS,
				refetchInterval: 2 * 60 * 1000, // Fallback: 2 min polling (SSE is primary)
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true // Catch missed events on tab focus
			})
	},

	/**
	 * Reports queries (/owner/reports/*)
	 */
	reports: {
		/**
		 * Time series data for charts
		 */
		timeSeries: (options: DashboardTimeSeriesOptions) => {
			const { metric, days = 30 } = options

			return queryOptions({
				queryKey: ownerDashboardKeys.reports.timeSeries(metric, days),
				queryFn: async (): Promise<TimeSeriesDataPoint[]> => {
					const data = await apiRequest<TimeSeriesDataPoint[]>(
						`/api/v1/owner/reports/time-series?metric=${metric}&days=${days}`
					)
					return data ?? []
				},
				...QUERY_CACHE_TIMES.DETAIL,
				gcTime: 10 * 60 * 1000 // 10 minutes
			})
		},

		/**
		 * Trend data for a specific metric
		 */
		metricTrend: (
			metric: string,
			period: 'day' | 'week' | 'month' | 'year' = 'month'
		) =>
			queryOptions({
				queryKey: ownerDashboardKeys.reports.metricTrend(metric, period),
				queryFn: () =>
					apiRequest<MetricTrend>(
						`/api/v1/owner/reports/metric-trend?metric=${metric}&period=${period}`
					),
				...QUERY_CACHE_TIMES.DETAIL,
				gcTime: 10 * 60 * 1000 // 10 minutes
			})
	},

	/**
	 * Properties queries (/owner/properties/*)
	 */
	properties: {
		/**
		 * Property performance metrics
		 * Uses DETAIL cache (5 min staleTime) - no interval needed for detail views
		 */
		performance: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.properties.performance(),
				queryFn: () =>
					apiRequest<PropertyPerformance[]>(
						'/api/v1/owner/properties/performance'
					),
				...QUERY_CACHE_TIMES.DETAIL,
				// No refetchInterval - data doesn't change frequently
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Financial queries (/owner/financial/*)
	 */
	financial: {
		/**
		 * Billing insights and revenue analytics
		 * Uses ANALYTICS cache (15 min staleTime) - financial data changes infrequently
		 */
		billingInsights: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.billingInsights(),
				queryFn: () =>
					apiRequest<{
						totalRevenue: number
						monthlyRevenue: number
						outstandingBalance: number
						paidInvoices: number
						unpaidInvoices: number
					}>('/api/v1/owner/financial/billing/insights'),
				...QUERY_CACHE_TIMES.ANALYTICS,
				refetchOnWindowFocus: false
			}),

		/**
		 * Revenue trends over time
		 * Uses ANALYTICS cache (15 min staleTime) - historical data rarely changes
		 */
		revenueTrends: (year: number = new Date().getFullYear()) =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.revenueTrends(year),
				queryFn: () =>
					apiRequest<FinancialMetrics[]>(
						`/api/v1/owner/financial/revenue-trends?year=${year}`
					),
				...QUERY_CACHE_TIMES.ANALYTICS,
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Maintenance queries (/owner/maintenance/*)
	 */
	maintenance: {
		/**
		 * Maintenance analytics
		 * Uses STATS cache (1 min staleTime) with 5 min interval - maintenance changes more frequently
		 */
		analytics: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.maintenance.analytics(),
				queryFn: () =>
					apiRequest<{
						totalRequests: number
						openRequests: number
						inProgressRequests: number
						completedRequests: number
						averageResolutionTime: number
						urgentRequests: number
					}>('/api/v1/owner/maintenance/analytics'),
				...QUERY_CACHE_TIMES.STATS,
				refetchInterval: 2 * 60 * 1000, // 2 min refresh for maintenance updates
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Tenants queries (/owner/tenants/*)
	 */
	tenants: {
		/**
		 * Occupancy trends and tenant statistics
		 * Uses LIST cache (10 min staleTime) - tenant data changes infrequently
		 */
		occupancyTrends: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.tenants.occupancyTrends(),
				queryFn: () =>
					apiRequest<{
						totalTenants: number
						activeTenants: number
						occupancyRate: number
						averageLeaseLength: number
						expiringLeases: number
					}>('/api/v1/owner/tenants/occupancy-trends'),
				...QUERY_CACHE_TIMES.LIST,
				refetchOnWindowFocus: false
			})
	}
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
	}>('/api/v1/owner/analytics/dashboard')

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
	structuralSharing: true
} as const

// Ensure unified data exists in cache and return it
const ensureDashboardData = (queryClient: ReturnType<typeof useQueryClient>) =>
	queryClient.ensureQueryData<OwnerDashboardData>(DASHBOARD_BASE_QUERY_OPTIONS)

// ============================================================================
// QUERY HOOKS
// ============================================================================

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
// REPORTS HOOKS
// ============================================================================

/**
 * Get time series data for charts
 */
export function useOwnerTimeSeries(options: DashboardTimeSeriesOptions) {
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
		structuralSharing: true
	})
}
