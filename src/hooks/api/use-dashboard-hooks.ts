"use client";

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

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { transformDashboardData } from "#components/dashboard/dashboard-data";
import type { PropertyPerformance } from "#types/core";
import {
	DASHBOARD_BASE_QUERY_OPTIONS,
	type DashboardActivityData,
	type DashboardChartsData,
	type DashboardStatsData,
	dashboardFinancialQueries,
	type FinancialTimeRange,
	type OwnerDashboardData,
} from "./use-owner-dashboard";

// D-12a interpretation #2: selectors compose transformDashboardData(data)
// rather than baking `select` into DASHBOARD_BASE_QUERY_OPTIONS (which would
// be masked by per-call selects in React Query). selectStats + selectCharts
// read their slices off the view-model. selectActivity + selectPropertyPerformance
// are left untouched: the view-model carries portfolioRows (PortfolioRow[]),
// not the raw PropertyPerformance[] shape that existing dashboard/page.tsx
// consumers depend on; Phase 3 migrates the consumer when dashboard-view.tsx
// replaces dashboard.tsx.
const selectStats = (data: OwnerDashboardData): DashboardStatsData => ({
	stats: transformDashboardData(data).stats,
	metricTrends: data.metricTrends,
});

const selectCharts = (data: OwnerDashboardData): DashboardChartsData => ({
	timeSeries: transformDashboardData(data).timeSeries,
});

const selectActivity = (data: OwnerDashboardData): DashboardActivityData => ({
	activities: data.activity,
});

const selectPropertyPerformance = (
	data: OwnerDashboardData,
): PropertyPerformance[] => data.propertyPerformance;

export function useDashboardStatsSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectStats,
	});
}

export function useDashboardStats() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectStats,
	});
}

export function useDashboardChartsSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectCharts,
	});
}

export function useDashboardCharts() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectCharts,
	});
}

export function useDashboardActivitySuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectActivity,
	});
}

export function useDashboardActivity() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectActivity,
	});
}

/**
 * Property performance — derives from unified dashboard cache via select
 */
export function usePropertyPerformanceSuspense() {
	return useSuspenseQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectPropertyPerformance,
	});
}

/**
 * Property performance — derives from unified dashboard cache via select
 */
export function usePropertyPerformance() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectPropertyPerformance,
	});
}

// Re-export types for existing consumers
export type {
	FinancialChartDatum,
	FinancialTimeRange,
} from "./use-owner-dashboard";

/**
 * Revenue/expense chart data fetched from the financial analytics RPC.
 * Uses server-calculated revenue/expense/netIncome so the chart reflects
 * actual expenses instead of placeholders.
 */
export function useFinancialChartData(timeRange: FinancialTimeRange = "6m") {
	return useQuery(dashboardFinancialQueries.chartData(timeRange));
}
