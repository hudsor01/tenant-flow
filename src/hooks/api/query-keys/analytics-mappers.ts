/**
 * Boundary mapper for the lease-analytics RPC return (TYPE-01, Phase 2).
 *
 * `get_occupancy_trends_optimized` (called via `fetchOccupancyTrends`) is
 * typed `unknown` at the TS boundary — the RPC returns untyped JSON. The
 * old lease path blind-cast it to `LeaseAnalyticsPageData` via
 * `jsonObjectOrEmpty<LeaseAnalyticsPageData>(data, {} as ...)`, which only
 * structural-checks "is this an object" and then leaks every field as-is.
 * RPC drift (a numeric metric arriving as a string, a status row missing
 * `count`) then surfaced downstream as silent `undefined` field reads /
 * NaN charts instead of failing loudly at the boundary.
 *
 * `mapLeaseAnalytics` replaces that cast with field-level Zod `safeParse`
 * validation, mirroring `mapDocumentRow` in `document-keys.ts` (the
 * canonical reference CLAUDE.md cites for the "RPC / PostgREST Return
 * Typing" rule — typed mapper at every boundary, never `as unknown as`).
 *
 * Difference from `mapDocumentRow`: an analytics aggregate's "no data yet"
 * state is a valid render state (per the `jsonObjectOrEmpty` precedent), so
 * this mapper NEVER throws. On null/undefined/non-object/drifted input it
 * degrades to a safe empty `LeaseAnalyticsPageData` (zeroed metrics, empty
 * arrays). Each top-level branch is validated independently, so a single
 * malformed sub-shape clears only that branch — well-formed sibling
 * branches still map through.
 *
 * Types are REUSED from `#types/analytics-page-data` / `#types/analytics`
 * per CLAUDE.md's type-lookup order — no duplicate interfaces defined here.
 */

import { z } from "zod";
import type {
	LeaseFinancialInsight,
	LeaseFinancialSummary,
	OccupancyMetricSummary,
	OccupancyTrendPoint,
} from "#types/analytics";
import type {
	LeaseAnalyticsPageData,
	OccupancyAnalyticsPageData,
} from "#types/analytics-page-data";

// Field-level schemas — one per sub-shape. Numeric fields must be real
// numbers (a string-typed metric is RPC drift, not valid data), string
// fields must be strings. `profitabilityScore` is the only nullable-optional
// field (matches `LeaseFinancialInsight`'s `number | null` + optional).
const leaseFinancialSummarySchema = z.object({
	totalLeases: z.number(),
	activeLeases: z.number(),
	expiringSoon: z.number(),
	totalrent_amount: z.number(),
	averageLeaseValue: z.number(),
});

const leaseFinancialInsightSchema = z.object({
	lease_id: z.string(),
	propertyName: z.string(),
	tenantName: z.string(),
	rent_amount: z.number(),
	outstandingBalance: z.number(),
	profitabilityScore: z.number().nullable().optional(),
});

const leaseLifecyclePointSchema = z.object({
	period: z.string(),
	renewals: z.number(),
	expirations: z.number(),
	noticesGiven: z.number(),
});

const leaseStatusBreakdownSchema = z.object({
	status: z.string(),
	count: z.number(),
	percentage: z.number(),
});

const vacancyTrendPointSchema = z.object({
	period: z.string(),
	vacancyRate: z.number(),
	turnovers: z.number(),
	avgVacancyDays: z.number(),
});

// Top-level schema. Every branch is optional + `.catch(undefined)` so a
// single malformed sub-shape clears ONLY that branch instead of failing the
// whole parse — well-formed siblings still map. The object envelope itself
// is validated by `safeParse`; non-objects fall through to the empty shape.
const leaseAnalyticsRawSchema = z.object({
	metrics: leaseFinancialSummarySchema.optional().catch(undefined),
	profitability: z
		.array(leaseFinancialInsightSchema)
		.optional()
		.catch(undefined),
	lifecycle: z.array(leaseLifecyclePointSchema).optional().catch(undefined),
	statusBreakdown: z
		.array(leaseStatusBreakdownSchema)
		.optional()
		.catch(undefined),
	vacancyTrends: z.array(vacancyTrendPointSchema).optional().catch(undefined),
});

// `exactOptionalPropertyTypes: true` makes `profitabilityScore?: number |
// null` reject the literal value `undefined` (the key may be absent, but if
// present its value must be `number | null`). Zod's `.optional()` widens the
// parsed value to `number | null | undefined`, so we normalize each row:
// include the key only when it carries a real value, omit it otherwise.
function toLeaseFinancialInsight(row: {
	lease_id: string;
	propertyName: string;
	tenantName: string;
	rent_amount: number;
	outstandingBalance: number;
	profitabilityScore?: number | null | undefined;
}): LeaseFinancialInsight {
	const base: LeaseFinancialInsight = {
		lease_id: row.lease_id,
		propertyName: row.propertyName,
		tenantName: row.tenantName,
		rent_amount: row.rent_amount,
		outstandingBalance: row.outstandingBalance,
	};
	if (row.profitabilityScore !== undefined) {
		base.profitabilityScore = row.profitabilityScore;
	}
	return base;
}

function emptyMetrics(): LeaseFinancialSummary {
	return {
		totalLeases: 0,
		activeLeases: 0,
		expiringSoon: 0,
		totalrent_amount: 0,
		averageLeaseValue: 0,
	};
}

function emptyLeaseAnalytics(): LeaseAnalyticsPageData {
	return {
		metrics: emptyMetrics(),
		profitability: [],
		renewalRates: [],
		vacancyTrends: [],
		leaseDistribution: [],
		lifecycle: [],
		statusBreakdown: [],
	};
}

/**
 * Validate + shape an untyped lease-analytics RPC return into a
 * `LeaseAnalyticsPageData`. Never throws — invalid/empty input degrades to
 * the safe empty shape. The lifecycle array feeds both `lifecycle` and
 * `renewalRates`; the statusBreakdown array feeds both `statusBreakdown` and
 * `leaseDistribution` (those are page-compatibility aliases on the type).
 */
export function mapLeaseAnalytics(raw: unknown): LeaseAnalyticsPageData {
	const parsed = leaseAnalyticsRawSchema.safeParse(raw);
	if (!parsed.success) {
		return emptyLeaseAnalytics();
	}

	const { metrics, profitability, lifecycle, statusBreakdown, vacancyTrends } =
		parsed.data;

	return {
		metrics: metrics ?? emptyMetrics(),
		profitability: (profitability ?? []).map(toLeaseFinancialInsight),
		renewalRates: lifecycle ?? [],
		vacancyTrends: vacancyTrends ?? [],
		leaseDistribution: statusBreakdown ?? [],
		lifecycle: lifecycle ?? [],
		statusBreakdown: statusBreakdown ?? [],
	};
}

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
