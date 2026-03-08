'use client'

/**
 * Dashboard Derived Hooks
 * Select-based hooks that derive slices from the unified dashboard payload,
 * plus financial chart data and portfolio overview hooks.
 *
 * Split from use-owner-dashboard.ts to keep each file under 300 lines.
 * Base query keys, options, types, and fetcher remain in use-owner-dashboard.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import type { FinancialMetrics } from '#types/core'
import {
	ownerDashboardKeys,
	DASHBOARD_BASE_QUERY_OPTIONS,
	type DashboardStatsData,
	type DashboardChartsData,
	type DashboardActivityData,
	type OwnerDashboardData
} from './use-owner-dashboard'
import type { PropertyPerformance } from '#types/core'

// ============================================================================
// STABLE SELECT FUNCTIONS (outside components for referential equality)
// ============================================================================

const selectStats = (data: OwnerDashboardData): DashboardStatsData => ({
	stats: data.stats,
	metricTrends: data.metricTrends
})

const selectCharts = (data: OwnerDashboardData): DashboardChartsData => ({
	timeSeries: data.timeSeries
})

const selectActivity = (data: OwnerDashboardData): DashboardActivityData => ({
	activities: data.activity
})

const selectPropertyPerformance = (data: OwnerDashboardData): PropertyPerformance[] =>
	data.propertyPerformance

// ============================================================================
// STATS HOOKS (derive from unified payload via select)
// ============================================================================

export function useDashboardStatsSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectStats
	})
}

export function useDashboardStats() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectStats
	})
}

// ============================================================================
// CHARTS HOOKS (derive from unified payload via select)
// ============================================================================

export function useDashboardChartsSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectCharts
	})
}

export function useDashboardCharts() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectCharts
	})
}

// ============================================================================
// ACTIVITY HOOKS (derive from unified payload via select)
// ============================================================================

export function useDashboardActivitySuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectActivity
	})
}

export function useDashboardActivity() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectActivity
	})
}

// ============================================================================
// PROPERTY PERFORMANCE
// ============================================================================

/**
 * Property performance — derives from unified dashboard cache via select
 */
export function usePropertyPerformanceSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectPropertyPerformance
	})
}

/**
 * Property performance — derives from unified dashboard cache via select
 */
export function usePropertyPerformance() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectPropertyPerformance
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

	return useQuery({
		queryKey: [
			...ownerDashboardKeys.financial.revenueTrends(currentYear),
			timeRange,
			months
		] as const,
		queryFn: async (): Promise<FinancialChartDatum[]> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')

			const { data, error } = await supabase.rpc(
				'get_revenue_trends_optimized',
				{ p_user_id: user.id, p_months: 12 }
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
		structuralSharing: true
	})
}

