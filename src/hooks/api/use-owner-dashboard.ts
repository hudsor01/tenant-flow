'use client'

/**
 * Owner Dashboard Keys, Options & Fetcher.
 * Derived hooks in use-dashboard-hooks.ts.
 */

import { queryOptions, useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { ActivityItem } from '#types/activity'
import type { PropertyPerformance } from '#types/core'
import type { DashboardStats } from '#types/stats'
import type { MetricTrend, TimeSeriesDataPoint } from '#types/analytics'
import { revenueTrendsQuery, occupancyTrendsQuery } from './query-keys/analytics-keys'

/** Hierarchical query keys for owner dashboard — enables targeted cache invalidation */
export const ownerDashboardKeys = {
	all: ['owner-dashboard'] as const,

	// Analytics section
	analytics: {
		all: () => [...ownerDashboardKeys.all, 'analytics'] as const,
		stats: () => [...ownerDashboardKeys.analytics.all(), 'stats'] as const,
		activity: () =>
			[...ownerDashboardKeys.analytics.all(), 'activity'] as const,
		pageData: () =>
			[...ownerDashboardKeys.analytics.all(), 'page-data'] as const
	},

	// Properties section
	properties: {
		all: () => [...ownerDashboardKeys.all, 'properties'] as const,
		performance: () =>
			[...ownerDashboardKeys.properties.all(), 'performance'] as const
	},

	// Financial section
	financial: {
		all: () => [...ownerDashboardKeys.all, 'financial'] as const,
		billingInsights: () =>
			[...ownerDashboardKeys.financial.all(), 'billing-insights'] as const,
		revenueTrends: (year: number) =>
			[...ownerDashboardKeys.financial.all(), 'revenue-trends', year] as const
	},

	// Maintenance section
	maintenance: {
		all: () => [...ownerDashboardKeys.all, 'maintenance'] as const,
		analytics: () =>
			[...ownerDashboardKeys.maintenance.all(), 'analytics'] as const
	},

	// Tenants section
	tenants: {
		all: () => [...ownerDashboardKeys.all, 'tenants'] as const,
		occupancyTrends: () =>
			[...ownerDashboardKeys.tenants.all(), 'occupancy-trends'] as const
	}
}

/** Owner dashboard query factory */
export const ownerDashboardQueries = {
	/** Analytics — all dashboard data via unified get_dashboard_data_v2 */
	analytics: {
		pageData: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.pageData(),
				queryFn: fetchOwnerDashboardData,
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			})
	},

	/** Financial queries (separate RPCs) */
	financial: {
		billingInsights: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.billingInsights(),
				queryFn: async () => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc('get_billing_insights', {
						owner_id_param: user.id
					})
					if (error) handlePostgrestError(error, 'analytics')
					return data as {
						totalRevenue: number
						monthlyRevenue: number
						outstandingBalance: number
						paidInvoices: number
						unpaidInvoices: number
					}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			}),

		revenueTrends: (_year: number = new Date().getFullYear()) =>
			revenueTrendsQuery({ months: 12 })
	},

	maintenance: {
		analytics: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.maintenance.analytics(),
				queryFn: async () => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_maintenance_analytics',
						{
							user_id: user.id
						}
					)
					if (error) handlePostgrestError(error, 'analytics')
					return data as {
						totalRequests: number
						openRequests: number
						inProgressRequests: number
						completedRequests: number
						averageResolutionTime: number
						urgentRequests: number
					}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000
			})
	},

	tenants: {
		occupancyTrends: () => occupancyTrendsQuery({ months: 12 })
	}
}

// Types exported for use-dashboard-hooks.ts
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

export type OwnerDashboardData = {
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

// Fetcher for unified dashboard payload — single RPC call
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
	const supabase = createClient()
	const user = await getCachedUser()
	if (!user) throw new Error('Not authenticated')

	const { data, error } = await supabase.rpc('get_dashboard_data_v2', {
		p_user_id: user.id
	})

	if (error) handlePostgrestError(error, 'analytics')

	if (
		!data ||
		typeof data !== 'object' ||
		!('stats' in data) ||
		!('trends' in data) ||
		!('time_series' in data)
	) {
		throw new Error(
			'Dashboard RPC returned unexpected shape — verify get_dashboard_data_v2 is deployed'
		)
	}

	const result = data as {
		stats: DashboardStats
		trends: Record<string, MetricTrend>
		time_series: Record<string, TimeSeriesDataPoint[]>
		property_performance: PropertyPerformance[]
		activities: ActivityItem[]
	}

	return {
		stats: result.stats,
		activity: result.activities ?? [],
		metricTrends: {
			occupancyRate: result.trends?.occupancy_rate ?? null,
			activeTenants: result.trends?.active_tenants ?? null,
			monthlyRevenue: result.trends?.monthly_revenue ?? null,
			openMaintenance: result.trends?.open_maintenance ?? null
		},
		timeSeries: {
			occupancyRate: result.time_series?.occupancy_rate ?? [],
			monthlyRevenue: result.time_series?.monthly_revenue ?? []
		},
		propertyPerformance: result.property_performance ?? []
	}
}

export const DASHBOARD_BASE_QUERY_OPTIONS = {
	queryKey: ownerDashboardKeys.analytics.pageData(),
	queryFn: fetchOwnerDashboardData,
	staleTime: 2 * 60 * 1000,
	gcTime: 10 * 60 * 1000,
	refetchIntervalInBackground: false,
	structuralSharing: true
} as const

export function useOwnerDashboardData() {
	return useQuery<OwnerDashboardData>(DASHBOARD_BASE_QUERY_OPTIONS)
}
