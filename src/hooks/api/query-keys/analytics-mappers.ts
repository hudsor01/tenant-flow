/**
 * Boundary mapper for the occupancy-analytics RPC return (DATA-01).
 *
 * `get_occupancy_trends_optimized` (called via `fetchOccupancyTrends`) is typed
 * `unknown` at the TS boundary and returns a jsonb ARRAY. `mapOccupancyAnalytics`
 * shapes it into an `OccupancyAnalyticsPageData`, reusing types from
 * `#types/analytics` / `#types/analytics-page-data` per CLAUDE.md's type-lookup
 * order. It NEVER throws — a non-array/empty input degrades to a safe empty shape.
 */

import { parseStatedWindow } from "#lib/stated-window";
import type {
	FinancialBreakdownRow,
	FinancialMetricSummary,
	LeaseProfitability,
	MaintenanceCategoryBreakdown,
	MaintenanceCostSummary,
	MaintenanceTrendPoint,
	MetricTrend,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	OccupancyTrendPoint,
	PortfolioTrends,
	RevenueExpenseBreakdown,
} from "#types/analytics";
import type {
	FinancialAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
} from "#types/analytics-page-data";
import {
	expenseVendorLabel,
	propertyReportName,
} from "../../../../supabase/functions/_shared/tax-year-reports";

/**
 * Build a `Map<'YYYY-MM', dollars>` from `get_expense_summary.monthly_totals`.
 * `monthly_totals` is the per-month series (a fixed trailing-12-month window);
 * `total_amount` is a period scalar and must NOT be used to key months. Mirrors
 * the canonical `monthly_totals` mapping in
 * `use-owner-dashboard-financial.ts#mapExpenseMonthlyTotals` and
 * `financial-keys.ts#expenseSummary` — validated at the boundary, never
 * `as unknown as` (CLAUDE.md #8).
 */
function expenseTotalsByMonth(data: unknown): Map<string, number> {
	const summary = data as Record<string, unknown> | null;
	const rows = (summary?.monthly_totals ?? []) as Array<
		Record<string, unknown>
	>;
	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(String(row.month ?? ""), Number(row.amount ?? 0));
	}
	return map;
}

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
// The properties insights' chart plots each month; the page shape carries
// only that series (its metrics, per-property, seasonal and vacancy fields no
// source filled went in 66.2-39). It NEVER throws: a non-array or empty input
// yields no months.

/**
 * Shape the untyped occupancy-trends RPC array into an
 * `OccupancyAnalyticsPageData`: every row a trend point (Number()-coerced),
 * oldest month first. Never throws — non-array/empty input degrades to an
 * empty series.
 */
export function mapOccupancyAnalytics(
	raw: unknown,
): OccupancyAnalyticsPageData {
	if (!Array.isArray(raw)) return { trends: [] };
	const rows = raw as Array<Record<string, unknown>>;
	// The RPC returns rows newest-first (month_date DESC). The trend chart plots
	// the x-axis in array order, so it needs oldest->newest — reverse the mapped
	// series so time runs left-to-right.
	const trends: OccupancyTrendPoint[] = rows
		.map((row) => ({
			period: String(row.month ?? ""),
			occupancyRate: Number(row.occupancy_rate ?? 0),
		}))
		.reverse();
	return { trends };
}

// --- Financial analytics (TYPE-02) -----------------------------------------
// `get_financial_overview` returns `{ overview: { total_revenue, total_expenses,
// net_income }, lease_profitability }` (dollars, 20261102184504) — NOT the
// page-data shape the old `jsonObject<FinancialAnalyticsPageData>` blind-cast
// asserted, so every declared field was `undefined` at runtime and the page
// rendered zeroed KPIs. This never-throw mapper derives `metrics` from
// `overview` and the lease profitability from `lease_profitability`
// (mapLeaseProfitability); the three series sub-shapes (`monthlyMetrics`,
// `breakdown.expenses`, `netOperatingIncome`) are built from the
// caller-supplied `get_revenue_trends_optimized` + `get_expense_summary` join.
// There is no revenue breakdown: received rent is not split by type anywhere,
// and the charged split is the income statement's (do NOT invent one; matches
// the DATA-01 discipline). Its card, always empty, went in 66.2-39 part P. The
// billing timeline and invoice summary, which had no source either, were
// deleted with their cards (66.2-39).

/**
 * get_financial_overview's `lease_profitability` (20261102184504): each lease
 * with rent received or an expense in the period, beside the period. The key
 * is the marker: the bodies before return none, and then the table is
 * unavailable, never empty. A property the owner has deleted since is named
 * through the report label map. Never throws.
 */
export function mapLeaseProfitability(
	overviewRaw: unknown,
): LeaseProfitability {
	const section = asObject(asObject(overviewRaw)?.lease_profitability);
	const window = parseStatedWindow(section?.window);
	if (section === null || window === null || !Array.isArray(section.leases)) {
		return { status: "unavailable" };
	}
	const text = (value: unknown) =>
		typeof value === "string" && value !== "" ? value : null;
	const money = (value: unknown) =>
		typeof value === "number" && Number.isFinite(value) ? value : 0;
	return {
		status: "ready",
		window,
		leases: section.leases.flatMap((entry) => {
			// A row with no lease id is no lease's.
			const row = asObject(entry);
			if (row === null || text(row.lease_id) === null) return [];
			return [
				{
					propertyName: propertyReportName(
						text(row.property_name) ?? "",
						row.property_deleted === true ? "inactive" : "active",
					),
					unitNumber: text(row.unit_number),
					tenantName: text(row.tenant_name),
					rentReceived: money(row.rent_received),
					expenses: money(row.expenses),
					net: money(row.net),
				},
			];
		}),
	};
}

/** Read `get_expense_summary.categories` as FinancialBreakdownRow[]. */
function expenseBreakdownRows(summary: unknown): FinancialBreakdownRow[] {
	const obj = asObject(summary);
	const categories = Array.isArray(obj?.categories) ? obj.categories : [];
	return (categories as Array<Record<string, unknown>>).map((c) => ({
		label: expenseVendorLabel(c.category),
		value: Number(c.amount ?? 0),
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

	// D-07: Collected is a SEPARATE figure sourced from ledger receipts, summed
	// across the same trailing-12-month revenue-trend window the charts use. It
	// is deliberately NOT folded into totalRevenue and NOT used to re-base
	// netIncome / profitMargin — those stay scheduled-based. With no
	// ledger data `collections` is an honest 0 rather than a placeholder.
	const totalCollected = (options?.revenueRows ?? []).reduce(
		(sum, row) => sum + Number(row.collections ?? 0),
		0,
	);

	const metrics: FinancialMetricSummary = {
		totalRevenue,
		totalCollected,
		netIncome,
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
			return { month, revenue, expenses, netIncome: revenue - expenses };
		})
		.reverse();

	// Per-month Scheduled Net (the card's "Scheduled rent less expenses, by
	// month"), each month as its bar's label: the schema has no per-property
	// expense split.
	const netOperatingIncome: NetOperatingIncomeByProperty[] = monthlyMetrics.map(
		(m): NetOperatingIncomeByProperty => ({
			propertyName: m.month,
			noi: m.netIncome,
		}),
	);

	const breakdown: RevenueExpenseBreakdown = {
		expenses: expenseBreakdownRows(options?.expenseSummary),
	};

	return {
		metrics,
		breakdown,
		netOperatingIncome,
		monthlyMetrics,
		leaseProfitability: mapLeaseProfitability(overviewRaw),
	};
}

// --- Dashboard trends (20261102184501) --------------------------------------
// get_dashboard_data_v2 returns `units.occupancyChange` and `revenue.growth`;
// the bodies before 20261102184501 return them with no window (get_dashboard_
// stats as the literal 0, get_dashboard_data_v2 against only the leases still
// active today). A figure without its stated window is no figure.

/**
 * One of get_dashboard_data_v2's `trends`, or null when it is not one (no
 * numbers to show). `window` is the two days it compares, null from a body
 * that states none: the bodies before 20261102184501 compare today's leases
 * with only the leases still active today, and read 0% with no earlier
 * figure, so a caller shows no change without a window. `percentChange` is
 * null when the earlier figure was 0. Never throws.
 */
export function mapMetricTrend(raw: unknown): MetricTrend | null {
	const trend = asObject(raw);
	const current = trend?.current;
	const change = trend?.change;
	if (typeof current !== "number" || typeof change !== "number") return null;
	const previous = trend?.previous;
	const percentChange = trend?.percentChange;
	const direction = trend?.trend;
	return {
		current,
		previous: typeof previous === "number" ? previous : null,
		change,
		percentChange:
			typeof percentChange === "number" && Number.isFinite(percentChange)
				? percentChange
				: null,
		trend:
			direction === "up" || direction === "down" || direction === "stable"
				? direction
				: "stable",
		window: parseStatedWindow(trend?.window),
	};
}

/**
 * The trends in a dashboard `stats` payload, each `ready` only beside its
 * window. Never throws. `percent` stays null when the RPC says there was no
 * prior figure (nothing scheduled on the window's first day).
 */
export function mapPortfolioTrends(stats: unknown): PortfolioTrends {
	const root = asObject(stats);
	const units = asObject(root?.units);
	const revenue = asObject(root?.revenue);
	const occupancyWindow = parseStatedWindow(units?.occupancyChangeWindow);
	const growthWindow = parseStatedWindow(revenue?.growthWindow);
	const change = units?.occupancyChange;
	const growth = revenue?.growth;
	return {
		occupancy:
			occupancyWindow !== null && typeof change === "number"
				? { status: "ready", points: change, window: occupancyWindow }
				: { status: "unavailable" },
		revenue:
			growthWindow !== null && (typeof growth === "number" || growth === null)
				? { status: "ready", percent: growth, window: growthWindow }
				: { status: "unavailable" },
	};
}

// --- Maintenance analytics (TYPE-03, 20261102184503) ------------------------
// `get_maintenance_analytics` emits snake_case/legacy keys (`open_requests`,
// `avg_resolution_hours`, `by_status:[{status,count}]`, ...) — NONE of the
// page-data keys the old `jsonObject<MaintenanceInsightsPageData>` blind-cast
// asserted. This never-throw mapper derives `categoryBreakdown`
// (from `by_status`, the closest real dimension — the schema has no
// maintenance-category taxonomy), and the spend and request trends that
// 20261102184503 computes. The body before it returns them as `0` and `[]`
// with no `costed_requests`: then they are null (unavailable), never $0 or an
// empty chart.

/** A finite number, or null. */
function finiteOrNull(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * get_maintenance_analytics' spend, or null when the body returns no
 * `costed_requests` (the body before 20261102184503, whose 0 is no figure).
 * Shared by the insights tab and the maintenance report, so the export holds
 * the figures the screen shows.
 */
export function mapMaintenanceCosts(
	raw: unknown,
): MaintenanceCostSummary | null {
	const root = asObject(raw);
	const costedRequests = finiteOrNull(root?.costed_requests);
	const totalCost = finiteOrNull(root?.total_cost);
	if (costedRequests === null || totalCost === null) return null;
	const rows = (value: unknown) =>
		(Array.isArray(value) ? value : []).map((entry) => asObject(entry) ?? {});
	return {
		totalCost,
		costedRequests,
		averageCost: finiteOrNull(root?.average_cost),
		monthlyCost: rows(root?.monthly_cost).map((m) => ({
			month: String(m.month ?? ""),
			cost: Number(m.cost ?? 0),
		})),
		vendors: rows(root?.vendor_performance).map((v) => ({
			vendorName: expenseVendorLabel(v.vendor_name),
			totalSpend: Number(v.total_spend ?? 0),
			jobs: Number(v.jobs ?? 0),
		})),
	};
}

/**
 * The request trends (requests completed in each month, open at its end),
 * oldest first, or null with no `costed_requests` (the body before
 * 20261102184503 returns `[]`, which is no series).
 */
function mapMaintenanceTrends(raw: unknown): MaintenanceTrendPoint[] | null {
	const root = asObject(raw);
	if (finiteOrNull(root?.costed_requests) === null) return null;
	return (Array.isArray(root?.trendsOverTime) ? root.trendsOverTime : []).map(
		(entry) => {
			const point = asObject(entry) ?? {};
			return {
				period: String(point.month ?? ""),
				completed: Number(point.completed ?? 0),
				pending: Number(point.pending ?? 0),
			};
		},
	);
}

/**
 * Shape `get_maintenance_analytics` into `MaintenanceInsightsPageData`.
 * `categoryBreakdown` from the requests by status; `costs`, its vendor
 * `costBreakdown` and `trends` from 20261102184503's keys, null (empty for
 * the breakdown) when the body returns none. Never throws — non-object input
 * yields no categories, costs or trends. (Its metrics, cost trends, response
 * times and preventive maintenance, read by no screen and written as 0 or [],
 * went in 66.2-39.)
 */
export function mapMaintenanceAnalytics(
	raw: unknown,
): MaintenanceInsightsPageData {
	const byStatus = asObject(raw)?.by_status;

	const categoryBreakdown: MaintenanceCategoryBreakdown[] = Array.isArray(
		byStatus,
	)
		? (byStatus as Array<Record<string, unknown>>).map((r) => ({
				category: String(r.status ?? ""),
				count: Number(r.count ?? 0),
			}))
		: [];

	const costs = mapMaintenanceCosts(raw);
	return {
		categoryBreakdown,
		costs,
		costBreakdown: (costs?.vendors ?? []).map((v) => ({
			category: v.vendorName,
			amount: v.totalSpend,
		})),
		trends: mapMaintenanceTrends(raw),
	};
}
