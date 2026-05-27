/**
 * Report data shaping layer — converts existing analytics RPC results
 * into a normalized `ReportData` shape that PDF + Excel writers consume
 * uniformly. One builder per report type.
 *
 * Builders use the imperative `queryClient.fetchQuery()` form so they can run
 * inside the `handleGenerateReport` click handler (which is not a React hook
 * context). They reuse the same query factories the existing report pages
 * already consume so cache + dedup are shared.
 */

import type { FetchQueryOptions, QueryClient } from "@tanstack/react-query";
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

/**
 * Safe-fetch wrapper around `queryClient.fetchQuery`. Several legacy report
 * RPCs reference a removed `rent_payments` table (Phase 06 schema cleanup
 * dropped rent-payment facilitation per CLAUDE.md). Those RPCs return a 404
 * `relation "rent_payments" does not exist` at runtime. Rather than blocking
 * the whole report on one broken RPC, we catch per-fetch and fall back to a
 * caller-provided default plus an "unavailable" flag the section can render
 * as a note.
 */
async function safeFetch<TData, TQueryKey extends readonly unknown[]>(
	queryClient: QueryClient,
	options: FetchQueryOptions<TData, Error, TData, TQueryKey>,
	fallback: TData,
): Promise<{ data: TData; available: boolean }> {
	try {
		const data = await queryClient.fetchQuery(options);
		return { data, available: true };
	} catch (err) {
		if (process.env.NODE_ENV !== "production") {
			// dev-only diagnostic — never logs in prod
			console.warn("[reports] data fetch fell back to defaults:", err);
		}
		return { data: fallback, available: false };
	}
}

/** Helper: only include `note` field when there's actually a note to render.
 *  Required because `ReportSection.note` is strict-optional under
 *  `exactOptionalPropertyTypes: true` — `note: undefined` is a type error. */
function noteIf(available: boolean): { note?: string } {
	return available ? {} : { note: UNAVAILABLE_NOTE };
}

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

const UNAVAILABLE_NOTE =
	"Some data could not be loaded for this period and is shown as 0 — usually because the report depends on an RPC that's pending a backend cleanup.";

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

async function buildExecutiveMonthly(
	queryClient: QueryClient,
	start: string,
	end: string,
): Promise<ReportData> {
	const [financialResult, occupancyResult, paymentsResult, monthlyResult] =
		await Promise.all([
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
			safeFetch(
				queryClient,
				reportAnalyticsQueries.paymentAnalytics(start, end),
				PAYMENTS_FALLBACK,
			),
			safeFetch(
				queryClient,
				reportQueries.monthlyRevenue(12),
				[] as RevenueData[],
			),
		]);

	const financial = financialResult.data;
	const occupancy = occupancyResult.data;
	const payments = paymentsResult.data;
	const monthlyRows: Array<Array<string | number>> = monthlyResult.data.map(
		(m) => [String(m.month), fmtMoney(m.revenue)],
	);
	const anyUnavailable =
		!financialResult.available ||
		!occupancyResult.available ||
		!paymentsResult.available ||
		!monthlyResult.available;

	return {
		...baseHeader("Executive Monthly Report", "Portfolio summary", start, end),
		sections: [
			{
				heading: "Key Metrics",
				rows: [
					{
						label: "Total Income",
						value: fmtMoney(financial.summary.totalIncome),
					},
					{
						label: "Total Expenses",
						value: fmtMoney(financial.summary.totalExpenses),
					},
					{ label: "Net Income", value: fmtMoney(financial.summary.netIncome) },
					{ label: "Cash Flow", value: fmtMoney(financial.summary.cashFlow) },
					{
						label: "Occupancy Rate",
						value: fmtPct(occupancy.occupancyRate),
					},
					{
						label: "Occupied Units",
						value: `${fmtNumber(occupancy.occupiedUnits)} of ${fmtNumber(occupancy.totalUnits)}`,
					},
					{
						label: "Total Payments",
						value: fmtNumber(payments.totalPayments),
					},
					{
						label: "Successful Payments",
						value: fmtNumber(payments.successfulPayments),
					},
				],
			},
			{
				heading: "Monthly Revenue (last 12 months)",
				table: {
					headers: ["Month", "Revenue"],
					rows: monthlyRows,
				},
				...noteIf(!anyUnavailable),
			},
		],
	};
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
	const financial = financialResult.data;

	const totalExpenses = financial.summary.totalExpenses;
	const expenseRows: Array<Array<string | number>> =
		financial.expenseBreakdown.map((e) => [
			e.category,
			fmtMoney(e.amount),
			fmtPct(totalExpenses > 0 ? (e.amount / totalExpenses) * 100 : 0),
		]);

	const monthlyRows: Array<Array<string | number>> = financial.monthly.map(
		(m) => [m.month, fmtMoney(m.income), fmtMoney(m.expenses), fmtMoney(m.net)],
	);

	const rentRollRows: Array<Array<string | number>> = financial.rentRoll.map(
		(r) => [
			r.propertyName,
			`${fmtNumber(r.occupiedUnits)}/${fmtNumber(r.unitCount)}`,
			fmtPct(r.occupancyRate),
			fmtMoney(r.rentPotential),
		],
	);

	return {
		...baseHeader(
			"Financial Performance Report",
			"P&L · NOI · Expense breakdown",
			start,
			end,
		),
		sections: [
			{
				heading: "Summary",
				rows: [
					{
						label: "Total Income",
						value: fmtMoney(financial.summary.totalIncome),
					},
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
				],
			},
			{
				heading: "Monthly Breakdown",
				table: {
					headers: ["Month", "Income", "Expenses", "Net"],
					rows: monthlyRows,
				},
			},
			{
				heading: "Expense Categories",
				table: {
					headers: ["Category", "Amount", "% of Expenses"],
					rows: expenseRows,
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
					rows: rentRollRows,
				},
				...noteIf(financialResult.available),
			},
		],
	};
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
	const properties = propertiesResult.data;
	const occupancy = occupancyResult.data;
	const anyUnavailable =
		!propertiesResult.available || !occupancyResult.available;

	const propertyRows: Array<Array<string | number>> = properties.byProperty.map(
		(p) => [
			p.propertyName,
			fmtPct(p.occupancyRate),
			fmtNumber(p.vacantUnits),
			fmtMoney(p.revenue),
			fmtMoney(p.expenses),
			fmtMoney(p.netOperatingIncome),
		],
	);

	const occupancyTrendRows: Array<Array<string | number>> =
		properties.occupancyTrend.map((t) => [t.month, fmtPct(t.occupancyRate)]);

	const vacancyTrendRows: Array<Array<string | number>> = (
		properties.vacancyTrend ?? []
	).map((v) => [
		String((v as Record<string, unknown>).month ?? ""),
		fmtNumber(Number((v as Record<string, unknown>).vacantUnits ?? 0)),
	]);

	return {
		...baseHeader(
			"Property Portfolio Report",
			"Property rankings · occupancy · vacancy",
			start,
			end,
		),
		sections: [
			{
				heading: "Portfolio Summary",
				rows: [
					{
						label: "Total Properties",
						value: fmtNumber(properties.summary.totalProperties),
					},
					{ label: "Total Units", value: fmtNumber(occupancy.totalUnits) },
					{
						label: "Occupied Units",
						value: fmtNumber(occupancy.occupiedUnits),
					},
					{ label: "Vacant Units", value: fmtNumber(occupancy.vacantUnits) },
					{
						label: "Overall Occupancy",
						value: fmtPct(occupancy.occupancyRate),
					},
				],
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
					rows: propertyRows,
				},
			},
			{
				heading: "Occupancy Trend",
				table: {
					headers: ["Month", "Occupancy Rate"],
					rows: occupancyTrendRows,
				},
			},
			{
				heading: "Vacancy Trend",
				table: {
					headers: ["Month", "Vacant Units"],
					rows: vacancyTrendRows,
				},
				...noteIf(!anyUnavailable),
			},
		],
	};
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
	const tenants = tenantsResult.data;

	const expirationRows: Array<Array<string | number>> =
		tenants.leaseExpirations.map((l) => [
			l.propertyName,
			l.unitLabel,
			fmtDate(l.endDate),
		]);

	const paymentRows: Array<Array<string | number>> = tenants.paymentHistory.map(
		(p) => [p.month, fmtNumber(p.paymentsReceived), fmtPct(p.onTimeRate)],
	);

	const turnoverRows: Array<Array<string | number>> = (
		tenants.turnover ?? []
	).map((t) => {
		const row = t as Record<string, unknown>;
		return [
			String(row.month ?? ""),
			fmtNumber(Number(row.movedIn ?? 0)),
			fmtNumber(Number(row.movedOut ?? 0)),
		];
	});

	return {
		...baseHeader(
			"Lease Portfolio Report",
			"Lease analytics · expirations · payment history",
			start,
			end,
		),
		sections: [
			{
				heading: "Lease Summary",
				rows: [
					{
						label: "Total Tenants",
						value: fmtNumber(tenants.summary.totalTenants),
					},
					{
						label: "Active Leases",
						value: fmtNumber(tenants.summary.activeLeases),
					},
					{
						label: "Expiring (next 90 days)",
						value: fmtNumber(tenants.summary.leasesExpiringNext90),
					},
					{
						label: "Turnover Rate",
						value: fmtPct(tenants.summary.turnoverRate),
					},
					{
						label: "On-Time Payment Rate",
						value: fmtPct(tenants.summary.onTimePaymentRate),
					},
				],
			},
			{
				heading: "Lease Expirations",
				table: {
					headers: ["Property", "Unit", "Lease End Date"],
					rows: expirationRows,
				},
			},
			{
				heading: "Payment History",
				table: {
					headers: ["Month", "Payments Received", "On-Time Rate"],
					rows: paymentRows,
				},
			},
			{
				heading: "Tenant Turnover",
				table: {
					headers: ["Month", "Moved In", "Moved Out"],
					rows: turnoverRows,
				},
				...noteIf(tenantsResult.available),
			},
		],
	};
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
	const maintenance = maintenanceResult.data;

	const byStatusRows: Array<Array<string | number>> = maintenance.byStatus.map(
		(s) => [s.status, fmtNumber(s.count)],
	);
	const byPriorityRows: Array<Array<string | number>> =
		maintenance.byPriority.map((p) => [p.priority, fmtNumber(p.count)]);
	const monthlyCostRows: Array<Array<string | number>> =
		maintenance.monthlyCost.map((m) => [m.month, fmtMoney(m.cost)]);
	const vendorRows: Array<Array<string | number>> = (
		maintenance.vendorPerformance ?? []
	).map((v) => {
		const row = v as Record<string, unknown>;
		return [
			String(row.vendorName ?? ""),
			fmtNumber(Number(row.completedRequests ?? 0)),
			fmtMoney(Number(row.totalCost ?? 0)),
		];
	});

	return {
		...baseHeader(
			"Maintenance Operations Report",
			"Response times · costs · urgency",
			start,
			end,
		),
		sections: [
			{
				heading: "Operations Summary",
				rows: [
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
					{
						label: "Total Cost",
						value: fmtMoney(maintenance.summary.totalCost),
					},
					{
						label: "Average Cost / Request",
						value: fmtMoney(maintenance.summary.averageCost),
					},
				],
			},
			{
				heading: "By Status",
				table: {
					headers: ["Status", "Count"],
					rows: byStatusRows,
				},
			},
			{
				heading: "By Priority",
				table: {
					headers: ["Priority", "Count"],
					rows: byPriorityRows,
				},
			},
			{
				heading: "Monthly Cost",
				table: {
					headers: ["Month", "Cost"],
					rows: monthlyCostRows,
				},
			},
			{
				heading: "Vendor Performance",
				table: {
					headers: ["Vendor", "Completed", "Total Cost"],
					rows: vendorRows,
				},
				...noteIf(maintenanceResult.available),
			},
		],
	};
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
	const yearEnd = yearEndResult.data;

	const byPropertyRows: Array<Array<string | number>> = yearEnd.byProperty.map(
		(p) => [
			p.propertyName,
			fmtMoney(p.income),
			fmtMoney(p.expenses),
			fmtMoney(p.netIncome),
		],
	);

	const expenseRows: Array<Array<string | number>> =
		yearEnd.expenseByCategory.map((e) => [e.category, fmtMoney(e.amount)]);

	return {
		...baseHeader(
			`Tax Preparation — ${year}`,
			"Annual income · expenses · property breakdown",
			start,
			end,
		),
		sections: [
			{
				heading: "Annual Summary",
				rows: [
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
				],
			},
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
				table: {
					headers: ["Category", "Amount"],
					rows: expenseRows,
				},
				...noteIf(yearEndResult.available),
			},
		],
	};
}

export type ReportType =
	| "executive-monthly"
	| "financial-performance"
	| "property-portfolio"
	| "lease-portfolio"
	| "maintenance-operations"
	| "tax-preparation";

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
