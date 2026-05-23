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

// D-12a interpretation #2: keep `select` OUT of DASHBOARD_BASE_QUERY_OPTIONS
// so per-call selectors compose the slice they need from the raw cache.
// WR-01 fix (cycle 1 → cycle 2): selectStats + selectCharts read `data.stats`
// / `data.timeSeries` directly. Earlier they invoked `transformDashboardData(data)`
// and immediately discarded its `portfolioRows` work — every cache hit paid
// the `propertyPerformance.map(...)` cost twice (once per selector) to read
// passthrough fields. The transform stays imported by callers that consume
// `portfolioRows` (Phase 3's `dashboard-view.tsx` is the next consumer);
// here we just trim the dead invocation. selectActivity +
// selectPropertyPerformance remain raw passthroughs — the view-model
// substitutes `portfolioRows: PortfolioRow[]` for the raw
// `PropertyPerformance[]` shape existing consumers depend on.
const selectStats = (data: OwnerDashboardData): DashboardStatsData => ({
	stats: data.stats,
	metricTrends: data.metricTrends,
});

const selectCharts = (data: OwnerDashboardData): DashboardChartsData => ({
	timeSeries: data.timeSeries,
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
