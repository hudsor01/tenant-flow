"use client";

/**
 * Owner Dashboard Keys, Options & Fetcher.
 * Derived hooks in use-dashboard-hooks.ts.
 */

import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { jsonObject } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import type { ActivityItem } from "#types/activity";
import type {
	MetricTrend,
	MonthlyRevenuePoint,
	TimeSeriesDataPoint,
} from "#types/analytics";
import type { PropertyPerformance } from "#types/core";
import type { PropertyPerformanceRpcResponse } from "#types/database-rpc";
import type { DashboardStats } from "#types/stats";
import { ownerDashboardKeys } from "./query-keys/owner-dashboard-keys";

// Types exported for use-dashboard-hooks.ts
export interface DashboardStatsData {
	stats: DashboardStats;
	metricTrends: {
		occupancyRate: MetricTrend | null;
		activeTenants: MetricTrend | null;
		monthlyRevenue: MetricTrend | null;
		openMaintenance: MetricTrend | null;
	};
}

// IN-01 (Phase 01 review): `metricTrends` is co-located with `timeSeries` on
// the raw `OwnerDashboardData` shape but ships through `DashboardStatsData`
// in the selector seam (it's metric-level data, not chart-series data).
// Future readers expecting "charts data" to include trend deltas should
// reach for `useDashboardStats().metricTrends`, not this interface.
export interface DashboardChartsData {
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
		monthlyRevenue6mo: MonthlyRevenuePoint[];
	};
}

export interface DashboardActivityData {
	activities: ActivityItem[];
}

export type OwnerDashboardData = {
	stats: DashboardStats;
	activity: ActivityItem[];
	metricTrends: {
		occupancyRate: MetricTrend | null;
		activeTenants: MetricTrend | null;
		monthlyRevenue: MetricTrend | null;
		openMaintenance: MetricTrend | null;
	};
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
		monthlyRevenue6mo: MonthlyRevenuePoint[];
	};
	propertyPerformance: PropertyPerformance[];
};

// Narrow the raw `string` status field to the typed union without `as`.
// Migration `20260523234221_phase2_property_perf_address_status_type.sql`
// derives `status` server-side via a closed CASE expression returning
// exactly one of `'NO_UNITS' | 'vacant' | 'FULL' | 'PARTIAL'`. The throw
// is defense-in-depth — it surfaces silent contract drift if a future
// migration introduces a new status value the union doesn't cover.
// Unreachable in normal operation against the current server contract.
function mapPropertyPerformanceStatus(
	raw: string,
): PropertyPerformance["status"] {
	if (
		raw === "NO_UNITS" ||
		raw === "vacant" ||
		raw === "FULL" ||
		raw === "PARTIAL"
	) {
		return raw;
	}
	throw new Error(
		`Unexpected property_performance.status value from get_dashboard_data_v2: ${raw}`,
	);
}

// Fetcher for unified dashboard payload — single RPC call
const fetchOwnerDashboardData = async (): Promise<OwnerDashboardData> => {
	const supabase = createClient();
	const user = await getCachedUser();
	if (!user) throw new Error("Not authenticated");

	const { data, error } = await supabase.rpc("get_dashboard_data_v2", {
		p_user_id: user.id,
	});

	if (error) handlePostgrestError(error, "analytics");

	if (
		!data ||
		typeof data !== "object" ||
		!("stats" in data) ||
		!("trends" in data) ||
		!("time_series" in data)
	) {
		throw new Error(
			"Dashboard RPC returned unexpected shape — verify get_dashboard_data_v2 is deployed",
		);
	}

	const result = jsonObject<{
		stats: DashboardStats;
		trends: Record<string, MetricTrend>;
		time_series: Record<string, TimeSeriesDataPoint[]> & {
			monthly_revenue_6mo?: MonthlyRevenuePoint[];
		};
		property_performance: PropertyPerformanceRpcResponse[];
		activities: ActivityItem[];
	}>(data);

	// The get_dashboard_data_v2 RPC emits property_performance rows with
	// `property_name` / `address` keys (see PropertyPerformanceRpcResponse).
	// The downstream PropertyPerformance type uses `property` / `address_line1`,
	// so map the RPC shape onto it here. Without this map the dashboard sort
	// crashes with "Cannot read properties of undefined (reading 'localeCompare')"
	// because every row's `property` field is undefined at runtime.
	const propertyPerformance: PropertyPerformance[] = (
		result.property_performance ?? []
	).map((row) => ({
		property: row.property_name,
		property_id: row.property_id,
		totalUnits: row.total_units,
		occupiedUnits: row.occupied_units,
		vacantUnits: row.vacant_units,
		occupancyRate: row.occupancy_rate,
		revenue: row.annual_revenue,
		monthlyRevenue: row.monthly_revenue,
		potentialRevenue: row.potential_revenue,
		address_line1: row.address,
		property_type: row.property_type,
		status: mapPropertyPerformanceStatus(row.status),
		trend: "stable",
		trendPercentage: 0,
		// Defensive: until the `perf_open_maintenance` migration is applied in
		// prod (see 20260523223626_phase2_open_maintenance_per_property.sql),
		// the RPC may return undefined for this field. `?? 0` keeps the
		// frontend deploy safe even if a future revert temporarily removes
		// the field from the RPC return shape.
		open_maintenance: row.open_maintenance ?? 0,
	}));

	return {
		stats: result.stats,
		activity: result.activities ?? [],
		metricTrends: {
			occupancyRate: result.trends?.occupancy_rate ?? null,
			activeTenants: result.trends?.active_tenants ?? null,
			monthlyRevenue: result.trends?.monthly_revenue ?? null,
			openMaintenance: result.trends?.open_maintenance ?? null,
		},
		timeSeries: {
			occupancyRate: result.time_series?.occupancy_rate ?? [],
			monthlyRevenue: result.time_series?.monthly_revenue ?? [],
			monthlyRevenue6mo: result.time_series?.monthly_revenue_6mo ?? [],
		},
		propertyPerformance,
	};
};

export const DASHBOARD_BASE_QUERY_OPTIONS = {
	queryKey: ownerDashboardKeys.analytics.pageData(),
	queryFn: fetchOwnerDashboardData,
	staleTime: 2 * 60 * 1000,
	gcTime: 10 * 60 * 1000,
	refetchIntervalInBackground: false,
	structuralSharing: true,
} as const;
