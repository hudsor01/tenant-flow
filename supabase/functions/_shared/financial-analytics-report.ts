/**
 * The `/analytics/financial` page as an export table, as pure functions: the
 * four RPCs the page reads, how to load them, and the figures the page renders
 * from them, one table row per figure.
 *
 * THIS MODULE IS A DEPENDENCY-FREE LEAF. It has no import statement and no
 * reference to a runtime global (no Deno namespace, no Response, no network:
 * the RPC caller is passed in; `Intl` is the language's own), so `__tests__/financial-analytics-report.test.ts`
 * imports it from Vitest next to the page's own query functions and mapper. Do
 * not add an import.
 *
 * Callers: `export-report/index.ts` (report type `financial-analytics`, as CSV,
 * XLSX and PDF) and `generate-pdf/index.ts` (Mode 1, the same report type).
 *
 * THE SCREEN IS THE SPEC. The page renders `analyticsQueries.financialPageData()`
 * (`mapFinancialOverview` over `get_financial_overview`,
 * `get_revenue_trends_optimized` and `get_expense_summary`) and
 * `analyticsQueries.ownerPaymentSummary()` (`get_billing_insights`), in
 * `src/hooks/api/use-analytics.ts`. This module makes the same four calls with
 * the same arguments and derives the same figures the same way, so the file
 * holds what the page shows. The test runs both against the same RPC answers
 * and asserts the calls are identical and every figure matches.
 *
 * ROWS, top to bottom as the page lays them out (`FINANCIAL_ANALYTICS_HEADER`):
 *   - Overview: the four stat cards (Scheduled, Collected, Scheduled Net,
 *     Scheduled Margin): get_financial_overview's revenue is the active
 *     leases' rent times twelve, so both derived figures say scheduled.
 *   - Payment Summary: the four payment cards.
 *   - Scheduled Rent & Expenses: one row per month of the chart, oldest first,
 *     with its scheduled rent (get_revenue_trends_optimized's revenue, the
 *     month's lease rent: not money received), expenses and scheduled net.
 *   - Expense Breakdown: every category of the breakdown list (the page lists
 *     the first five), in the RPC's order, with its amount.
 *   - Scheduled Net: one row per month of that chart, oldest first.
 *   - Lease Profitability: the table's period ("Period", its first and last
 *     day), then one row per lease (get_financial_overview's
 *     `lease_profitability`, 20261102184504), largest net first: its label
 *     (`leaseProfitabilityLabel`, the page's), rent received, expenses and
 *     net. With no `lease_profitability` (the body before) the page says the
 *     table is unavailable, and so does the file's one row ("Unavailable"),
 *     never an empty table.
 * The page's Revenue Breakdown has no data source (`mapFinancialOverview`
 * always returns it empty), so it contributes no rows; the test fails if the
 * mapper ever fills it, so the export cannot silently fall behind the page.
 *
 * NUMBERS. Every amount is dollars, rounded to cents (the ledger's collected
 * receipts are summed in floating point, so the raw sum can carry noise such
 * as 0.30000000000000004). Scheduled Margin is a percentage rounded to one
 * decimal, as the card shows it. Counts are written as they come. Rounding is
 * `Intl.NumberFormat`'s, the formatter behind the page's `formatCurrency` and
 * `NumberTicker`, so a figure in the file is the figure on the screen:
 * `Math.round(v * 10) / 10` wrote -124.7 where the ROI card shows -124.8
 * (`Math.round` takes a tie toward +Infinity), and `toFixed(1)` writes 0.1
 * where it shows 0.2 (it rounds the binary value, Intl the shortest decimal).
 *
 * FORMATS. Each cell carries how it prints (`ReportCellFormat`, parallel to
 * the rows): `money` (dollars), `percent` or `plain`. The CSV writes the raw
 * number; the PDF prints `formatReportCell` (`report-format.ts`); the XLSX
 * keeps the number and gives a money cell a currency number format.
 */

export const FINANCIAL_ANALYTICS_REPORT_TYPE = "financial-analytics";

/**
 * "Rent" holds the month's scheduled rent in the Scheduled Rent & Expenses
 * rows and a lease's rent received in the Lease Profitability rows: each
 * section names which. Neither is labelled revenue or income.
 */
export const FINANCIAL_ANALYTICS_HEADER = [
	"Section",
	"Item",
	"Value",
	"Rent",
	"Expenses",
	"Net",
] as const;

/**
 * A lease as the Lease Profitability table names it: its property and unit,
 * and its tenant when it has one ("North Court · N1 (Ann North)"). The
 * property name is the report label map's (a deleted property says so).
 */
export function leaseProfitabilityLabel(lease: {
	readonly propertyName: string;
	readonly unitNumber: string | null;
	readonly tenantName: string | null;
}): string {
	const place =
		lease.unitNumber === null
			? lease.propertyName
			: `${lease.propertyName} \u00b7 ${lease.unitNumber}`;
	return lease.tenantName === null ? place : `${place} (${lease.tenantName})`;
}

/**
 * How the export names a property by its status: tax-year-reports'
 * `propertyReportName`, passed in by the caller (this leaf imports nothing).
 */
export type PropertyNamer = (name: string, status: string) => string;

/**
 * How the export names an expense's vendor, NULL (no vendor recorded)
 * included: tax-year-reports' `expenseVendorLabel`, passed in by the caller.
 */
export type VendorNamer = (vendor: unknown) => string;

/** One cell: text, a number, or empty. */
export type ReportCell = string | number | null;

/**
 * How a cell prints: `money` is dollars (`$1,234.50`), `percent` a percentage
 * to one decimal (`49.1%`), and `plain` anything else (text, and counts,
 * written as they are).
 */
export type ReportCellFormat = "money" | "percent" | "plain";

export interface FinancialAnalyticsTable {
	readonly header: readonly string[];
	readonly rows: readonly (readonly ReportCell[])[];
	/** Each cell's format: one array per row, the same shape as `rows`. */
	readonly formats: readonly (readonly ReportCellFormat[])[];
}

export interface RpcCall {
	readonly name: string;
	readonly args: Readonly<Record<string, string | number>>;
}

/** The raw `data` of each of the four RPCs. */
export interface FinancialAnalyticsSources {
	readonly overview: unknown;
	readonly revenueTrends: unknown;
	readonly expenseSummary: unknown;
	readonly billingInsights: unknown;
}

type SourceKey = keyof FinancialAnalyticsSources;

const SOURCE_KEYS: readonly SourceKey[] = [
	"overview",
	"revenueTrends",
	"expenseSummary",
	"billingInsights",
];

/** The four RPCs and their arguments, exactly as the page calls them. */
export function financialAnalyticsRpcCalls(
	userId: string,
): Readonly<Record<SourceKey, RpcCall>> {
	return {
		overview: {
			name: "get_financial_overview",
			args: { p_user_id: userId },
		},
		revenueTrends: {
			name: "get_revenue_trends_optimized",
			args: { p_user_id: userId, p_months: 12 },
		},
		expenseSummary: {
			name: "get_expense_summary",
			args: { p_user_id: userId },
		},
		billingInsights: {
			name: "get_billing_insights",
			args: { owner_id_param: userId },
		},
	};
}

/**
 * One page of a set-returning RPC, as `supabase.rpc(...).order(...).range()`
 * reads it: rows `from`..`to` (both included) in the order of `order`.
 */
export interface RpcPage {
	readonly from: number;
	readonly to: number;
	readonly order: readonly string[];
}

/** `supabase.rpc`, as the loaders need it; `page` reads one page of a set. */
export type RpcCaller = (
	name: string,
	args: Readonly<Record<string, string | number>>,
	page?: RpcPage,
) => PromiseLike<{ data: unknown; error: unknown }>;

export type FinancialAnalyticsLoad =
	| { readonly ok: true; readonly sources: FinancialAnalyticsSources }
	| { readonly ok: false; readonly rpc: string; readonly error: unknown };

/**
 * Call the four RPCs. Any `error` fails the whole load, naming the RPC, so a
 * failed read can never be written out as an empty or zeroed report.
 */
export async function loadFinancialAnalyticsSources(
	rpc: RpcCaller,
	userId: string,
): Promise<FinancialAnalyticsLoad> {
	const calls = financialAnalyticsRpcCalls(userId);
	const results = await Promise.all(
		SOURCE_KEYS.map((key) => rpc(calls[key].name, calls[key].args)),
	);
	const data: Record<SourceKey, unknown> = {
		overview: null,
		revenueTrends: null,
		expenseSummary: null,
		billingInsights: null,
	};
	for (const [index, key] of SOURCE_KEYS.entries()) {
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
 * A JSON object, `{}` for null or undefined, and a throw for any other value,
 * an array included: the page's `jsonObjectOrEmpty` throws there too, so the
 * page shows its error state and the export fails rather than writing zeros.
 */
function objectOrEmpty(value: unknown, what: string): Record<string, unknown> {
	if (value === null || value === undefined) return {};
	const record = asRecord(value);
	if (record === null) {
		throw new Error(`Expected a JSON object for ${what}`);
	}
	return record;
}

/**
 * A JSON array, `[]` for null or undefined, and a throw for any other value:
 * the page's `jsonArrayOrEmpty` throws there too, so the page shows its error
 * state and the export fails rather than writing a report the page never shows.
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
const ROUND_TO_TENTHS = new Intl.NumberFormat("en-US", {
	maximumFractionDigits: 1,
	useGrouping: false,
});

/** Dollars rounded to cents as `formatCurrency` rounds them. */
function money(value: number): number {
	return Number(ROUND_TO_CENTS.format(value));
}

/** A percentage rounded to one decimal as the ROI card's ticker rounds it. */
function percentOneDecimal(value: number): number {
	return Number(ROUND_TO_TENTHS.format(value));
}

function numberOrZero(value: unknown): number {
	return typeof value === "number" ? value : 0;
}

interface Row {
	readonly cells: readonly ReportCell[];
	readonly formats: readonly ReportCellFormat[];
}

function valueRow(
	section: string,
	item: string,
	value: number,
	format: ReportCellFormat = "money",
): Row {
	return {
		cells: [section, item, value, null, null, null],
		formats: ["plain", "plain", format, "plain", "plain", "plain"],
	};
}

/**
 * The lease profitability rows, as `mapLeaseProfitability` reads them. When
 * the overview carries none (the body before 20261102184504) one row says so,
 * as the page does: the file never shows the table empty.
 */
function leaseProfitabilityRows(
	overview: unknown,
	propertyName: PropertyNamer,
): Row[] {
	const section = asRecord(asRecord(overview)?.["lease_profitability"]);
	const window = section?.["window"];
	const leases = section?.["leases"];
	if (
		typeof window !== "string" ||
		!/^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/.test(window) ||
		!Array.isArray(leases)
	) {
		return [
			{
				cells: ["Lease Profitability", "Unavailable", null, null, null, null],
				formats: ["plain", "plain", "plain", "plain", "plain", "plain"],
			},
		];
	}
	const [start, end] = window.split("/");
	const text = (value: unknown) =>
		typeof value === "string" && value !== "" ? value : null;
	const amount = (value: unknown) =>
		typeof value === "number" && Number.isFinite(value) ? value : 0;
	const period: Row = {
		cells: [
			"Lease Profitability",
			"Period",
			`${start} to ${end}`,
			null,
			null,
			null,
		],
		formats: ["plain", "plain", "plain", "plain", "plain", "plain"],
	};
	return [period, ...leases.flatMap((entry): Row[] => {
		const lease = asRecord(entry);
		if (lease === null || text(lease["lease_id"]) === null) return [];
		const label = leaseProfitabilityLabel({
			propertyName: propertyName(
				text(lease["property_name"]) ?? "",
				lease["property_deleted"] === true ? "inactive" : "active",
			),
			unitNumber: text(lease["unit_number"]),
			tenantName: text(lease["tenant_name"]),
		});
		return [
			{
				cells: [
					"Lease Profitability",
					label,
					null,
					money(amount(lease["rent_received"])),
					money(amount(lease["expenses"])),
					money(amount(lease["net"])),
				],
				formats: ["plain", "plain", "plain", "money", "money", "money"],
			},
		];
	})];
}

/**
 * The page's figures as table rows. Each figure is derived as
 * `mapFinancialOverview` and `ownerPaymentSummary` derive it. `propertyName`
 * is the report label map's namer (tax-year-reports' `propertyReportName`),
 * `vendorName` the vendor namer (tax-year-reports' `expenseVendorLabel`).
 */
export function buildFinancialAnalyticsTable(
	sources: FinancialAnalyticsSources,
	propertyName: PropertyNamer,
	vendorName: VendorNamer,
): FinancialAnalyticsTable {
	const overview = asRecord(asRecord(sources.overview)?.["overview"]) ?? {};
	const totalRevenue = Number(overview["total_revenue"] ?? 0);
	const totalExpenses = Number(overview["total_expenses"] ?? 0);
	const netIncome = Number(
		overview["net_income"] ?? totalRevenue - totalExpenses,
	);
	const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

	const revenueRows = arrayOrEmpty(sources.revenueTrends, "revenue trends").map(
		(row) => asRecord(row) ?? {},
	);
	const totalCollected = revenueRows.reduce(
		(sum, row) => sum + Number(row["collections"] ?? 0),
		0,
	);

	const expenseSummary = asRecord(sources.expenseSummary);
	const expenseByMonth = new Map<string, number>();
	for (const entry of arrayOrEmpty(
		expenseSummary?.["monthly_totals"],
		"monthly expense totals",
	)) {
		const row = asRecord(entry) ?? {};
		expenseByMonth.set(String(row["month"] ?? ""), Number(row["amount"] ?? 0));
	}

	const months = revenueRows
		.map((row) => {
			const month = String(row["month"] ?? "");
			const revenue = Number(row["revenue"] ?? 0);
			const expenses = expenseByMonth.get(month) ?? 0;
			return { month, revenue, expenses, net: revenue - expenses };
		})
		.reverse();

	const categories = expenseSummary?.["categories"];
	const expenseCategories = (Array.isArray(categories) ? categories : []).map(
		(entry: unknown) => {
			const row = asRecord(entry) ?? {};
			return {
				label: vendorName(row["category"]),
				amount: Number(row["amount"] ?? 0),
			};
		},
	);

	const billing = objectOrEmpty(sources.billingInsights, "billing insights");

	const rows: Row[] = [
		valueRow("Overview", "Scheduled", money(totalRevenue)),
		valueRow("Overview", "Collected", money(totalCollected)),
		valueRow("Overview", "Scheduled Net", money(netIncome)),
		valueRow(
			"Overview",
			"Scheduled Margin (%)",
			percentOneDecimal(profitMargin),
			"percent",
		),
		valueRow(
			"Payment Summary",
			"Late fees cumulative",
			money(numberOrZero(billing["lateFeeTotal"])),
		),
		valueRow(
			"Payment Summary",
			"Unpaid invoice total",
			money(numberOrZero(billing["unpaidTotal"])),
		),
		valueRow(
			"Payment Summary",
			"Outstanding invoices",
			numberOrZero(billing["unpaidCount"]),
			"plain",
		),
		valueRow(
			"Payment Summary",
			"Tenants monitored",
			numberOrZero(billing["tenantCount"]),
			"plain",
		),
		...months.map(
			(m): Row => ({
				cells: [
					"Scheduled Rent & Expenses",
					m.month,
					null,
					money(m.revenue),
					money(m.expenses),
					money(m.net),
				],
				formats: ["plain", "plain", "plain", "money", "money", "money"],
			}),
		),
		...expenseCategories.map(
			(c): Row => valueRow("Expenses by Vendor", c.label, money(c.amount)),
		),
		...months.map(
			(m): Row => valueRow("Scheduled Net", m.month, money(m.net)),
		),
		...leaseProfitabilityRows(sources.overview, propertyName),
	];

	return {
		header: FINANCIAL_ANALYTICS_HEADER,
		rows: rows.map((row) => row.cells),
		formats: rows.map((row) => row.formats),
	};
}
