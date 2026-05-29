/**
 * Report data shaping layer — converts existing analytics RPC results
 * into a normalized `ReportData` shape that PDF + Excel writers consume
 * uniformly. One builder per report type.
 *
 * Builders use the imperative `queryClient.fetchQuery()` form so they can run
 * inside the `handleGenerateReport` click handler (which is not a React hook
 * context). They reuse the same query factories the existing report pages
 * already consume so cache + dedup are shared.
 *
 * Each `build*` function is kept under the 50-line CLAUDE.md cap by
 * delegating the per-section row literals to `*Rows()` helpers.
 */

import type { FetchQueryOptions, QueryClient } from "@tanstack/react-query";
import type { ReportType } from "#app/(owner)/reports/generate/components/report-types";
import { reportAnalyticsQueries } from "#hooks/api/query-keys/report-analytics-keys";
import { reportQueries } from "#hooks/api/query-keys/report-keys";
import type {
	FinancialReport,
	MaintenanceReport,
	OccupancyMetrics,
	PropertyReport,
	ReportPaymentAnalytics,
	RevenueData,
	TenantReport,
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
 * Safe-fetch wrapper around `queryClient.fetchQuery`. Some report RPCs may
 * reference a missing table or view (e.g. a fresh-DB chain replay where a
 * dependent migration hasn't landed yet, or a partially-rolled-back schema).
 * Rather than blocking the entire report on one broken RPC, we narrow the
 * catch to Postgres `42P01 relation does not exist` and fall back to a
 * caller-supplied default with `available: false` so the UI can render the
 * remaining sections.
 */
export async function safeFetch<TData, TQueryKey extends readonly unknown[]>(
	queryClient: QueryClient,
	options: FetchQueryOptions<TData, Error, TData, TQueryKey>,
	fallback: TData,
): Promise<{ data: TData; available: boolean }> {
	try {
		const data = await queryClient.fetchQuery(options);
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

const FINANCIAL_FALLBACK: FinancialReport = {
	summary: {
		totalIncome: 0,
		totalExpenses: 0,
		netIncome: 0,
		cashFlow: 0,
		rentRollOccupancyRate: 0,
	},
	monthly: [],
	expenseBreakdown: [],
	rentRoll: [],
};

const OCCUPANCY_FALLBACK: OccupancyMetrics = {
	totalUnits: 0,
	occupiedUnits: 0,
	vacantUnits: 0,
	occupancyRate: 0,
	byProperty: [],
};

const PAYMENTS_FALLBACK: ReportPaymentAnalytics = {
	totalPayments: 0,
	successfulPayments: 0,
	failedPayments: 0,
	totalRevenue: 0,
	averagePayment: 0,
	paymentsByMethod: { card: 0, ach: 0 },
	paymentsByStatus: { completed: 0, pending: 0, failed: 0 },
};

const PROPERTY_FALLBACK: PropertyReport = {
	summary: {
		totalProperties: 0,
		totalUnits: 0,
		occupiedUnits: 0,
		occupancyRate: 0,
	},
	byProperty: [],
	occupancyTrend: [],
	vacancyTrend: [],
};

const TENANT_FALLBACK: TenantReport = {
	summary: {
		totalTenants: 0,
		activeLeases: 0,
		leasesExpiringNext90: 0,
		turnoverRate: 0,
		onTimePaymentRate: 0,
	},
	paymentHistory: [],
	leaseExpirations: [],
	turnover: [],
};

const MAINTENANCE_FALLBACK: MaintenanceReport = {
	summary: {
		totalRequests: 0,
		openRequests: 0,
		avgResolutionHours: 0,
		totalCost: 0,
		averageCost: 0,
	},
	byStatus: [],
	byPriority: [],
	monthlyCost: [],
	vendorPerformance: [],
};

const YEAREND_FALLBACK: YearEndSummary = {
	year: new Date().getFullYear(),
	grossRentalIncome: 0,
	operatingExpenses: 0,
	netIncome: 0,
	byProperty: [],
	expenseByCategory: [],
};

// ─── Formatters ─────────────────────────────────────────────────────────────

const fmtMoney = (n: number): string =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(Number.isFinite(n) ? n : 0);

const fmtPct = (n: number): string =>
	`${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

const fmtNumber = (n: number): string =>
	new Intl.NumberFormat("en-US").format(Number.isFinite(n) ? n : 0);

const fmtDate = (iso: string): string => {
	const d = new Date(iso);
	return Number.isNaN(d.getTime())
		? iso
		: d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
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

// ─── Per-section row helpers (keep build* under the 50-line cap) ────────────

function executiveKeyMetricsRows(
	financial: FinancialReport,
	occupancy: OccupancyMetrics,
	payments: ReportPaymentAnalytics,
): ReportRow[] {
	return [
		{ label: "Total Income", value: fmtMoney(financial.summary.totalIncome) },
		{
			label: "Total Expenses",
			value: fmtMoney(financial.summary.totalExpenses),
		},
		{ label: "Net Income", value: fmtMoney(financial.summary.netIncome) },
		{ label: "Cash Flow", value: fmtMoney(financial.summary.cashFlow) },
		{ label: "Occupancy Rate", value: fmtPct(occupancy.occupancyRate) },
		{
			label: "Occupied Units",
			value: `${fmtNumber(occupancy.occupiedUnits)} of ${fmtNumber(occupancy.totalUnits)}`,
		},
		{ label: "Total Payments", value: fmtNumber(payments.totalPayments) },
		{
			label: "Successful Payments",
			value: fmtNumber(payments.successfulPayments),
		},
	];
}

function financialSummaryRows(financial: FinancialReport): ReportRow[] {
	return [
		{ label: "Total Income", value: fmtMoney(financial.summary.totalIncome) },
		{
			label: "Total Expenses",
			value: fmtMoney(financial.summary.totalExpenses),
		},
		{ label: "Net Income", value: fmtMoney(financial.summary.netIncome) },
		{ label: "Cash Flow", value: fmtMoney(financial.summary.cashFlow) },
		{
			label: "Rent-Roll Occupancy",
			value: fmtPct(financial.summary.rentRollOccupancyRate),
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
		{ label: "Total Units", value: fmtNumber(occupancy.totalUnits) },
		{ label: "Occupied Units", value: fmtNumber(occupancy.occupiedUnits) },
		{ label: "Vacant Units", value: fmtNumber(occupancy.vacantUnits) },
		{ label: "Overall Occupancy", value: fmtPct(occupancy.occupancyRate) },
	];
}

function leaseSummaryRows(tenants: TenantReport): ReportRow[] {
	return [
		{ label: "Total Tenants", value: fmtNumber(tenants.summary.totalTenants) },
		{ label: "Active Leases", value: fmtNumber(tenants.summary.activeLeases) },
		{
			label: "Expiring (next 90 days)",
			value: fmtNumber(tenants.summary.leasesExpiringNext90),
		},
		{ label: "Turnover Rate", value: fmtPct(tenants.summary.turnoverRate) },
		{
			label: "On-Time Payment Rate",
			value: fmtPct(tenants.summary.onTimePaymentRate),
		},
	];
}

function maintenanceSummaryRows(maintenance: MaintenanceReport): ReportRow[] {
	return [
		{
			label: "Total Requests",
			value: fmtNumber(maintenance.summary.totalRequests),
		},
		{
			label: "Open Requests",
			value: fmtNumber(maintenance.summary.openRequests),
		},
		{
			label: "Avg Resolution Time",
			value: `${maintenance.summary.avgResolutionHours.toFixed(1)} hours`,
		},
		{ label: "Total Cost", value: fmtMoney(maintenance.summary.totalCost) },
		{
			label: "Average Cost / Request",
			value: fmtMoney(maintenance.summary.averageCost),
		},
	];
}

function taxSummaryRows(yearEnd: YearEndSummary): ReportRow[] {
	return [
		{ label: "Tax Year", value: String(yearEnd.year) },
		{
			label: "Gross Rental Income",
			value: fmtMoney(yearEnd.grossRentalIncome),
		},
		{
			label: "Operating Expenses",
			value: fmtMoney(yearEnd.operatingExpenses),
		},
		{ label: "Net Income", value: fmtMoney(yearEnd.netIncome) },
	];
}

// ─── Builders (one per ReportType) ──────────────────────────────────────────

async function fetchExecutiveMonthly(
	qc: QueryClient,
	start: string,
	end: string,
) {
	return Promise.all([
		safeFetch(
			qc,
			reportAnalyticsQueries.financial(start, end),
			FINANCIAL_FALLBACK,
		),
		safeFetch(
			qc,
			reportAnalyticsQueries.occupancyMetrics(),
			OCCUPANCY_FALLBACK,
		),
		safeFetch(
			qc,
			reportAnalyticsQueries.paymentAnalytics(start, end),
			PAYMENTS_FALLBACK,
		),
		safeFetch(qc, reportQueries.monthlyRevenue(12), [] as RevenueData[]),
	]);
}

async function buildExecutiveMonthly(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const [financial, occupancy, payments, monthly] = await fetchExecutiveMonthly(
		queryClient,
		start,
		end,
	);
	const monthlyRows: Array<Array<string | number>> = monthly.data.map((m) => [
		String(m.month),
		fmtMoney(m.revenue),
	]);
	const allAvailable =
		financial.available &&
		occupancy.available &&
		payments.available &&
		monthly.available;
	return {
		...baseHeader("Executive Monthly Report", "Portfolio summary", start, end),
		sections: [
			{
				heading: "Key Metrics",
				rows: executiveKeyMetricsRows(
					financial.data,
					occupancy.data,
					payments.data,
				),
			},
			{
				heading: "Monthly Revenue (last 12 months)",
				table: { headers: ["Month", "Revenue"], rows: monthlyRows },
				...noteIf(allAvailable),
			},
		],
	};
}

function financialMonthlyRows(
	financial: FinancialReport,
): Array<Array<string | number>> {
	return financial.monthly.map((m) => [
		m.month,
		fmtMoney(m.income),
		fmtMoney(m.expenses),
		fmtMoney(m.net),
	]);
}

function financialExpenseRows(
	financial: FinancialReport,
): Array<Array<string | number>> {
	const total = financial.summary.totalExpenses;
	return financial.expenseBreakdown.map((e) => [
		e.category,
		fmtMoney(e.amount),
		fmtPct(total > 0 ? (e.amount / total) * 100 : 0),
	]);
}

function financialRentRollRows(
	financial: FinancialReport,
): Array<Array<string | number>> {
	return financial.rentRoll.map((r) => [
		r.propertyName,
		`${fmtNumber(r.occupiedUnits)}/${fmtNumber(r.unitCount)}`,
		fmtPct(r.occupancyRate),
		fmtMoney(r.rentPotential),
	]);
}

function financialPerformanceSections(
	financial: FinancialReport,
	available: boolean,
): ReportSection[] {
	return [
		{ heading: "Summary", rows: financialSummaryRows(financial) },
		{
			heading: "Monthly Breakdown",
			table: {
				headers: ["Month", "Income", "Expenses", "Net"],
				rows: financialMonthlyRows(financial),
			},
		},
		{
			heading: "Expense Categories",
			table: {
				headers: ["Category", "Amount", "% of Expenses"],
				rows: financialExpenseRows(financial),
			},
		},
		{
			heading: "Rent Roll",
			table: {
				headers: [
					"Property",
					"Units (occ/total)",
					"Occupancy",
					"Rent Potential",
				],
				rows: financialRentRollRows(financial),
			},
			...noteIf(available),
		},
	];
}

async function buildFinancialPerformance(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const financialResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.financial(start, end),
		FINANCIAL_FALLBACK,
	);
	return {
		...baseHeader(
			"Financial Performance Report",
			"P&L · NOI · Expense breakdown",
			start,
			end,
		),
		sections: financialPerformanceSections(
			financialResult.data,
			financialResult.available,
		),
	};
}

function propertyPerformanceRows(
	properties: PropertyReport,
): Array<Array<string | number>> {
	return properties.byProperty.map((p) => [
		p.propertyName,
		fmtPct(p.occupancyRate),
		fmtNumber(p.vacantUnits),
		fmtMoney(p.revenue),
		fmtMoney(p.expenses),
		fmtMoney(p.netOperatingIncome),
	]);
}

function propertyOccupancyTrendRows(
	properties: PropertyReport,
): Array<Array<string | number>> {
	return properties.occupancyTrend.map((t) => [
		t.month,
		fmtPct(t.occupancyRate),
	]);
}

function propertyVacancyTrendRows(
	properties: PropertyReport,
): Array<Array<string | number>> {
	return properties.vacancyTrend.map((v) => [
		v.month,
		fmtNumber(v.vacantUnits),
	]);
}

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
					"Occupancy",
					"Vacant",
					"Revenue",
					"Expenses",
					"NOI",
				],
				rows: propertyPerformanceRows(properties),
			},
		},
		{
			heading: "Occupancy Trend",
			table: {
				headers: ["Month", "Occupancy Rate"],
				rows: propertyOccupancyTrendRows(properties),
			},
		},
		{
			heading: "Vacancy Trend",
			table: {
				headers: ["Month", "Vacant Units"],
				rows: propertyVacancyTrendRows(properties),
			},
			...noteIf(available),
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
			"Property rankings · occupancy · vacancy",
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

function leaseExpirationRows(
	tenants: TenantReport,
): Array<Array<string | number>> {
	return tenants.leaseExpirations.map((l) => [
		l.propertyName,
		l.unitLabel,
		fmtDate(l.endDate),
	]);
}

function leasePaymentRows(
	tenants: TenantReport,
): Array<Array<string | number>> {
	return tenants.paymentHistory.map((p) => [
		p.month,
		fmtNumber(p.paymentsReceived),
		fmtPct(p.onTimeRate),
	]);
}

function leaseTurnoverRows(
	tenants: TenantReport,
): Array<Array<string | number>> {
	return tenants.turnover.map((t) => [
		t.month,
		fmtNumber(t.moveIns),
		fmtNumber(t.moveOuts),
	]);
}

function leasePortfolioSections(
	tenants: TenantReport,
	available: boolean,
): ReportSection[] {
	return [
		{ heading: "Lease Summary", rows: leaseSummaryRows(tenants) },
		{
			heading: "Lease Expirations",
			table: {
				headers: ["Property", "Unit", "Lease End Date"],
				rows: leaseExpirationRows(tenants),
			},
		},
		{
			heading: "Payment History",
			table: {
				headers: ["Month", "Payments Received", "On-Time Rate"],
				rows: leasePaymentRows(tenants),
			},
		},
		{
			heading: "Tenant Turnover",
			table: {
				headers: ["Month", "Moved In", "Moved Out"],
				rows: leaseTurnoverRows(tenants),
			},
			...noteIf(available),
		},
	];
}

async function buildLeasePortfolio(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const tenantsResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.tenants(start, end),
		TENANT_FALLBACK,
	);
	return {
		...baseHeader(
			"Lease Portfolio Report",
			"Lease analytics · expirations · payment history",
			start,
			end,
		),
		sections: leasePortfolioSections(
			tenantsResult.data,
			tenantsResult.available,
		),
	};
}

function maintenanceOperationsSections(
	maintenance: MaintenanceReport,
	available: boolean,
): ReportSection[] {
	const byStatusRows = maintenance.byStatus.map(
		(s): Array<string | number> => [s.status, fmtNumber(s.count)],
	);
	const byPriorityRows = maintenance.byPriority.map(
		(p): Array<string | number> => [p.priority, fmtNumber(p.count)],
	);
	const monthlyCostRows = maintenance.monthlyCost.map(
		(m): Array<string | number> => [m.month, fmtMoney(m.cost)],
	);
	const vendorRows = maintenance.vendorPerformance.map(
		(v): Array<string | number> => [
			v.vendorName,
			fmtNumber(v.jobs),
			fmtMoney(v.totalSpend),
		],
	);
	return [
		{
			heading: "Operations Summary",
			rows: maintenanceSummaryRows(maintenance),
		},
		{
			heading: "By Status",
			table: { headers: ["Status", "Count"], rows: byStatusRows },
		},
		{
			heading: "By Priority",
			table: { headers: ["Priority", "Count"], rows: byPriorityRows },
		},
		{
			heading: "Monthly Cost",
			table: { headers: ["Month", "Cost"], rows: monthlyCostRows },
		},
		{
			heading: "Vendor Performance",
			table: {
				headers: ["Vendor", "Jobs", "Total Spend"],
				rows: vendorRows,
			},
			...noteIf(available),
		},
	];
}

async function buildMaintenanceOperations(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const maintenanceResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.maintenance(start, end),
		MAINTENANCE_FALLBACK,
	);
	return {
		...baseHeader(
			"Maintenance Operations Report",
			"Response times · costs · urgency",
			start,
			end,
		),
		sections: maintenanceOperationsSections(
			maintenanceResult.data,
			maintenanceResult.available,
		),
	};
}

function taxPreparationSections(
	yearEnd: YearEndSummary,
	available: boolean,
): ReportSection[] {
	const byPropertyRows = yearEnd.byProperty.map(
		(p): Array<string | number> => [
			p.propertyName,
			fmtMoney(p.income),
			fmtMoney(p.expenses),
			fmtMoney(p.netIncome),
		],
	);
	const expenseRows = yearEnd.expenseByCategory.map(
		(e): Array<string | number> => [e.category, fmtMoney(e.amount)],
	);
	return [
		{ heading: "Annual Summary", rows: taxSummaryRows(yearEnd) },
		{
			heading: "Income by Property (Schedule E support)",
			table: {
				headers: ["Property", "Income", "Expenses", "Net Income"],
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
	const year = new Date(end).getFullYear();
	const yearEndResult = await safeFetch(
		queryClient,
		reportAnalyticsQueries.yearEnd(year),
		{ ...YEAREND_FALLBACK, year },
	);
	return {
		...baseHeader(
			`Tax Preparation — ${year}`,
			"Annual income · expenses · property breakdown",
			start,
			end,
		),
		sections: taxPreparationSections(
			yearEndResult.data,
			yearEndResult.available,
		),
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
