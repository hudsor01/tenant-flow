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
	FinancialBreakdownRow,
	FinancialMetricSummary,
	MaintenanceCategoryBreakdown,
	MaintenanceMetricSummary,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	OccupancyMetricSummary,
	OccupancyTrendPoint,
	RevenueExpenseBreakdown,
} from "#types/analytics";
import type {
	FinancialAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
} from "#types/analytics-page-data";
import { expenseTotalsByMonth } from "./analytics-keys";

/** Narrow an unknown RPC return to a plain object, or null. Never throws. */
function asObject(raw: unknown): Record<string, unknown> | null {
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
		return null;
	}
	return raw as Record<string, unknown>;
}

// --- Occupancy analytics (DATA-01) -----------------------------------------
// `get_occupancy_trends_optimized` returns a jsonb ARRAY ordered month DESC:
//   [{ month, occupancy_rate, total_units, occupied_units }, ...]
// element[0] is the latest month. The RPC provides NO metrics/trends envelope,
// no per-property breakdown, and no vacancy/seasonal/trend data — those page
// sub-shapes stay empty. It NEVER throws — a non-array/empty input yields
// zeroed metrics + empty trends. Types are REUSED from
// `#types/analytics(-page-data)`.

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

// --- Financial analytics (TYPE-02) -----------------------------------------
// `get_financial_overview` returns `{ overview: { total_revenue, total_expenses,
// net_income, ... }, highlights: [...] }` (dollars) — NOT the page-data shape the
// old `jsonObject<FinancialAnalyticsPageData>` blind-cast asserted, so every
// declared field was `undefined` at runtime and the page rendered zeroed KPIs.
// This never-throw mapper derives `metrics` from `overview`; the four chart
// sub-shapes (`monthlyMetrics`, `breakdown.expenses`, `netOperatingIncome`) are
// built from the caller-supplied `get_revenue_trends_optimized` +
// `get_expense_summary` join. `breakdown.revenue`, `billingInsights`,
// `invoiceSummary`, `leaseAnalytics` stay empty — no source exists post
// rent-payment demolish (do NOT invent one; matches the DATA-01 discipline).

/** Read `get_expense_summary.categories` as FinancialBreakdownRow[]. */
function expenseBreakdownRows(summary: unknown): FinancialBreakdownRow[] {
	const obj = asObject(summary);
	const categories = Array.isArray(obj?.categories) ? obj.categories : [];
	return (categories as Array<Record<string, unknown>>).map((c) => ({
		label: String(c.category ?? ""),
		value: Number(c.amount ?? 0),
		percentage: Number(c.percentage ?? 0),
		change: null,
	}));
}

/**
 * Shape `get_financial_overview` into `FinancialAnalyticsPageData`. `metrics`
 * always comes from the RPC `overview` (dollars). When `options` carries the two
 * chart RPCs (financialPageData), the monthly series + expense breakdown +
 * per-month NOI are built from the revenue/expense join; when omitted
 * (overviewPageData, which only reads `metrics`) those degrade to honest empty
 * charts. Never throws — non-object input yields zeroed metrics + empty charts.
 */
export function mapFinancialOverview(
	overviewRaw: unknown,
	options?: {
		revenueRows?: Array<Record<string, unknown>>;
		expenseSummary?: unknown;
	},
): FinancialAnalyticsPageData {
	const root = asObject(overviewRaw);
	const overview = asObject(root?.overview) ?? {};
	const totalRevenue = Number(overview.total_revenue ?? 0);
	const totalExpenses = Number(overview.total_expenses ?? 0);
	const netIncome = Number(overview.net_income ?? totalRevenue - totalExpenses);
	const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

	const metrics: FinancialMetricSummary = {
		totalRevenue,
		totalExpenses,
		netIncome,
		cashFlow: netIncome,
		profitMargin,
	};

	// Charts: revenue (get_revenue_trends_optimized, month DESC) joined with real
	// per-month expenses (get_expense_summary.monthly_totals) by 'YYYY-MM'. The
	// series is reversed to run oldest→newest for left-to-right chart axes.
	const expenseByMonth = expenseTotalsByMonth(options?.expenseSummary);
	const monthlyMetrics: MonthlyFinancialMetric[] = (options?.revenueRows ?? [])
		.map((row): MonthlyFinancialMetric => {
			const month = String(row.month ?? "");
			const revenue = Number(row.revenue ?? 0);
			const expenses = expenseByMonth.get(month) ?? 0;
			const monthNet = revenue - expenses;
			return {
				month,
				revenue,
				expenses,
				netIncome: monthNet,
				cashFlow: monthNet,
			};
		})
		.reverse();

	// Per-month NOI (card renders "Revenue minus operating expenses over time",
	// x-axis labeled by month). The schema has no per-property expense split.
	const netOperatingIncome: NetOperatingIncomeByProperty[] = monthlyMetrics.map(
		(m): NetOperatingIncomeByProperty => ({
			property_id: m.month,
			propertyName: m.month,
			noi: m.netIncome,
			revenue: m.revenue,
			expenses: m.expenses,
			margin: m.revenue > 0 ? (m.netIncome / m.revenue) * 100 : 0,
		}),
	);

	const breakdown: RevenueExpenseBreakdown = {
		revenue: [],
		expenses: expenseBreakdownRows(options?.expenseSummary),
		totals: { revenue: totalRevenue, expenses: totalExpenses, netIncome },
	};

	return {
		metrics,
		breakdown,
		netOperatingIncome,
		billingInsights: {
			points: [],
			totals: { invoiced: 0, paid: 0, overdue: 0 },
		},
		invoiceSummary: [],
		monthlyMetrics,
		leaseAnalytics: [],
	};
}

// --- Maintenance analytics (TYPE-03) ---------------------------------------
// `get_maintenance_analytics` emits snake_case/legacy keys (`open_requests`,
// `avg_resolution_hours`, `by_status:[{status,count}]`, `total_cost:0`, ...) —
// NONE of the page-data keys the old `jsonObject<MaintenanceInsightsPageData>`
// blind-cast asserted, so the insights section always rendered empty. This
// never-throw mapper derives `metrics` + `categoryBreakdown` (from `by_status`,
// the closest real dimension — the schema has no maintenance-category taxonomy).
// The cost/time-series shapes stay empty because the RPC hardcodes them to
// `[]`/`0`: that data legitimately does not exist (expenses aren't joined to
// maintenance categories) — honest empty, not fabricated.

/** Sum the `count` of a `by_status` row matching `status`. Never throws. */
function statusCount(byStatus: unknown, status: string): number {
	if (!Array.isArray(byStatus)) return 0;
	const row = (byStatus as Array<Record<string, unknown>>).find(
		(r) => String(r.status ?? "") === status,
	);
	return row ? Number(row.count ?? 0) : 0;
}

/**
 * Shape `get_maintenance_analytics` into `MaintenanceInsightsPageData`.
 * `metrics` + `categoryBreakdown` are derived from the keys the RPC legitimately
 * carries; the cost/trend series stay empty (the RPC returns none). Never
 * throws — non-object input yields zeroed metrics + empty sections.
 */
export function mapMaintenanceAnalytics(
	raw: unknown,
): MaintenanceInsightsPageData {
	const root = asObject(raw) ?? {};
	const byStatus = root.by_status;

	const metrics: MaintenanceMetricSummary = {
		openRequests: Number(root.open_requests ?? 0),
		inProgressRequests: statusCount(byStatus, "in_progress"),
		completedRequests: statusCount(byStatus, "completed"),
		averageResponseTimeHours: Number(root.avg_resolution_hours ?? 0),
		totalCost: 0,
	};

	const categoryBreakdown: MaintenanceCategoryBreakdown[] = Array.isArray(
		byStatus,
	)
		? (byStatus as Array<Record<string, unknown>>).map((r) => ({
				category: String(r.status ?? ""),
				count: Number(r.count ?? 0),
			}))
		: [];

	return {
		metrics,
		categoryBreakdown,
		costTrends: [],
		costBreakdown: [],
		trends: [],
		responseTimes: [],
		preventiveMaintenance: [],
	};
}
