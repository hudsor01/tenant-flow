import type { OwnerDashboardData } from "#hooks/api/use-owner-dashboard";
import type { TimeSeriesDataPoint } from "#types/analytics";
import type { DashboardStats } from "#types/stats";
import type { PortfolioRow } from "./dashboard-types";

/**
 * View-model exposed to dashboard surfaces — future phases read from this,
 * not the raw RPC. `portfolioRows` is derived from `propertyPerformance` and
 * stores rent in dollars (no `* 100`) per UI-SPEC § 8.1.
 *
 * Note: `activity` and `propertyPerformance` remain on the raw
 * `OwnerDashboardData` shape because existing consumers depend on those
 * shapes; the eventual `dashboard-view.tsx` consumer migration is when those
 * slices fold into the view-model. Phase 3 mounted `<KpiBentoRow>` but
 * explicitly did NOT do the dashboard-view migration — that work is deferred
 * to a later phase. See `use-dashboard-hooks.ts` selectors for the current
 * asymmetry rationale and ROADMAP.md for the consumer-migration phase.
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
 * Per D-10 (Phase 01 CONTEXT.md) — the shared transform contract that the
 * future `dashboard-view.tsx` consumer will consume.
 *
 * Input type is the canonical `OwnerDashboardData` from
 * `use-owner-dashboard.ts` (the post-mapped payload — RPC row-level snake↔
 * camel mapping has already happened at the fetcher boundary). Importing
 * the canonical type instead of declaring a structural duplicate per
 * Phase 1 CR-01 fix (Zero Tolerance Rule 3 — no duplicate types).
 *
 * **Current consumer status (post-Phase-3):**
 * `transformDashboardData` has ZERO production consumers today. The
 * Phase 1 cycle-1 fix in `use-dashboard-hooks.ts` removed the
 * `transformDashboardData(data)` invocation from `selectStats` /
 * `selectCharts` (those selectors now read raw slices directly — the
 * old composition discarded `portfolioRows` work). The live `/dashboard`
 * page uses an inline `portfolioData` transform in `dashboard.tsx`
 * (search for `propertyPerformance.map((prop) => ...)` building
 * `PortfolioRow[]`) plus a re-mapper in `page.tsx` (search for
 * `performanceData.map((prop) => ...)` building `PropertyPerformanceItem[]`).
 * Line numbers omitted to avoid drift. The canonical
 * transform survives as the locked architectural seam (D-10) — only
 * the unit test at `dashboard-data.test.ts` consumes it, pinning the
 * contract so the eventual consumer migration surfaces no surprises.
 * Phase 3 mounted `<KpiBentoRow>` but explicitly did NOT do the
 * `dashboard-view.tsx` consumer migration; that work is deferred to a
 * later phase (see ROADMAP.md).
 *
 * Trust-the-type posture: input fields are typed required, so the body
 * does not optional-chain on `timeSeries` or `propertyPerformance`. The
 * fetcher upstream is responsible for emitting the contracted shape
 * with `?? []` fallbacks before the payload reaches this transform.
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
			// `open_maintenance` is optional on PropertyPerformance — only the v2
			// dashboard RPC emits it. `?? 0` is the read-seam fallback; producers
			// that genuinely have no maintenance data omit the field rather than
			// fabricating a zero at construction time.
			maintenanceOpen: prop.open_maintenance ?? 0,
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
