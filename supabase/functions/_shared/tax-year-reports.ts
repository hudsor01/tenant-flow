/**
 * The year-end, 1099-NEC and tax-documents pages as export tables, as pure
 * functions: the RPCs each page reads, how to load them, and the figures the
 * page renders from them, one table row per figure.
 *
 * THIS MODULE HAS NO RUNTIME DEPENDENCY. Its only import is type-only (erased),
 * it references no runtime global (no Deno namespace, no Response, no network:
 * the RPC caller is passed in), so `__tests__/tax-year-reports.test.ts` imports
 * it from Vitest next to the pages' own query functions. Do not add a value
 * import.
 *
 * Callers: `generate-pdf/index.ts` (Mode 1: the year-end page's and the tax
 * documents page's "Download PDF") and `export-report/index.ts` (the same
 * report types as CSV, XLSX and PDF).
 *
 * THE SCREEN IS THE SPEC. Each report makes the calls its page makes, with the
 * same arguments, and derives each figure the same way:
 *   - `year-end` is `/reports/year-end`: `reportAnalyticsQueries.yearEnd(year)`
 *     (get_dashboard_stats, get_expense_summary for the year,
 *     get_property_performance_analytics) and `report1099(year)` (the same
 *     get_expense_summary call), `src/hooks/api/query-keys/report-analytics-keys.ts`.
 *     Rows: the three summary cards, the By Property table, the Expense
 *     Breakdown (largest first, as the page sorts it), the 1099-NEC table.
 *   - `1099` is that page's 1099-NEC section alone.
 *   - `financial` is `/reports/tax-documents` (the wire name predates the
 *     page): `financialTaxQueries.taxDocuments(year)` (get_dashboard_stats,
 *     get_expense_summary for the year), `src/hooks/api/query-keys/expense-keys.ts`.
 *     Rows: the three summary cards and the Schedule E deductible expenses.
 *     Property Depreciation has no data source (the query returns it empty),
 *     so it contributes no rows; the test fails if it ever fills.
 * The test runs each page query and this module against the same RPC answers
 * and asserts the calls are identical and every figure matches.
 *
 * NUMBERS. Every amount is dollars, rounded to cents; a share is a percentage
 * rounded to one decimal with the page's own `toFixed(1)`; counts are written
 * as they come.
 */

import type {
	FinancialAnalyticsTable,
	ReportCell,
	RpcCall,
	RpcCaller,
} from "./financial-analytics-report.ts";

export const YEAR_END_REPORT_TYPE = "year-end";
export const REPORT_1099_TYPE = "1099";
/** `/reports/tax-documents`. Its PDF request has always sent `financial`. */
export const TAX_DOCUMENTS_REPORT_TYPE = "financial";

/** The 1099-NEC reporting threshold the year-end page states, in dollars. */
export const REPORT_1099_THRESHOLD = 600;

export const YEAR_END_HEADER = [
	"Section",
	"Item",
	"Jobs",
	"Amount",
	"Income",
	"Expenses",
	"Net Income",
	"Status",
] as const;

export const TAX_DOCUMENTS_HEADER = [
	"Section",
	"Item",
	"Amount",
	"Share of Expenses (%)",
] as const;

/** The raw `data` of each RPC a tax-year report reads (null when not read). */
export interface TaxYearSources {
	readonly dashboardStats: unknown;
	readonly expenseSummary: unknown;
	readonly propertyPerformance: unknown;
}

type SourceKey = keyof TaxYearSources;

const SOURCES_BY_REPORT: Readonly<Record<string, readonly SourceKey[]>> = {
	[YEAR_END_REPORT_TYPE]: [
		"dashboardStats",
		"expenseSummary",
		"propertyPerformance",
	],
	[REPORT_1099_TYPE]: ["expenseSummary"],
	[TAX_DOCUMENTS_REPORT_TYPE]: ["dashboardStats", "expenseSummary"],
};

/** Whether this module builds the report type. */
export function isTaxYearReportType(reportType: string): boolean {
	return Object.hasOwn(SOURCES_BY_REPORT, reportType);
}

/** Every RPC a tax-year report may read, with the arguments its page passes. */
export function taxYearRpcCalls(
	userId: string,
	year: number,
): Readonly<Record<SourceKey, RpcCall>> {
	return {
		dashboardStats: {
			name: "get_dashboard_stats",
			args: { p_user_id: userId },
		},
		expenseSummary: {
			name: "get_expense_summary",
			args: {
				p_user_id: userId,
				p_start_date: `${year}-01-01`,
				p_end_date: `${year}-12-31`,
			},
		},
		propertyPerformance: {
			name: "get_property_performance_analytics",
			args: { p_user_id: userId },
		},
	};
}

/** The calls one report type makes, in order. */
export function taxYearReportCalls(
	reportType: string,
	userId: string,
	year: number,
): readonly RpcCall[] {
	const calls = taxYearRpcCalls(userId, year);
	return (SOURCES_BY_REPORT[reportType] ?? []).map((key) => calls[key]);
}

export type TaxYearLoad =
	| { readonly ok: true; readonly sources: TaxYearSources }
	| { readonly ok: false; readonly rpc: string; readonly error: unknown };

/**
 * Call the report's RPCs. Any `error` fails the whole load, naming the RPC, so
 * a failed read can never be written out as an empty or zeroed report.
 */
export async function loadTaxYearSources(
	rpc: RpcCaller,
	reportType: string,
	userId: string,
	year: number,
): Promise<TaxYearLoad> {
	const keys = SOURCES_BY_REPORT[reportType];
	if (!keys) {
		return { ok: false, rpc: "", error: new Error(`unknown report ${reportType}`) };
	}
	const calls = taxYearRpcCalls(userId, year);
	const results = await Promise.all(
		keys.map((key) => rpc(calls[key].name, calls[key].args)),
	);
	const data: Record<SourceKey, unknown> = {
		dashboardStats: null,
		expenseSummary: null,
		propertyPerformance: null,
	};
	for (const [index, key] of keys.entries()) {
		const result = results[index];
		if (!result || result.error) {
			return { ok: false, rpc: calls[key].name, error: result?.error };
		}
		data[key] = result.data;
	}
	return { ok: true, sources: data };
}

/** A plain object, or null for anything else (arrays included). */
function asRecord(value: unknown): Record<string, unknown> | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return Object.fromEntries(Object.entries(value));
}

/**
 * A JSON array, `[]` for null or undefined, and a throw for any other value:
 * the page's `.map` throws there too, so the page shows its error state and
 * the export fails rather than writing a report the page never shows.
 */
function arrayOrEmpty(value: unknown, what: string): readonly unknown[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value)) {
		throw new Error(`Expected a JSON array for ${what}`);
	}
	return value;
}

function money(value: number): number {
	return Math.round(value * 100) / 100;
}

/** A share as the page prints it: `toFixed(1)`, which rounds the exact decimal. */
function percentOneDecimal(value: number): number {
	return Number(value.toFixed(1));
}

/** `revenue.yearly` of get_dashboard_stats, as both pages read it. */
function yearlyScheduledRevenue(dashboardStats: unknown): number {
	const revenue = asRecord(asRecord(dashboardStats)?.["revenue"]);
	return Number(revenue?.["yearly"] ?? 0);
}

function expenseTotal(expenseSummary: unknown): number {
	return Number(asRecord(expenseSummary)?.["total_amount"] ?? 0);
}

function expenseCategories(
	expenseSummary: unknown,
): { category: string; amount: number; percentage: number }[] {
	return arrayOrEmpty(
		asRecord(expenseSummary)?.["categories"],
		"expense categories",
	).map((entry) => {
		const row = asRecord(entry) ?? {};
		return {
			category: String(row["category"] ?? ""),
			amount: Number(row["amount"] ?? 0),
			percentage: Number(row["percentage"] ?? 0),
		};
	});
}

type Row = readonly ReportCell[];

/** The year-end header's cells for one row, by column name. */
function yearEndRow(
	section: string,
	item: string,
	cells: Partial<Record<(typeof YEAR_END_HEADER)[number], ReportCell>>,
): Row {
	return YEAR_END_HEADER.map((column) => {
		if (column === "Section") return section;
		if (column === "Item") return item;
		return cells[column] ?? null;
	});
}

export const REPORT_1099_SECTION = `Vendors paid $${REPORT_1099_THRESHOLD}+ (may require 1099-NEC)`;

function rows1099(expenseSummary: unknown): Row[] {
	const recipients = arrayOrEmpty(
		asRecord(expenseSummary)?.["vendor_payments"],
		"vendor payments",
	).map((entry) => {
		const row = asRecord(entry) ?? {};
		return {
			vendorName: String(row["vendor_name"] ?? ""),
			totalPaid: Number(row["total_paid"] ?? 0),
			jobCount: Number(row["job_count"] ?? 0),
		};
	});
	if (recipients.length === 0) {
		return [
			yearEndRow(
				REPORT_1099_SECTION,
				`No vendors exceeded the $${REPORT_1099_THRESHOLD} threshold`,
				{},
			),
		];
	}
	return recipients.map((r) =>
		yearEndRow(REPORT_1099_SECTION, r.vendorName, {
			Jobs: r.jobCount,
			Amount: money(r.totalPaid),
			Status: "1099 Required",
		}),
	);
}

function yearEndRows(sources: TaxYearSources): Row[] {
	const gross = yearlyScheduledRevenue(sources.dashboardStats);
	const operating = expenseTotal(sources.expenseSummary);
	const byProperty = arrayOrEmpty(
		sources.propertyPerformance,
		"property performance",
	).map((entry) => {
		const row = asRecord(entry) ?? {};
		return {
			name: String(row["property_name"] ?? ""),
			income: Number(row["total_revenue"] ?? 0),
			expenses: Number(row["total_expenses"] ?? 0),
			net: Number(row["net_income"] ?? 0),
		};
	});
	const categories = expenseCategories(sources.expenseSummary)
		.map(({ category, amount }) => ({ category, amount }))
		.sort((a, b) => b.amount - a.amount);
	return [
		yearEndRow("Summary", "Gross Rental Income", { Amount: money(gross) }),
		yearEndRow("Summary", "Operating Expenses", { Amount: money(operating) }),
		yearEndRow("Summary", "Net Income", { Amount: money(gross - operating) }),
		...byProperty.map((p) =>
			yearEndRow("By Property", p.name, {
				Income: money(p.income),
				Expenses: money(p.expenses),
				"Net Income": money(p.net),
			}),
		),
		...categories.map((c) =>
			yearEndRow("Expense Breakdown", c.category, { Amount: money(c.amount) }),
		),
		...rows1099(sources.expenseSummary),
	];
}

function taxDocumentRows(sources: TaxYearSources): Row[] {
	const income = yearlyScheduledRevenue(sources.dashboardStats);
	const deductions = expenseTotal(sources.expenseSummary);
	return [
		["Summary", "Gross Income", money(income), null],
		["Summary", "Total Deductions", money(deductions), null],
		["Summary", "Net Taxable Income", money(income - deductions), null],
		...expenseCategories(sources.expenseSummary).map(
			(c): Row => [
				"Deductible Expenses (Schedule E)",
				c.category.replace(/_/g, " "),
				money(c.amount),
				percentOneDecimal(c.percentage),
			],
		),
	];
}

export interface TaxYearReport {
	readonly title: string;
	readonly table: FinancialAnalyticsTable;
}

/** The report's title and table. Throws on a report type this module lacks. */
export function buildTaxYearReport(
	reportType: string,
	sources: TaxYearSources,
	year: number,
): TaxYearReport {
	if (reportType === YEAR_END_REPORT_TYPE) {
		return {
			title: `Year-End Report ${year}`,
			table: { header: YEAR_END_HEADER, rows: yearEndRows(sources) },
		};
	}
	if (reportType === REPORT_1099_TYPE) {
		return {
			title: `1099-NEC Summary ${year}`,
			table: { header: YEAR_END_HEADER, rows: rows1099(sources.expenseSummary) },
		};
	}
	if (reportType === TAX_DOCUMENTS_REPORT_TYPE) {
		return {
			title: `Tax Documents ${year}`,
			table: { header: TAX_DOCUMENTS_HEADER, rows: taxDocumentRows(sources) },
		};
	}
	throw new Error(`unknown report ${reportType}`);
}

/** The download name both functions give the report (no extension). */
export function taxYearReportFilename(reportType: string, year: number): string {
	if (reportType === REPORT_1099_TYPE) return `1099-vendors-${year}`;
	if (reportType === TAX_DOCUMENTS_REPORT_TYPE) return `tax-documents-${year}`;
	return `year-end-${year}`;
}
