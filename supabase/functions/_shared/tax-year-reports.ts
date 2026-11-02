/**
 * The year-end, 1099-NEC and tax-documents pages as export tables, as pure
 * functions: the RPCs each page reads, how to load them, and the figures the
 * page renders from them, one table row per figure.
 *
 * THIS MODULE HAS NO RUNTIME DEPENDENCY. Its only import is type-only (erased),
 * it references no runtime global (no Deno namespace, no Response, no network:
 * the RPC caller is passed in; `Intl` is the language's own), so `__tests__/tax-year-reports.test.ts` imports
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
 *     (get_billing_insights as of December 31 of the year and of the year
 *     before, get_expense_summary for the year, get_property_performance_
 *     analytics for the calendar year) and `report1099(year)` (the same
 *     get_expense_summary call), `src/hooks/api/query-keys/report-analytics-keys.ts`.
 *     Rows: the three summary cards, the By Property table (Schedule E
 *     support), the Expense Breakdown (largest first, as the page sorts it),
 *     the 1099-NEC table.
 *   - `1099` is that page's 1099-NEC section alone.
 *   - `financial` is `/reports/tax-documents` (the wire name predates the
 *     page): `financialTaxQueries.taxDocuments(year)` (the two
 *     get_billing_insights calls, get_expense_summary for the year),
 *     `src/hooks/api/query-keys/expense-keys.ts`.
 *     Rows: the three summary cards and the Schedule E deductible expenses.
 * Income is rent received, from the rent ledger: collectedTotal as of December
 * 31 of the year less as of December 31 of the year before (cash basis), and
 * each property's receipts in the calendar year (20261102163709). When the
 * server cannot report them yet (get_billing_insights before 20261102055449,
 * or a property row whose `timeframe` is not the year), the page says so and
 * the report throws, so no file ever presents $0 as a tax year's income.
 *     Property Depreciation has no data source (the query returns it empty),
 *     so it contributes no rows; the test fails if it ever fills.
 * The test runs each page query and this module against the same RPC answers
 * and asserts the calls are identical and every figure matches.
 *
 * NUMBERS. Every amount is dollars, rounded to cents as the pages'
 * `formatCurrency` (`Intl.NumberFormat`) rounds them; a share is a percentage
 * rounded to one decimal with the page's own `toFixed(1)`; counts are written
 * as they come. Each column has one format (`YEAR_END_FORMATS`, `TAX_DOCUMENTS_FORMATS`):
 * the PDF prints money and shares as the pages do, the CSV writes the raw
 * number, the XLSX gives money a currency number format.
 */

import type {
	FinancialAnalyticsTable,
	ReportCell,
	ReportCellFormat,
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
	"Rent Received",
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

/** Each year-end column's format, in `YEAR_END_HEADER` order. */
export const YEAR_END_FORMATS: readonly ReportCellFormat[] =
	YEAR_END_HEADER.map(
		(column): ReportCellFormat =>
			column === "Amount" ||
			column === "Rent Received" ||
			column === "Expenses" ||
			column === "Net Income"
				? "money"
				: "plain",
	);

/** Each tax-documents column's format, in `TAX_DOCUMENTS_HEADER` order. */
export const TAX_DOCUMENTS_FORMATS: readonly ReportCellFormat[] = [
	"plain",
	"plain",
	"money",
	"percent",
];

/** The raw `data` of each RPC a tax-year report reads (null when not read). */
export interface TaxYearSources {
	/** get_billing_insights as of December 31 of the year. */
	readonly ledgerAtYearEnd: unknown;
	/** get_billing_insights as of December 31 of the year before. */
	readonly ledgerAtPriorYearEnd: unknown;
	readonly expenseSummary: unknown;
	readonly propertyPerformance: unknown;
}

type SourceKey = keyof TaxYearSources;

const SOURCES_BY_REPORT: Readonly<Record<string, readonly SourceKey[]>> = {
	[YEAR_END_REPORT_TYPE]: [
		"ledgerAtYearEnd",
		"ledgerAtPriorYearEnd",
		"expenseSummary",
		"propertyPerformance",
	],
	[REPORT_1099_TYPE]: ["expenseSummary"],
	[TAX_DOCUMENTS_REPORT_TYPE]: [
		"ledgerAtYearEnd",
		"ledgerAtPriorYearEnd",
		"expenseSummary",
	],
};

/** The report types this module builds, in the order the pages list them. */
export const TAX_YEAR_REPORT_TYPES: readonly string[] = [
	YEAR_END_REPORT_TYPE,
	REPORT_1099_TYPE,
	TAX_DOCUMENTS_REPORT_TYPE,
];

/** Every RPC a tax-year report may read, with the arguments its page passes. */
export function taxYearRpcCalls(
	userId: string,
	year: number,
): Readonly<Record<SourceKey, RpcCall>> {
	return {
		ledgerAtYearEnd: {
			name: "get_billing_insights",
			args: { owner_id_param: userId, end_date_param: `${year}-12-31` },
		},
		ledgerAtPriorYearEnd: {
			name: "get_billing_insights",
			args: { owner_id_param: userId, end_date_param: `${year - 1}-12-31` },
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
			args: {
				p_user_id: userId,
				p_timeframe: `${year}-01-01..${year}-12-31`,
			},
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
		return {
			ok: false,
			rpc: "",
			error: new Error(`unknown report ${reportType}`),
		};
	}
	const calls = taxYearRpcCalls(userId, year);
	const results = await Promise.all(
		keys.map((key) => rpc(calls[key].name, calls[key].args)),
	);
	const data: Record<SourceKey, unknown> = {
		ledgerAtYearEnd: null,
		ledgerAtPriorYearEnd: null,
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

const ROUND_TO_CENTS = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 2,
	useGrouping: false,
});

/** Dollars rounded to cents as `formatCurrency` rounds them. */
function money(value: number): number {
	return Number(ROUND_TO_CENTS.format(value));
}

/** A share as the page prints it: `toFixed(1)`, which rounds the exact decimal. */
function percentOneDecimal(value: number): number {
	return Number(value.toFixed(1));
}

/**
 * Rent received in the year, as both pages compute it: collectedTotal as of
 * December 31 less as of December 31 of the year before, to the cent. Throws
 * when either is missing (the body before 20261102055449): the pages show
 * their unavailable state there, and the file must not hold a $0 instead.
 */
function rentReceivedInYear(sources: TaxYearSources): number {
	const end = asRecord(sources.ledgerAtYearEnd)?.["collectedTotal"];
	const before = asRecord(sources.ledgerAtPriorYearEnd)?.["collectedTotal"];
	if (typeof end !== "number" || typeof before !== "number") {
		throw new Error("rent ledger totals unavailable");
	}
	return Math.round((end - before) * 100) / 100;
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

function yearEndRows(sources: TaxYearSources, year: number): Row[] {
	const received = rentReceivedInYear(sources);
	const operating = expenseTotal(sources.expenseSummary);
	// Each row must state the calendar year (20261102163709); the body before
	// it echoes p_timeframe and returns 0 as every property's revenue.
	const taxYearWindow = `${year}-01-01/${year}-12-31`;
	const byProperty = arrayOrEmpty(
		sources.propertyPerformance,
		"property performance",
	).map((entry) => {
		const row = asRecord(entry) ?? {};
		if (row["timeframe"] !== taxYearWindow) {
			throw new Error("property rent received unavailable");
		}
		return {
			name: String(row["property_name"] ?? ""),
			received: Number(row["total_revenue"] ?? 0),
			expenses: Number(row["total_expenses"] ?? 0),
			net: Number(row["net_income"] ?? 0),
		};
	});
	const categories = expenseCategories(sources.expenseSummary)
		.map(({ category, amount }) => ({ category, amount }))
		.sort((a, b) => b.amount - a.amount);
	return [
		yearEndRow("Summary", "Rent Received", { Amount: money(received) }),
		yearEndRow("Summary", "Operating Expenses", { Amount: money(operating) }),
		yearEndRow("Summary", "Net Income", {
			Amount: money(Math.round((received - operating) * 100) / 100),
		}),
		...byProperty.map((p) =>
			yearEndRow("By Property", p.name, {
				"Rent Received": money(p.received),
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
	const income = rentReceivedInYear(sources);
	const deductions = expenseTotal(sources.expenseSummary);
	return [
		["Summary", "Rent Received", money(income), null],
		["Summary", "Total Deductions", money(deductions), null],
		[
			"Summary",
			"Net Taxable Income",
			money(Math.round((income - deductions) * 100) / 100),
			null,
		],
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

/** A table whose every row takes its columns' formats. */
function columnTable(
	header: readonly string[],
	formats: readonly ReportCellFormat[],
	rows: readonly Row[],
): FinancialAnalyticsTable {
	return { header, rows, formats: rows.map(() => formats) };
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
			table: columnTable(
				YEAR_END_HEADER,
				YEAR_END_FORMATS,
				yearEndRows(sources, year),
			),
		};
	}
	if (reportType === REPORT_1099_TYPE) {
		return {
			title: `1099-NEC Summary ${year}`,
			table: columnTable(
				YEAR_END_HEADER,
				YEAR_END_FORMATS,
				rows1099(sources.expenseSummary),
			),
		};
	}
	if (reportType === TAX_DOCUMENTS_REPORT_TYPE) {
		return {
			title: `Tax Documents ${year}`,
			table: columnTable(
				TAX_DOCUMENTS_HEADER,
				TAX_DOCUMENTS_FORMATS,
				taxDocumentRows(sources),
			),
		};
	}
	throw new Error(`unknown report ${reportType}`);
}

/** The download name both functions give the report (no extension). */
export function taxYearReportFilename(
	reportType: string,
	year: number,
): string {
	if (reportType === REPORT_1099_TYPE) return `1099-vendors-${year}`;
	if (reportType === TAX_DOCUMENTS_REPORT_TYPE) return `tax-documents-${year}`;
	return `year-end-${year}`;
}
