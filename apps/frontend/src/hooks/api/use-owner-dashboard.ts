'use client'

/**
 * Owner Dashboard Hooks
 * 
 * Modern hooks using /owner/* endpoints (replaces legacy /manage/* endpoints)
 * 
 * Architecture:
 * - Role-based access control (OwnerAuthGuard)
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
import { clientFetch } from '#lib/api/client'
import { QUERY_CACHE_TIMES } from '#lib/constants'
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

// ============================================================================
// ANALYTICS HOOKS (/owner/analytics/*)
// ============================================================================

/**
 * Get dashboard statistics
 * Optimized with 2-minute auto-refresh
 */
export function useOwnerDashboardStats() {
	return useQuery({
		queryKey: ownerDashboardKeys.analytics.stats(),
		queryFn: () => clientFetch<DashboardStats>('/api/v1/owner/analytics/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
		refetchIntervalInBackground: false, // Stop when tab inactive
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
	})
}

/**
 * Get dashboard activity feed
 * Optimized with 2-minute auto-refresh
 */
export function useOwnerDashboardActivity() {
	return useQuery({
		queryKey: ownerDashboardKeys.analytics.activity(),
		queryFn: () => clientFetch<{ activities: Activity[] }>('/api/v1/owner/analytics/activity'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		retry: 2,
		retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
	})
}

/**
 * Optimized unified dashboard hook
 * Replaces 5 separate API calls with 1 unified endpoint
 * Expected performance gain: 40-50% faster initial page load
 */
export function useOwnerDashboardPageData() {
	return useQuery({
		queryKey: ownerDashboardKeys.analytics.pageData(),
		queryFn: () => clientFetch<{
			stats: DashboardStats
			activity: ActivityItem[]
		}>('/api/v1/owner/analytics/page-data'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
		refetchIntervalInBackground: false, // Stop when tab inactive
		refetchOnWindowFocus: true,
		retry: 2
	})
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
	const { metric, days = 30 } = options

	return useQuery({
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
}

/**
 * Get trend data for a specific metric
 */
export function useOwnerMetricTrend(
	metric: string,
	period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
	return useQuery({
		queryKey: ownerDashboardKeys.reports.metricTrend(metric, period),
		queryFn: async (): Promise<MetricTrend> => {
			return clientFetch<MetricTrend>(
				`/api/v1/owner/reports/metric-trend?metric=${metric}&period=${period}`
			)
		},
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

// ============================================================================
// PROPERTIES HOOKS (/owner/properties/*)
// ============================================================================

/**
 * Get property performance metrics
 * Returns sorted array (by occupancy rate desc, then units desc)
 */
export function useOwnerPropertyPerformance() {
	return useQuery({
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
}

// ============================================================================
// FINANCIAL HOOKS (/owner/financial/*)
// ============================================================================

/**
 * Get billing insights and revenue analytics
 */
export function useOwnerBillingInsights() {
	return useQuery({
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
	})
}

/**
 * Get revenue trends over time
 */
export function useOwnerRevenueTrends(year: number = new Date().getFullYear()) {
	return useQuery({
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
}

// ============================================================================
// MAINTENANCE HOOKS (/owner/maintenance/*)
// ============================================================================

/**
 * Get maintenance analytics
 */
export function useOwnerMaintenanceAnalytics() {
	return useQuery({
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
}

// ============================================================================
// TENANTS HOOKS (/owner/tenants/*)
// ============================================================================

/**
 * Get occupancy trends and tenant statistics
 */
export function useOwnerOccupancyTrends() {
	return useQuery({
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
			queryFn: () => clientFetch<DashboardStats>('/api/v1/owner/analytics/stats'),
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
			queryFn: () => clientFetch<{ activities: Activity[] }>('/api/v1/owner/analytics/activity'),
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
			queryFn: () => clientFetch<PropertyPerformance[]>('/api/v1/owner/properties/performance'),
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}
