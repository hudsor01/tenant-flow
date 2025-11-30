/**
 * Owner Dashboard Query Options (TanStack Query v5 Pattern)
 *
 * Single source of truth for owner dashboard-related queries.
 * Reusable across components, server components, and prefetching.
 */

import { queryOptions } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
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
		activity: () => [...ownerDashboardKeys.analytics.all(), 'activity'] as const,
		pageData: () => [...ownerDashboardKeys.analytics.all(), 'page-data'] as const
	},

	// Reports endpoints (/owner/reports/*)
	reports: {
		all: () => [...ownerDashboardKeys.all, 'reports'] as const,
		timeSeries: (metric: string, days: number) =>
			[...ownerDashboardKeys.reports.all(), 'time-series', metric, days] as const,
		metricTrend: (metric: string, period: string) =>
			[...ownerDashboardKeys.reports.all(), 'metric-trend', metric, period] as const
	},

	// Properties endpoints (/owner/properties/*)
	properties: {
		all: () => [...ownerDashboardKeys.all, 'properties'] as const,
		performance: () => [...ownerDashboardKeys.properties.all(), 'performance'] as const
	},

	// Financial endpoints (/owner/financial/*)
	financial: {
		all: () => [...ownerDashboardKeys.all, 'financial'] as const,
		billingInsights: () => [...ownerDashboardKeys.financial.all(), 'billing-insights'] as const,
		revenueTrends: (year: number) => [...ownerDashboardKeys.financial.all(), 'revenue-trends', year] as const
	},

	// Maintenance endpoints (/owner/maintenance/*)
	maintenance: {
		all: () => [...ownerDashboardKeys.all, 'maintenance'] as const,
		analytics: () => [...ownerDashboardKeys.maintenance.all(), 'analytics'] as const
	},

	// Tenants endpoints (/owner/tenants/*)
	tenants: {
		all: () => [...ownerDashboardKeys.all, 'tenants'] as const,
		occupancyTrends: () => [...ownerDashboardKeys.tenants.all(), 'occupancy-trends'] as const
	}
}

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
		 */
		stats: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.stats(),
				queryFn: () => clientFetch<DashboardStats>('/api/v1/owner/analytics/stats'),
				...QUERY_CACHE_TIMES.SECURITY,
				refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				refetchOnMount: true,
				retry: 2,
				retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
			}),

		/**
		 * Dashboard activity feed
		 */
		activity: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.activity(),
				queryFn: () => clientFetch<{ activities: Activity[] }>('/api/v1/owner/analytics/activity'),
				...QUERY_CACHE_TIMES.SECURITY,
				refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				refetchOnMount: true,
				retry: 2,
				retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
			}),

		/**
		 * Unified dashboard page data
		 */
		pageData: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.pageData(),
				queryFn: () => clientFetch<{
					stats: DashboardStats
					activity: ActivityItem[]
				}>('/api/v1/owner/analytics/page-data'),
				...QUERY_CACHE_TIMES.SECURITY,
				refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				retry: 2
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
					const data = await clientFetch<TimeSeriesDataPoint[]>(
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
		metricTrend: (metric: string, period: 'day' | 'week' | 'month' | 'year' = 'month') =>
			queryOptions({
				queryKey: ownerDashboardKeys.reports.metricTrend(metric, period),
				queryFn: async (): Promise<MetricTrend> => {
					return clientFetch<MetricTrend>(
						`/api/v1/owner/reports/metric-trend?metric=${metric}&period=${period}`
					)
				},
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
		 */
		performance: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.properties.performance(),
				queryFn: () => clientFetch<PropertyPerformance[]>('/api/v1/owner/properties/performance'),
				...QUERY_CACHE_TIMES.DETAIL,
				refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				refetchOnMount: true,
				retry: 2,
				retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
			})
	},

	/**
	 * Financial queries (/owner/financial/*)
	 */
	financial: {
		/**
		 * Billing insights and revenue analytics
		 */
		billingInsights: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.billingInsights(),
				queryFn: () => clientFetch<{
					totalRevenue: number
					monthlyRevenue: number
					outstandingBalance: number
					paidInvoices: number
					unpaidInvoices: number
				}>('/api/v1/owner/financial/billing/insights'),
				...QUERY_CACHE_TIMES.DETAIL,
				refetchInterval: 5 * 60 * 1000,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				retry: 2
			}),

		/**
		 * Revenue trends over time
		 */
		revenueTrends: (year: number = new Date().getFullYear()) =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.revenueTrends(year),
				queryFn: () => clientFetch<FinancialMetrics[]>(
					`/api/v1/owner/financial/revenue-trends?year=${year}`
				),
				...QUERY_CACHE_TIMES.DETAIL,
				refetchInterval: 5 * 60 * 1000,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				retry: 2
			})
	},

	/**
	 * Maintenance queries (/owner/maintenance/*)
	 */
	maintenance: {
		/**
		 * Maintenance analytics
		 */
		analytics: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.maintenance.analytics(),
				queryFn: () => clientFetch<{
					totalRequests: number
					openRequests: number
					inProgressRequests: number
					completedRequests: number
					averageResolutionTime: number
					urgentRequests: number
				}>('/api/v1/owner/maintenance/analytics'),
				...QUERY_CACHE_TIMES.DETAIL,
				refetchInterval: 5 * 60 * 1000,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				retry: 2
			})
	},

	/**
	 * Tenants queries (/owner/tenants/*)
	 */
	tenants: {
		/**
		 * Occupancy trends and tenant statistics
		 */
		occupancyTrends: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.tenants.occupancyTrends(),
				queryFn: () => clientFetch<{
					totalTenants: number
					activeTenants: number
					occupancyRate: number
					averageLeaseLength: number
					expiringLeases: number
				}>('/api/v1/owner/tenants/occupancy-trends'),
				...QUERY_CACHE_TIMES.DETAIL,
				refetchInterval: 5 * 60 * 1000,
				refetchIntervalInBackground: false,
				refetchOnWindowFocus: true,
				retry: 2
			})
	}
}
