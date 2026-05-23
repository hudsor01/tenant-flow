import type { ActivityItem } from "#types/activity";
import type { MetricTrend, TimeSeriesDataPoint } from "#types/analytics";
import type { PropertyPerformance } from "#types/core";
import type { DashboardStats } from "#types/stats";
import type { PortfolioRow } from "./dashboard-types";

/**
 * Shape consumed by transformDashboardData — mirrors OwnerDashboardData
 * (the post-mapped payload that use-owner-dashboard.ts emits from
 * get_dashboard_data_v2). RPC row-level snake↔camel mapping has already
 * happened at the fetcher boundary (use-owner-dashboard.ts:227-244),
 * so this interface uses the camelCase view-side shape that selectors
 * actually receive. Per D-12a interpretation #2.
 */
export interface DashboardRpcPayload {
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
	};
	propertyPerformance: PropertyPerformance[];
}

/**
 * View-model exposed to dashboard surfaces — Phases 3/4/5 read from this,
 * not the raw RPC. portfolioRows is derived from propertyPerformance and
 * stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
 */
export interface DashboardViewModel {
	stats: DashboardStats;
	timeSeries: {
		occupancyRate: TimeSeriesDataPoint[];
		monthlyRevenue: TimeSeriesDataPoint[];
	};
	portfolioRows: PortfolioRow[];
}

/**
 * Pure RPC-payload → view-model transform for the owner dashboard.
 * Server-Component-safe: no React, no hooks, no React Query coupling.
 * Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that
 * Phases 2-5 consume.
 */
export function transformDashboardData(
	payload: DashboardRpcPayload,
): DashboardViewModel {
	const portfolioRows: PortfolioRow[] = payload.propertyPerformance.map(
		(prop) => ({
			id: prop.property_id,
			property: prop.property,
			address: prop.address_line1,
			units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
			tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
			leaseStatus:
				prop.occupancyRate === 100
					? "active"
					: prop.occupancyRate >= 80
						? "expiring"
						: "vacant",
			leaseEnd: null,
			rent: prop.monthlyRevenue,
			maintenanceOpen: 0,
		}),
	);

	return {
		stats: payload.stats,
		timeSeries: {
			occupancyRate: payload.timeSeries?.occupancyRate ?? [],
			monthlyRevenue: payload.timeSeries?.monthlyRevenue ?? [],
		},
		portfolioRows,
	};
}
