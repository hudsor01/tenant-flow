/**
 * Analytics Types - Common interfaces for analytics across all domains
 * Consolidates shared analytics patterns used by property, occupancy, financial, and other analytics modules
 */

// Base analytics data point
export interface AnalyticsDataPoint {
	label: string;
	value: number;
	timestamp?: string;
	metadata?: Record<string, unknown>;
}

// Time-series analytics
export interface TimeSeriesDataPoint {
	date: string;
	value: number;
	label?: string;
}

// 6-month aggregate revenue point — emitted by ts_revenue_6mo CTE in
// supabase/migrations/20260526203003_phase4_revenue_trend_6mo.sql.
// `month` is "YYYY-MM" (first day of month); `value` is sum in dollars.
// Intentionally distinct from TimeSeriesDataPoint: 6mo buckets key by `month`,
// 30d points key by `date`.
export interface MonthlyRevenuePoint {
	month: string; // "YYYY-MM"
	value: number; // dollars
}

/**
 * One of get_dashboard_data_v2's `trends` (20261102184501): today's figure
 * against the earlier day's. `percentChange` is the change over the earlier
 * figure, null when that was 0 (no prior figure, never 0%); `window` the two
 * days compared, null from a body that states none (its figures are no
 * change: mapMetricTrend).
 */
export interface MetricTrend {
	current: number;
	previous: number | null;
	change: number; // Absolute change
	percentChange: number | null; // Percentage change; null with no prior figure
	trend: "up" | "down" | "stable"; // Direction derived from change sign
	window: DateWindow | null;
}

// Common analytics metric summary
export interface MetricSummary {
	label: string;
	value: number;
	trend?: MetricTrend;
	comparison?: {
		period: string;
		percentChange: number;
	};
}

// Common analytics breakdown row
export interface AnalyticsBreakdownRow {
	label: string;
	value: number;
	percentage?: number | null;
	change?: number | null;
	trend?: "up" | "down" | "stable";
}

// Analytics response with breakdown
export interface AnalyticsBreakdown {
	items: AnalyticsBreakdownRow[];
	total: number;
	summary?: MetricSummary;
}

// Analytics time-series response
export interface TimeSeriesResponse {
	dataPoints: TimeSeriesDataPoint[];
	summary: {
		min: number;
		max: number;
		average: number;
		total: number;
	};
	period: {
		start: string;
		end: string;
	};
}

// Analytics pagination response
export interface AnalyticsPaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}

// Analytics chart data structure
export interface ChartDataPoint {
	x: string | number;
	y: number;
	label?: string;
	metadata?: Record<string, unknown>;
}

// Analytics event/activity
export interface AnalyticsEvent {
	eventType: string;
	entityType: string;
	entityId: string;
	userId?: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

// Analytics filter options
export interface AnalyticsFilterOptions {
	dateFrom?: string;
	dateTo?: string;
	period?: "day" | "week" | "month" | "quarter" | "year" | "custom";
	limit?: number;
	offset?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

// Analytics aggregation options
export interface AggregationOptions {
	granularity: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
	metric: string;
	groupBy?: string;
}

// Common analytics page response structure
export interface AnalyticsPageResponse<T extends Record<string, unknown>> {
	metrics: T;
	timestamp: string;
	period?: {
		start: string;
		end: string;
	};
}

// Comparison metrics
export interface ComparisonMetric {
	current: number;
	previous: number;
	change: number;
	percentChange: number;
	trend: "up" | "down" | "stable";
}

// Analytics summary snapshot
export interface AnalyticsSummary {
	totalCount: number;
	activeCount: number;
	inactiveCount: number;
	changePercent: number;
	trend: "up" | "down" | "stable";
}

export interface FinancialMetricSummary {
	/**
	 * SCHEDULED rent: lease-derived expected revenue, surfaced under the
	 * explicit "Scheduled" label (D-07). Unchanged calculation — every downstream
	 * derivation (netIncome, profitMargin) still uses THIS figure, not
	 * `totalCollected`.
	 */
	totalRevenue: number;
	/**
	 * COLLECTED: receipts actually recorded in the rent ledger over the trailing
	 * 12 months (D-07). A separate, separately-labeled figure — it is never added
	 * to `totalRevenue` and never re-bases profit or NOI.
	 */
	totalCollected: number;
	/** Scheduled rent less expenses: not income on a received basis. */
	netIncome: number;
	/** netIncome over totalRevenue, in percent: a margin on scheduled rent. */
	profitMargin?: number | null;
}

export interface FinancialBreakdownRow {
	label: string;
	value: number;
	change?: number | null;
}

export interface RevenueExpenseBreakdown {
	expenses: FinancialBreakdownRow[];
}

/**
 * One bar of the financial page's Scheduled Net chart: `propertyName` is the
 * month it covers (the schema has no per-property expense split) and `noi`
 * that month's scheduled rent less expenses.
 */
export interface NetOperatingIncomeByProperty {
	propertyName: string;
	noi: number;
}

/**
 * One of get_expense_summary's `categories`: a period's expenses by vendor
 * (the expenses page's year to date, the tax documents' tax year). A
 * "category" is the vendor's name as the owner entered it, or NO_VENDOR_LABEL
 * for the expenses with none (the mappers name them, expenseVendorLabel); the
 * data model has no expense category of its own.
 */
export interface ExpenseCategorySummary {
	category: string;
	amount: number;
	percentage: number;
}

export interface MonthlyFinancialMetric {
	month: string;
	revenue: number;
	expenses: number;
	netIncome: number;
}

/**
 * One lease's profitability over a period (get_financial_overview's
 * `lease_profitability`, 20261102184504): the rent received on it (the rent
 * ledger) less the expenses on its unit's maintenance requests dated in the
 * period on a day it ran. Dollars.
 */
export interface LeaseProfitabilityRow {
	/** As the report label map prints it: a property deleted since says so. */
	propertyName: string;
	unitNumber: string | null;
	tenantName: string | null;
	rentReceived: number;
	expenses: number;
	net: number;
}

/**
 * The lease profitability table's data: `ready` beside the period it covers,
 * `unavailable` from a body that reports none (the bodies before
 * 20261102184504 return no `lease_profitability`), never an empty table.
 */
export type LeaseProfitability =
	| {
			readonly status: "ready";
			readonly window: DateWindow;
			readonly leases: LeaseProfitabilityRow[];
	  }
	| { readonly status: "unavailable" };

export interface MaintenanceCostBreakdownEntry {
	category: string;
	amount: number;
}

export interface MaintenanceTrendPoint {
	period: string;
	/** Requests completed in the month. */
	completed: number;
	/** Requests open at the month's end. */
	pending: number;
}

/**
 * get_maintenance_analytics' spend (20261102184503), to date, in dollars: the
 * expenses on the owner's maintenance requests, never actual_cost.
 */
export interface MaintenanceCostSummary {
	totalCost: number;
	/** The requests with at least one expense: averageCost's denominator. */
	costedRequests: number;
	/** totalCost / costedRequests; null when no request has a cost. */
	averageCost: number | null;
	/** The trailing 12 calendar months, oldest first. */
	monthlyCost: Array<{ month: string; cost: number }>;
	/** By vendor, largest spend first; jobs are the requests it was on. */
	vendors: Array<{ vendorName: string; totalSpend: number; jobs: number }>;
}

export interface MaintenanceCategoryBreakdown {
	category: string;
	count: number;
}

export interface OccupancyTrendPoint {
	period: string;
	occupancyRate: number;
}

/**
 * The days a figure covers, both included, as local YYYY-MM-DD: a period a
 * page requests (the income statement's, a property report's), or one an RPC
 * states ('YYYY-MM-DD/YYYY-MM-DD', read by `#lib/stated-window`): the window
 * get_property_performance_analytics states in its `timeframe` column
 * (20261102163709), the two days the dashboard trends compare
 * (20261102184501), the prior period an expense year over year compares with
 * (20261102184502).
 */
export interface DateWindow {
	start_date: string;
	end_date: string;
}

/**
 * The analytics overview's two trends, from get_dashboard_data_v2
 * (20261102184501). `unavailable`: the server's body states no window, so its
 * figure (a literal 0, or a comparison against only the leases still active
 * today) is no figure. `percent` is null when nothing was scheduled on the
 * window's first day: there is no prior figure.
 */
export interface PortfolioTrends {
	occupancy:
		| { status: "ready"; points: number; window: DateWindow }
		| { status: "unavailable" };
	revenue:
		| { status: "ready"; percent: number | null; window: DateWindow }
		| { status: "unavailable" };
}

/**
 * get_expense_summary's year over year (20261102184502): the change against
 * `priorPeriod`, the same dates a year earlier, or null when nothing was spent
 * then. `unavailable`: the server states no prior period (its null is no
 * figure).
 */
export type ExpenseYearOverYear =
	| { status: "ready"; change: number | null; priorPeriod: DateWindow }
	| { status: "unavailable" };

export interface PropertyPerformanceEntry {
	property_id: string;
	propertyName: string;
	occupancyRate: number;
	/**
	 * Rent received over the page's window, from the rent ledger, in dollars;
	 * null when the server cannot report it yet (the body before
	 * 20261102163709, whose 0 is no figure).
	 */
	rentReceived: number | null;
	totalUnits: number;
	occupiedUnits: number;
}

export interface PropertyPerformanceSummary {
	totalProperties: number;
	totalUnits: number;
	occupiedUnits: number;
	averageOccupancy: number;
	/** Rent received across the properties over the window; null as above. */
	rentReceived: number | null;
	/** The window rent received covers; null when it is unavailable. */
	rentReceivedWindow: DateWindow | null;
	bestPerformer?: string;
}

export interface PropertyUnitDetail {
	property_id: string;
	/** NULL when the owner gave the unit none. */
	unit_number: string | null;
	status: string;
	bedrooms?: number | null;
	bathrooms?: number | null;
	rent?: number | null;
}

export interface UnitStatisticEntry {
	label: string;
	value: number;
	trend?: number | null;
}

export interface PropertyPerformancePageResponse {
	metrics: PropertyPerformanceSummary;
	performance: PropertyPerformanceEntry[];
	units: PropertyUnitDetail[];
	unitStats: UnitStatisticEntry[];
}

/**
 * Per-template email deliverability aggregate from
 * `get_deliverability_stats(p_days integer)`.
 *
 * Rates are stored as percentage points (0..100) — the RPC multiplies by 100
 * before returning. UI renders with single-decimal formatting.
 */
export interface DeliverabilityStats {
	templateTag: string;
	sent: number;
	delivered: number;
	opened: number;
	bounced: number;
	complained: number;
	bouncePercent: number; // 0..100
	complaintPercent: number; // 0..100
}

/**
 * Per-feature paywall-gate conversion stats from `get_gate_conversion_stats`.
 * `gateHits` = total 402 responses; `distinctUsersHit` = unique users who saw
 * the gate; `upgradesFromGate` = Stripe subscriptions with matching
 * `metadata.source` tag; `conversionRate` = upgrades / distinctUsersHit
 * (null when denominator is zero).
 */
export interface GateConversionStats {
	feature: string;
	gateHits: number;
	distinctUsersHit: number;
	upgradesFromGate: number;
	conversionRate: number | null;
}

/**
 * Closed set of funnel step identifiers enforced by the
 * `onboarding_funnel_events.step_name` CHECK constraint in
 * supabase/migrations/20260415193247_onboarding_funnel_events_schema.sql.
 */
export type FunnelStepName = "signup" | "first_property" | "first_tenant";

/**
 * Single funnel step summary returned by `get_funnel_stats`.
 *
 * `conversionRateFromPrior` / `conversionRateFromSignup`: 0..1 fractions
 * (the RPC rounds to 4 decimal places; multiply by 100 in UI for display).
 * Both are null when the denominator is zero (empty upstream cohort) so
 * callers never crash on NaN from a divide-by-zero.
 *
 * `medianDaysFromPrior` / `medianDaysFromSignup`: null for the signup row
 * and whenever no cohort members reached the step.
 */
export interface FunnelStep {
	step: FunnelStepName;
	stepOrder: number;
	count: number;
	conversionRateFromPrior: number | null;
	conversionRateFromSignup: number | null;
	medianDaysFromPrior: number | null;
	medianDaysFromSignup: number | null;
}

/**
 * Signup-cohort funnel aggregate from
 * `get_funnel_stats(p_from timestamptz, p_to timestamptz)`.
 *
 * Cohort = owners whose signup completed_at is in [from, to]. Downstream
 * step counts track those same owners at ANY later time, not only within
 * the window (D2 signup-cohort semantics).
 *
 * `cohortLabel` is the human-readable window string the RPC formats for the
 * admin UI header ("owners who signed up between ...").
 */
export interface FunnelStats {
	from: string; // ISO timestamptz
	to: string; // ISO timestamptz
	cohortLabel: string;
	mediansComputedAt: string; // ISO timestamptz
	steps: FunnelStep[];
}
