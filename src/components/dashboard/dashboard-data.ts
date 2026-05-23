import type { OwnerDashboardData } from "#hooks/api/use-owner-dashboard";
import type { TimeSeriesDataPoint } from "#types/analytics";
import type { DashboardStats } from "#types/stats";
import type { PortfolioRow } from "./dashboard-types";

/**
 * View-model exposed to dashboard surfaces — Phases 3/4/5 read from this,
 * not the raw RPC. `portfolioRows` is derived from `propertyPerformance` and
 * stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
 *
 * Note: `activity` and `propertyPerformance` remain on the raw
 * `OwnerDashboardData` shape because existing consumers depend on those
 * shapes; Phase 3's `dashboard-view.tsx` migration is when those slices
 * fold into the view-model. See `use-dashboard-hooks.ts` selectors for the
 * current asymmetry rationale.
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
 *
 * Input type is the canonical `OwnerDashboardData` from
 * `use-owner-dashboard.ts` (the post-mapped payload — RPC row-level snake↔
 * camel mapping has already happened at the fetcher boundary at
 * `use-owner-dashboard.ts:227-244`). Importing the canonical type instead
 * of declaring a structural duplicate per Phase 1 CR-01 fix (Zero Tolerance
 * Rule 3 — no duplicate types). Per D-12a interpretation #2 the selectors
 * compose this transform; it is not wired into `DASHBOARD_BASE_QUERY_OPTIONS`.
 *
 * Trust-the-type posture: input fields are typed required, so the body
 * does not optional-chain on `timeSeries` or `propertyPerformance`. The
 * fetcher upstream (`use-owner-dashboard.ts`) is responsible for emitting
 * the contracted shape with `?? []` fallbacks before the payload reaches
 * this transform.
 */
export function transformDashboardData(
	payload: OwnerDashboardData,
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
			occupancyRate: payload.timeSeries.occupancyRate,
			monthlyRevenue: payload.timeSeries.monthlyRevenue,
		},
		portfolioRows,
	};
}
