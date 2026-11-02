/**
 * Report data shaping layer — converts existing analytics RPC results
 * into a normalized `ReportData` shape that PDF + Excel writers consume
 * uniformly. One builder per report type.
 *
 * Builders use the imperative `queryClient.query()` form so they can run
 * inside the `handleGenerateReport` click handler (which is not a React hook
 * context). They reuse the same query factories the existing report pages
 * already consume so cache + dedup are shared.
 *
 * Each `build*` function is kept under the 50-line CLAUDE.md cap by
 * delegating the per-section row literals to `*Rows()` helpers.
 */

import type { QueryClient, QueryExecuteOptions } from "@tanstack/react-query";
import { buildCashFlowView } from "#app/(owner)/reports/cash-flow/cash-flow-view";
import type { ReportType } from "#app/(owner)/reports/generate/components/report-types";
import { buildIncomeStatementView } from "#app/(owner)/reports/income-statement/income-statement-view";
import {
	maintenancePriorityLabel,
	maintenanceStatusLabel,
} from "#components/maintenance/detail/maintenance-utils";
import { financialQueries } from "#hooks/api/query-keys/financial-keys";
import { reportAnalyticsQueries } from "#hooks/api/query-keys/report-analytics-keys";
import { reportQueries } from "#hooks/api/query-keys/report-keys";
import { parseLocalYmd } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type { MaintenanceCostSummary } from "#types/analytics";
import type {
	CashFlowResult,
	IncomeStatementResult,
} from "#types/financial-statements";
import type {
	FinancialReport,
	MaintenanceReport,
	OccupancyMetrics,
	PropertyReport,
	RevenueData,
	TenantReport,
	YearEndResult,
	YearEndSummary,
} from "#types/reports";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportRow {
	label: string;
	value: string | number;
}

export interface ReportTable {
	headers: string[];
	rows: Array<Array<string | number>>;
}

export interface ReportSection {
	heading: string;
	rows?: ReportRow[];
	table?: ReportTable;
	note?: string;
}

export interface ReportData {
	title: string;
	subtitle: string;
	generatedAt: string;
	periodStart: string;
	periodEnd: string;
	sections: ReportSection[];
}

// ─── Safe-fetch + fallbacks ─────────────────────────────────────────────────

/**
 * Discriminate Postgres "relation does not exist" (`42P01`) errors — the only
 * class we intentionally swallow. Anything else is a real programming bug and
 * should surface, not silently fall back to zeros.
 *
 * Exported for unit-test pinning of the narrow-catch contract (cycle-6 IN-01).
 */
export function isMissingRelationError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const obj = err as { code?: unknown; message?: unknown };
	if (typeof obj.code === "string" && obj.code === "42P01") return true;
	if (
		typeof obj.message === "string" &&
		/relation\s+"[^"]+"\s+does\s+not\s+exist/i.test(obj.message)
	) {
		return true;
	}
	return false;
}

/**
 * Safe-fetch wrapper around `queryClient.query`. Some report RPCs may
 * reference a missing table or view (e.g. a fresh-DB chain replay where a
 * dependent migration hasn't landed yet, or a partially-rolled-back schema).
 * Rather than blocking the entire report on one broken RPC, we narrow the
 * catch to Postgres `42P01 relation does not exist` and fall back to a
 * caller-supplied default with `available: false` so the UI can render the
 * remaining sections.
 */
export async function safeFetch<TData, TQueryKey extends readonly unknown[]>(
	queryClient: QueryClient,
	options: QueryExecuteOptions<TData, Error, TData, TData, TQueryKey>,
	fallback: TData,
): Promise<{ data: TData; available: boolean }> {
	try {
		const data = await queryClient.query(options);
		return { data, available: true };
	} catch (err) {
		if (!isMissingRelationError(err)) {
			// Real programming bug — re-throw so the report click handler's
			// handleMutationError surfaces it (toast + Sentry breadcrumb).
			throw err;
		}
		if (process.env.NODE_ENV !== "production") {
			// dev-only diagnostic — known-deprecated RPC path
			console.warn(
				"[reports] RPC references a removed relation; falling back to zeros:",
				err,
			);
		}
		return { data: fallback, available: false };
	}
}

/** Only include `note` when there's a note to render — `note: undefined` is a
 *  type error under `exactOptionalPropertyTypes: true`. */
function noteIf(available: boolean): { note?: string } {
	return available ? {} : { note: UNAVAILABLE_NOTE };
}

const UNAVAILABLE_NOTE =
	"Some data could not be loaded for this period and is shown as 0 — usually because the report depends on an RPC that's pending a backend cleanup.";

const FINANCIAL_FALLBACK: FinancialReport = { expenseBreakdown: [] };

const OCCUPANCY_FALLBACK: OccupancyMetrics = {
	totalUnits: 0,
	occupiedUnits: 0,
	vacantUnits: 0,
	occupancyRate: 0,
	byProperty: [],
};

const PROPERTY_FALLBACK: PropertyReport = {
	summary: { totalProperties: 0 },
	byProperty: [],
};

const TENANT_FALLBACK: TenantReport = {
	summary: { totalTenants: 0, activeLeases: 0, leasesEndingSoon: 0 },
};

const MAINTENANCE_FALLBACK: MaintenanceReport = {
	summary: {
		totalRequests: 0,
		openRequests: 0,
		avgResolutionHours: 0,
	},
	costs: null,
	byStatus: [],
	byPriority: [],
};

// ─── Formatters ─────────────────────────────────────────────────────────────

const fmtMoney = (n: number): string =>
	formatCurrency(Number.isFinite(n) ? n : 0, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

/** Dollars to the cent, as the maintenance insights print a cost. */
const fmtCents = (n: number): string =>
	formatCurrency(Number.isFinite(n) ? n : 0);

const fmtPct = (n: number): string =>
	`${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

const fmtNumber = (n: number): string =>
	new Intl.NumberFormat("en-US").format(Number.isFinite(n) ? n : 0);

const fmtDate = (iso: string): string => {
	const d = parseLocalYmd(iso);
	return d
		? d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			})
		: iso;
};

const periodHeader = (start: string, end: string): string =>
	`${fmtDate(start)} – ${fmtDate(end)}`;

const baseHeader = (
	title: string,
	subtitle: string,
	start: string,
	end: string,
): Pick<
	ReportData,
	"title" | "subtitle" | "generatedAt" | "periodStart" | "periodEnd"
> => ({
	title,
	subtitle: `${subtitle} · ${periodHeader(start, end)}`,
	generatedAt: new Date().toISOString(),
	periodStart: start,
	periodEnd: end,
});

/**
 * The header of a report its RPCs give no period for (the maintenance and
 * lease portfolio reports: get_maintenance_analytics and get_dashboard_stats
 * take no dates): it says "To date" and names the day, never the period the
 * page offered. `asOf` is the day it was generated.
 */
const toDateHeader = (
	title: string,
	subtitle: string,
	asOf: string,
): Pick<
	ReportData,
	"title" | "subtitle" | "generatedAt" | "periodStart" | "periodEnd"
> => ({
	title,
	subtitle: `${subtitle} · To date, as of ${fmtDate(asOf)}`,
	generatedAt: new Date().toISOString(),
	periodStart: asOf,
	periodEnd: asOf,
});

// ─── Per-section row helpers (keep build* under the 50-line cap) ────────────

/** A dollar figure the server could not compute yet, written as such. */
const UNAVAILABLE = "Unavailable";

/**
 * The period's figures from the rent ledger, as the income statement and the
 * cash flow pages show them for the same period (built by the same view
 * builders): Total Revenue (charged, net of credits), Total Expenses and Net
 * Income from the income statement, Net Cash Flow (rent received) from the
 * cash flow. "Unavailable" for each the ledger cannot report yet
 * (get_billing_insights before 20261102055449), never $0. Before part N the
 * executive and financial-performance exports printed the active leases'
 * scheduled rent times twelve as "Total Income", and scheduled rent less a
 * twelfth of the expenses as "Cash Flow".
 */
function ledgerPeriodRows(
	income: IncomeStatementResult,
	cash: CashFlowResult,
): ReportRow[] {
	const statement =
		income.status === "ready"
			? buildIncomeStatementView(income.statement)
			: null;
	const flow = cash.status === "ready" ? buildCashFlowView(cash.report) : null;
	const money = (value: number | undefined) =>
		value === undefined ? UNAVAILABLE : fmtCents(value);
	return [
		{ label: "Total Revenue", value: money(statement?.totalRevenue) },
		{ label: "Total Expenses", value: money(statement?.totalExpenses) },
		{ label: "Net Income", value: money(statement?.netIncome) },
		{ label: "Net Cash Flow", value: money(flow?.netCashFlow) },
	];
}

/** Why a ledger figure reads "Unavailable", when one does. */
function ledgerNote(
	income: IncomeStatementResult,
	cash: CashFlowResult,
): { note?: string } {
	return income.status === "ready" && cash.status === "ready"
		? {}
		: { note: LEDGER_UNAVAILABLE_NOTE };
}

const LEDGER_UNAVAILABLE_NOTE =
	"Revenue, net income and cash flow come from your rent ledger, and its totals aren't available yet, so none is shown.";

/** Occupancy today: no RPC reports a past period's occupancy here. */
function occupancyTodayRows(occupancy: OccupancyMetrics): ReportRow[] {
	return [
		{ label: "Occupancy Rate (today)", value: fmtPct(occupancy.occupancyRate) },
		{
			label: "Occupied Units (today)",
			value: `${fmtNumber(occupancy.occupiedUnits)} of ${fmtNumber(occupancy.totalUnits)}`,
		},
	];
}

function propertyPortfolioSummaryRows(
	properties: PropertyReport,
	occupancy: OccupancyMetrics,
): ReportRow[] {
	return [
		{
			label: "Total Properties",
			value: fmtNumber(properties.summary.totalProperties),
		},
		{ label: "Total Units (today)", value: fmtNumber(occupancy.totalUnits) },
		{
			label: "Occupied Units (today)",
			value: fmtNumber(occupancy.occupiedUnits),
		},
		{ label: "Vacant Units (today)", value: fmtNumber(occupancy.vacantUnits) },
		{
			label: "Overall Occupancy (today)",
			value: fmtPct(occupancy.occupancyRate),
		},
	];
}

/**
 * As of today (get_dashboard_stats takes no dates). There is no turnover or
 * on-time payment rate: no source computes either (they read 0%).
 */
function leaseSummaryRows(tenants: TenantReport): ReportRow[] {
	return [
		{ label: "Total Tenants", value: fmtNumber(tenants.summary.totalTenants) },
		{ label: "Active Leases", value: fmtNumber(tenants.summary.activeLeases) },
		{
			// get_dashboard_stats' expiringSoon: an active lease whose end date is
			// within 30 days or already past. It said "next 90 days".
			label: "Active Leases Ending Within 30 Days",
			value: fmtNumber(tenants.summary.leasesEndingSoon),
		},
	];
}

function maintenanceSummaryRows(maintenance: MaintenanceReport): ReportRow[] {
	return [
		// get_maintenance_analytics takes no dates: every figure is to date
		// (open requests, now), whatever period the page offered.
		{
			label: "Total Requests to Date",
			value: fmtNumber(maintenance.summary.totalRequests),
		},
		{
			label: "Open Requests (now)",
			value: fmtNumber(maintenance.summary.openRequests),
		},
		{
			label: "Avg Resolution Time to Date",
			value: `${maintenance.summary.avgResolutionHours.toFixed(1)} hours`,
		},
		...maintenanceCostRows(maintenance.costs),
	];
}

/**
 * The spend to date the insights tab shows (get_maintenance_analytics,
 * 20261102184503, through the same mapper), to the cent as the tab prints it:
 * the expenses on the owner's requests, all time to date. When the server
 * cannot report it yet, each row says so instead of printing $0.00.
 */
function maintenanceCostRows(
	costs: MaintenanceCostSummary | null,
): ReportRow[] {
	return [
		{
			label: "Total Cost to Date",
			value: costs ? fmtCents(costs.totalCost) : UNAVAILABLE,
		},
		{
			label: "Requests with Costs",
			value: costs ? fmtNumber(costs.costedRequests) : UNAVAILABLE,
		},
		{
			label: "Average Cost per Request with Costs",
			value: costs
				? costs.averageCost === null
					? "None recorded"
					: fmtCents(costs.averageCost)
				: UNAVAILABLE,
		},
	];
}

/**
 * To the cent, as the year-end page and its CSV print them, so the summary
 * equals the sum of the By Property table (whole dollars rounded each row
 * apart and could not).
 */
function taxSummaryRows(yearEnd: YearEndSummary): ReportRow[] {
	return [
		{ label: "Tax Year", value: String(yearEnd.year) },
		{
			label: "Rent Received",
			value: fmtCents(yearEnd.rentReceived),
		},
		{
			label: "Operating Expenses",
			value: fmtCents(yearEnd.operatingExpenses),
		},
		{ label: "Net Income", value: fmtCents(yearEnd.netIncome) },
	];
}

// ─── Builders (one per ReportType) ──────────────────────────────────────────

/**
 * The period's ledger figures: the income statement and the cash flow over
 * the export's own period (financialQueries, the pages' own queries), so the
 * file holds what those pages show for it. A failure surfaces.
 */
async function fetchLedgerPeriod(qc: QueryClient, start: string, end: string) {
	const period = { start_date: start, end_date: end };
	return Promise.all([
		qc.query(financialQueries.incomeStatement(period)),
		qc.query(financialQueries.cashFlow(period)),
	]);
}

async function buildExecutiveMonthly(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const [[income, cash], occupancy, monthly] = await Promise.all([
		fetchLedgerPeriod(queryClient, start, end),
		safeFetch(
			queryClient,
			reportAnalyticsQueries.occupancyMetrics(),
			OCCUPANCY_FALLBACK,
		),
		safeFetch(
			queryClient,
			reportQueries.monthlyRevenue(12),
			[] as RevenueData[],
		),
	]);
	const monthlyRows: Array<Array<string | number>> = monthly.data.map((m) => [
		String(m.month),
		fmtMoney(m.revenue),
	]);
	return {
		...baseHeader("Executive Monthly Report", "Portfolio summary", start, end),
		sections: [
			{
				heading: "Key Metrics",
				rows: [
					...ledgerPeriodRows(income, cash),
					...occupancyTodayRows(occupancy.data),
				],
				...ledgerNote(income, cash),
			},
			{
				// get_revenue_trends_optimized sums the month's lease rent_amount:
				// scheduled rent, not money received, so it is labelled as such.
				heading: "Scheduled Rent (last 12 months)",
				table: { headers: ["Month", "Scheduled Rent"], rows: monthlyRows },
				...noteIf(occupancy.available && monthly.available),
			},
		],
	};
}

function financialExpenseRows(
	financial: FinancialReport,
	total: number,
): Array<Array<string | number>> {
	return financial.expenseBreakdown.map((e) => [
		e.category,
		fmtCents(e.amount),
		fmtPct(total > 0 ? (e.amount / total) * 100 : 0),
	]);
}

/**
 * The income statement's revenue lines for the period, as the page lists
 * them (Rent Charged, Late Fees Charged, Other Charges, Credits Issued).
 */
function revenueLineRows(
	income: IncomeStatementResult,
): Array<Array<string | number>> {
	if (income.status !== "ready") return [];
	return buildIncomeStatementView(income.statement).revenueItems.map((i) => [
		i.label,
		fmtCents(i.amount),
	]);
}

async function buildFinancialPerformance(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const [[income, cash], financialResult, occupancy] = await Promise.all([
		fetchLedgerPeriod(queryClient, start, end),
		safeFetch(
			queryClient,
			reportAnalyticsQueries.financial(start, end),
			FINANCIAL_FALLBACK,
		),
		safeFetch(
			queryClient,
			reportAnalyticsQueries.occupancyMetrics(),
			OCCUPANCY_FALLBACK,
		),
	]);
	const totalExpenses = financialResult.data.expenseBreakdown.reduce(
		(sum, e) => sum + e.amount,
		0,
	);
	return {
		...baseHeader(
			"Financial Performance Report",
			"Revenue · expenses · net income · cash flow",
			start,
			end,
		),
		sections: [
			{
				heading: "Summary",
				rows: [
					...ledgerPeriodRows(income, cash),
					{
						label: "Occupancy Rate (today)",
						value: fmtPct(occupancy.data.occupancyRate),
					},
				],
				...ledgerNote(income, cash),
			},
			{
				heading: "Revenue (charged)",
				table: {
					headers: ["Line", "Amount"],
					rows: revenueLineRows(income),
				},
				...ledgerNote(income, cash),
			},
			{
				heading: "Expense Categories",
				table: {
					headers: ["Category", "Amount", "% of Expenses"],
					rows: financialExpenseRows(financialResult.data, totalExpenses),
				},
				...noteIf(financialResult.available && occupancy.available),
			},
		],
	};
}

function propertyPerformanceRows(
	properties: PropertyReport,
): Array<Array<string | number>> {
	const money = (n: number | null) => (n === null ? UNAVAILABLE : fmtMoney(n));
	return properties.byProperty.map((p) => [
		p.propertyName,
		fmtPct(p.occupancyRate),
		money(p.rentReceived),
		money(p.expenses),
		money(p.netIncome),
	]);
}

const RENT_RECEIVED_UNAVAILABLE_NOTE =
	"Rent received isn't available yet: the server's rent ledger totals for properties are pending an update.";

/**
 * The portfolio's counts and occupancy today, and each property's rent
 * received and expenses over the period. There is no vacant-units column or
 * occupancy and vacancy trend: no source fills them (they read 0 and were
 * empty tables).
 */
function propertyPortfolioSections(
	properties: PropertyReport,
	occupancy: OccupancyMetrics,
	available: boolean,
): ReportSection[] {
	return [
		{
			heading: "Portfolio Summary",
			rows: propertyPortfolioSummaryRows(properties, occupancy),
		},
		{
			heading: "Property Performance",
			table: {
				headers: [
					"Property",
					"Occupancy (today)",
					"Rent Received",
					"Expenses",
					"Net Income",
				],
				rows: propertyPerformanceRows(properties),
			},
			...(properties.byProperty.some((p) => p.rentReceived === null)
				? { note: RENT_RECEIVED_UNAVAILABLE_NOTE }
				: noteIf(available)),
		},
	];
}

async function buildPropertyPortfolio(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const [propertiesResult, occupancyResult] = await Promise.all([
		safeFetch(
			queryClient,
			reportAnalyticsQueries.properties(start, end),
			PROPERTY_FALLBACK,
		),
		safeFetch(
			queryClient,
			reportAnalyticsQueries.occupancyMetrics(),
			OCCUPANCY_FALLBACK,
		),
	]);
	return {
		...baseHeader(
			"Property Portfolio Report",
			"Rent received · expenses · occupancy",
			start,
			end,
		),
		sections: propertyPortfolioSections(
			propertiesResult.data,
			occupancyResult.data,
			propertiesResult.available && occupancyResult.available,
		),
	};
}

async function buildLeasePortfolio(
	queryClient: QueryClient,
	_start: string,
	end: string,
): Promise<ReportData> {
	const tenantsResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.tenants(),
		TENANT_FALLBACK,
	);
	return {
		// get_dashboard_stats takes no dates: the report is as of today.
		...toDateHeader("Lease Portfolio Report", "Tenants and leases", end),
		sections: [
			{
				heading: "Lease Summary",
				rows: leaseSummaryRows(tenantsResult.data),
				...noteIf(tenantsResult.available),
			},
		],
	};
}

function maintenanceOperationsSections(
	maintenance: MaintenanceReport,
	available: boolean,
): ReportSection[] {
	const byStatusRows = maintenance.byStatus.map(
		(s): Array<string | number> => [
			maintenanceStatusLabel(s.status),
			fmtNumber(s.count),
		],
	);
	const byPriorityRows = maintenance.byPriority.map(
		(p): Array<string | number> => [
			maintenancePriorityLabel(p.priority),
			fmtNumber(p.count),
		],
	);
	const costs = maintenance.costs;
	const costNote = costs ? {} : { note: MAINTENANCE_COSTS_UNAVAILABLE_NOTE };
	return [
		{
			heading: "Operations Summary",
			rows: maintenanceSummaryRows(maintenance),
		},
		{
			heading: "By Status (to date)",
			table: { headers: ["Status", "Count"], rows: byStatusRows },
		},
		{
			heading: "By Priority (to date)",
			table: { headers: ["Priority", "Count"], rows: byPriorityRows },
			...noteIf(available),
		},
		{
			heading: "Monthly Cost (last 12 months)",
			table: {
				headers: ["Month", "Cost"],
				rows: (costs?.monthlyCost ?? []).map(
					(m): Array<string | number> => [m.month, fmtCents(m.cost)],
				),
			},
			...costNote,
		},
		{
			heading: "Vendor Spend to Date",
			table: {
				headers: ["Vendor", "Jobs", "Total Spend"],
				rows: (costs?.vendors ?? []).map(
					(v): Array<string | number> => [
						v.vendorName,
						fmtNumber(v.jobs),
						fmtCents(v.totalSpend),
					],
				),
			},
			...costNote,
		},
	];
}

const MAINTENANCE_COSTS_UNAVAILABLE_NOTE =
	"Maintenance costs aren't available yet: the server does not report them, so none is shown.";

/**
 * get_maintenance_analytics takes no dates (and its signature cannot change
 * before the post-merge apply), so the report is to date, as the generate
 * page's card says; it never claims the period the page offered.
 */
async function buildMaintenanceOperations(
	queryClient: QueryClient,
	_start: string,
	end: string,
): Promise<ReportData> {
	const maintenanceResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.maintenance(),
		MAINTENANCE_FALLBACK,
	);
	return {
		...toDateHeader(
			"Maintenance Operations Report",
			"Response times · status · urgency · costs",
			end,
		),
		sections: maintenanceOperationsSections(
			maintenanceResult.data,
			maintenanceResult.available,
		),
	};
}

/**
 * The tax-preparation export when the server cannot report the year's rent
 * received yet: one section that says so, and no figure written as $0.
 */
function taxPreparationUnavailableSections(year: number): ReportSection[] {
	return [
		{
			heading: "Annual Summary",
			rows: [
				{ label: "Tax Year", value: String(year) },
				{ label: "Rent Received", value: UNAVAILABLE },
				{ label: "Net Income", value: UNAVAILABLE },
			],
			note: "Rent received comes from your rent ledger, and its totals aren't available yet.",
		},
	];
}

function taxPreparationSections(
	yearEnd: YearEndSummary,
	available: boolean,
): ReportSection[] {
	// Every property with rent or spend in the year, one deleted since named
	// as deleted (the label map), to the cent: they sum to the summary.
	const byPropertyRows = yearEnd.byProperty.map(
		(p): Array<string | number> => [
			p.propertyName,
			fmtCents(p.rentReceived),
			fmtCents(p.expenses),
			fmtCents(p.netIncome),
		],
	);
	const expenseRows = yearEnd.expenseByCategory.map(
		(e): Array<string | number> => [e.category, fmtCents(e.amount)],
	);
	return [
		{ heading: "Annual Summary", rows: taxSummaryRows(yearEnd) },
		{
			heading: "Income by Property (Schedule E support)",
			table: {
				headers: ["Property", "Rent Received", "Expenses", "Net Income"],
				rows: byPropertyRows,
			},
			note: "Consult a CPA before filing — line-item mappings are advisory.",
		},
		{
			heading: "Expense by Category",
			table: { headers: ["Category", "Amount"], rows: expenseRows },
			...noteIf(available),
		},
	];
}

async function buildTaxPreparation(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const year =
		parseLocalYmd(end)?.getFullYear() ?? new Date(end).getUTCFullYear();
	const fallback: YearEndResult = { status: "ledger-unavailable", year };
	const yearEndResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.yearEnd(year),
		fallback,
	);
	const result = yearEndResult.data;
	return {
		...baseHeader(
			`Tax Preparation — ${year}`,
			"Rent received · expenses · property breakdown",
			start,
			end,
		),
		sections:
			result.status === "ready"
				? taxPreparationSections(result.summary, yearEndResult.available)
				: taxPreparationUnavailableSections(year),
	};
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

const BUILDERS: Record<
	ReportType,
	(qc: QueryClient, start: string, end: string) => Promise<ReportData>
> = {
	"executive-monthly": buildExecutiveMonthly,
	"financial-performance": buildFinancialPerformance,
	"property-portfolio": buildPropertyPortfolio,
	"lease-portfolio": buildLeasePortfolio,
	"maintenance-operations": buildMaintenanceOperations,
	"tax-preparation": buildTaxPreparation,
};

export async function buildReportData(
	reportType: ReportType,
	queryClient: QueryClient,
	start_date: string,
	end_date: string,
): Promise<ReportData> {
	const builder = BUILDERS[reportType];
	if (!builder) {
		throw new Error(`Unknown report type: ${reportType}`);
	}
	return builder(queryClient, start_date, end_date);
}
