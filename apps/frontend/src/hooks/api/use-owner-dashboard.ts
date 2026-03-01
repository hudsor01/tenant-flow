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
 * React 19 + TanStack Query v5 patterns
 */

import {
	queryOptions,
	useQuery,
	useSuspenseQuery,
	useQueryClient
} from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { ActivityItem } from '@repo/shared/types/activity'
import type {
	PropertyPerformance,
	FinancialMetrics
} from '@repo/shared/types/core'
import type { DashboardStats } from '@repo/shared/types/stats'
import type { MetricTrend, TimeSeriesDataPoint } from '@repo/shared/types/analytics'

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Hierarchical query keys for owner dashboard
 * Enables targeted cache invalidation
 */
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

// ============================================================================
// QUERY OPTIONS (for direct use in pages with useQueries/prefetch)
// ============================================================================

/**
 * Owner dashboard query factory
 */
export const ownerDashboardQueries = {
	/**
	 * Analytics — all dashboard data via unified get_dashboard_data_v2
	 */
	analytics: {
		pageData: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.analytics.pageData(),
				queryFn: fetchOwnerDashboardData,
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Financial queries (separate RPCs — not consolidated into v2)
	 */
	financial: {
		/**
		 * Billing insights and revenue analytics
		 */
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
				gcTime: 10 * 60 * 1000,
				refetchOnWindowFocus: false
			}),

		/**
		 * Revenue trends over time
		 */
		revenueTrends: (year: number = new Date().getFullYear()) =>
			queryOptions({
				queryKey: ownerDashboardKeys.financial.revenueTrends(year),
				queryFn: async () => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_revenue_trends_optimized',
						{
							p_user_id: user.id,
							p_months: 12
						}
					)
					if (error) handlePostgrestError(error, 'analytics')
					return (data ?? []) as FinancialMetrics[]
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Maintenance queries
	 */
	maintenance: {
		/**
		 * Maintenance analytics
		 */
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
				gcTime: 10 * 60 * 1000,
				refetchOnWindowFocus: false
			})
	},

	/**
	 * Tenants queries
	 */
	tenants: {
		/**
		 * Occupancy trends and tenant statistics
		 */
		occupancyTrends: () =>
			queryOptions({
				queryKey: ownerDashboardKeys.tenants.occupancyTrends(),
				queryFn: async () => {
					const supabase = createClient()
					const user = await getCachedUser()
					if (!user) throw new Error('Not authenticated')
					const { data, error } = await supabase.rpc(
						'get_occupancy_trends_optimized',
						{
							p_user_id: user.id,
							p_months: 12
						}
					)
					if (error) handlePostgrestError(error, 'analytics')
					return data as {
						totalTenants: number
						activeTenants: number
						occupancyRate: number
						averageLeaseLength: number
						expiringLeases: number
					}
				},
				staleTime: 2 * 60 * 1000,
				gcTime: 10 * 60 * 1000,
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

// Fetcher for unified dashboard payload — single RPC call
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
	const supabase = createClient()
	const user = await getCachedUser()
	if (!user) throw new Error('Not authenticated')

	const { data, error } = await supabase.rpc('get_dashboard_data_v2', {
		p_user_id: user.id
	})

	if (error) handlePostgrestError(error, 'analytics')

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

// Base query options reused across hooks
const DASHBOARD_BASE_QUERY_OPTIONS = {
	queryKey: DASHBOARD_QUERY_KEY,
	queryFn: fetchOwnerDashboardData,
	staleTime: 2 * 60 * 1000,
	gcTime: 10 * 60 * 1000,
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
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
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})
}

// ============================================================================
// DEFERRED: Property Performance
// ============================================================================

/**
 * Property performance — derives from unified dashboard cache
 */
export function usePropertyPerformanceSuspense() {
	const queryClient = useQueryClient()
	return useSuspenseQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.properties.performance(),
		queryFn: async (): Promise<PropertyPerformance[]> => {
			const data = await ensureDashboardData(queryClient)
			return data.propertyPerformance
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000
	})
}

/**
 * Property performance — derives from unified dashboard cache
 */
export function usePropertyPerformance() {
	const queryClient = useQueryClient()
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryClient is stable
		queryKey: ownerDashboardKeys.properties.performance(),
		queryFn: async (): Promise<PropertyPerformance[]> => {
			const data = await ensureDashboardData(queryClient)
			return data.propertyPerformance
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})
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
 * Revenue/expense chart data fetched from the financial analytics RPC.
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
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase.rpc(
				'get_revenue_trends_optimized',
				{
					p_user_id: user.id,
					p_months: 12
				}
			)
			if (error) handlePostgrestError(error, 'analytics')

			if (!Array.isArray(data) || data.length === 0) return []

			const trimmed = (data as FinancialMetrics[])
				.sort((a, b) => a.period.localeCompare(b.period))
				.slice(-months)

			return trimmed.map(item => ({
				date: item.period,
				revenue: item.revenue ?? 0,
				expenses: item.expenses ?? 0,
				profit: item.netIncome ?? (item.revenue ?? 0) - (item.expenses ?? 0)
			}))
		},
		staleTime: 2 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		structuralSharing: true
	})
}

import { dashboardGraphQLQueries } from './query-keys/dashboard-graphql-keys'

/**
 * Owner portfolio overview using pg_graphql
 * Single request fetches all properties with per-property unit counts and revenue.
 * Replaces N+1 PostgREST calls (one per property) with one pg_graphql request.
 *
 * GRAPH-01 + GRAPH-02 compliance: uses supabase.rpc('graphql.resolve') as specified.
 * RLS is enforced server-side — pg_graphql respects auth.uid() automatically.
 */
export function useOwnerPortfolioOverview() {
	return useQuery(dashboardGraphQLQueries.portfolioOverview())
}
