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

import { useQuery } from "@tanstack/react-query";
import type { ActivityItem } from "#types/activity";
import type { PropertyPerformance } from "#types/core";
import {
	DASHBOARD_BASE_QUERY_OPTIONS,
	type DashboardChartsData,
	type DashboardStatsData,
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

const selectPropertyPerformance = (
	data: OwnerDashboardData,
): PropertyPerformance[] => data.propertyPerformance;

// ACT-01: derive the historical activity slice from the shared dashboard cache
// (get_dashboard_data_v2 already returns it). Selector-only — no new fetch,
// so surfacing the activity card costs zero additional network calls (T-52-20).
const selectActivity = (data: OwnerDashboardData): ActivityItem[] =>
	data.activity;

export function useDashboardStats() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectStats,
	});
}

export function useDashboardCharts() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectCharts,
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

/**
 * Recent activity — derives the activity slice from the unified dashboard
 * cache via select (ACT-01). Reuses `DASHBOARD_BASE_QUERY_OPTIONS`, so it
 * shares the single get_dashboard_data_v2 query with the stats/charts hooks
 * and never issues its own fetch.
 */
export function useDashboardActivity() {
	return useQuery({
		...DASHBOARD_BASE_QUERY_OPTIONS,
		select: selectActivity,
	});
}
