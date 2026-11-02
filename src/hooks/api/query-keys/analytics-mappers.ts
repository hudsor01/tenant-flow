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
	MaintenanceMetricSummary,
	MaintenanceTrendPoint,
	MetricTrend,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty,
	OccupancyMetricSummary,
	OccupancyTrendPoint,
	PortfolioTrends,
	RevenueExpenseBreakdown,
} from "#types/analytics";
import type {
	FinancialAnalyticsPageData,
	MaintenanceInsightsPageData,
	OccupancyAnalyticsPageData,
} from "#types/analytics-page-data";
import { propertyReportName } from "../../../../supabase/functions/_shared/tax-year-reports";
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
// `get_expense_summary` join. There is no revenue breakdown: received rent is
// not split by type anywhere, and the charged split is the income statement's
// (do NOT invent one; matches the DATA-01 discipline). Its card, always empty,
// went in 66.2-39 part P. The lease profitability is get_financial_overview's own
// `lease_profitability` (20261102184504), through mapLeaseProfitability. The billing timeline and invoice summary,
// which had no source either, were deleted with their cards (66.2-39).

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
			const row = asObject(entry);
			const leaseId = text(row?.lease_id);
			if (row === null || leaseId === null) return [];
			return [
				{
					leaseId,
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
		totalExpenses,
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
		expenses: expenseBreakdownRows(options?.expenseSummary),
		totals: { revenue: totalRevenue, expenses: totalExpenses, netIncome },
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
// asserted. This never-throw mapper derives `metrics` + `categoryBreakdown`
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
			vendorName: String(v.vendor_name ?? ""),
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
export function mapMaintenanceTrends(
	raw: unknown,
): MaintenanceTrendPoint[] | null {
	const root = asObject(raw);
	if (finiteOrNull(root?.costed_requests) === null) return null;
	return (Array.isArray(root?.trendsOverTime) ? root.trendsOverTime : []).map(
		(entry) => {
			const point = asObject(entry) ?? {};
			return {
				period: String(point.month ?? ""),
				completed: Number(point.completed ?? 0),
				pending: Number(point.pending ?? 0),
				avgResolutionTime: finiteOrNull(point.avg_resolution_hours),
			};
		},
	);
}

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
 * `metrics` + `categoryBreakdown` from the request counts; `costs`, its
 * vendor `costBreakdown` and `trends` from 20261102184503's keys, null (empty
 * for the breakdown) when the body returns none. Never throws — non-object
 * input yields zeroed metrics and no costs or trends.
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
	};

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
		metrics,
		categoryBreakdown,
		costs,
		costTrends: [],
		costBreakdown: (costs?.vendors ?? []).map((v) => ({
			category: v.vendorName,
			amount: v.totalSpend,
			percentage:
				costs && costs.totalCost > 0
					? (v.totalSpend / costs.totalCost) * 100
					: 0,
		})),
		trends: mapMaintenanceTrends(raw),
		responseTimes: [],
		preventiveMaintenance: [],
	};
}
