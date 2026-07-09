/**
 * Boundary mapper for the occupancy-analytics RPC return (DATA-01).
 *
 * `get_occupancy_trends_optimized` (called via `fetchOccupancyTrends`) is typed
 * `unknown` at the TS boundary and returns a jsonb ARRAY. `mapOccupancyAnalytics`
 * shapes it into an `OccupancyAnalyticsPageData`, reusing types from
 * `#types/analytics` / `#types/analytics-page-data` per CLAUDE.md's type-lookup
 * order. It NEVER throws — a non-array/empty input degrades to a safe empty shape.
 */

import type {
	OccupancyMetricSummary,
	OccupancyTrendPoint,
} from "#types/analytics";
import type { OccupancyAnalyticsPageData } from "#types/analytics-page-data";

// --- Occupancy analytics (DATA-01) -----------------------------------------
// `get_occupancy_trends_optimized` returns a jsonb ARRAY ordered month DESC:
//   [{ month, occupancy_rate, total_units, occupied_units }, ...]
// element[0] is the latest month. The RPC provides NO metrics/trends envelope,
// no per-property breakdown, and no vacancy/seasonal/trend data — those page
// sub-shapes stay empty. This mapper mirrors `mapLeaseAnalytics`'s degrade-to-
// empty contract: it NEVER throws; a non-array/empty input yields zeroed
// metrics + empty trends. Types are REUSED from `#types/analytics(-page-data)`.

function emptyOccupancyMetrics(): OccupancyMetricSummary {
	return {
		currentOccupancy: 0,
		averageVacancyDays: 0,
		seasonalPeakOccupancy: 0,
		trend: 0,
	};
}

function emptyOccupancyAnalytics(): OccupancyAnalyticsPageData {
	return {
		metrics: emptyOccupancyMetrics(),
		trends: [],
		propertyPerformance: [],
		seasonalPatterns: [],
		vacancyAnalysis: [],
	};
}

/**
 * Shape the untyped occupancy-trends RPC array into an
 * `OccupancyAnalyticsPageData`. Trends are mapped from every row (Number()-
 * coerced); metrics are derived from element[0] (the latest month, RPC orders
 * DESC) — `currentOccupancy` from that row's `occupancy_rate`, the remaining
 * metric fields default to 0 since the RPC emits no vacancy/seasonal/trend
 * data. Never throws — non-array/empty input degrades to the safe empty shape.
 */
export function mapOccupancyAnalytics(
	raw: unknown,
): OccupancyAnalyticsPageData {
	if (!Array.isArray(raw) || raw.length === 0) {
		return emptyOccupancyAnalytics();
	}

	const rows = raw as Array<Record<string, unknown>>;
	// The RPC returns rows newest-first (month_date DESC). Metrics read element[0]
	// (the latest month). The trend chart plots the x-axis in array order, so it
	// needs oldest->newest — reverse the mapped series so time runs left-to-right.
	const latest = rows[0] ?? {};
	const trends: OccupancyTrendPoint[] = rows
		.map((row) => ({
			period: String(row.month ?? ""),
			occupancyRate: Number(row.occupancy_rate ?? 0),
			occupiedUnits: Number(row.occupied_units ?? 0),
			totalUnits: Number(row.total_units ?? 0),
		}))
		.reverse();
	const metrics: OccupancyMetricSummary = {
		currentOccupancy: Number(latest.occupancy_rate ?? 0),
		averageVacancyDays: 0,
		seasonalPeakOccupancy: 0,
		trend: 0,
	};

	return {
		metrics,
		trends,
		propertyPerformance: [],
		seasonalPatterns: [],
		vacancyAnalysis: [],
	};
}
