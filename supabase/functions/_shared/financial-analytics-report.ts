/**
 * The `/analytics/financial` page as an export table, as pure functions: the
 * four RPCs the page reads, how to load them, and the figures the page renders
 * from them, one table row per figure.
 *
 * THIS MODULE IS A DEPENDENCY-FREE LEAF. It has no import statement and no
 * reference to a runtime global (no Deno namespace, no Response, no network:
 * the RPC caller is passed in), so `__tests__/financial-analytics-report.test.ts`
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
 *   - Overview: the five stat cards (Scheduled, Collected, Net Income,
 *     Portfolio ROI, Cash Flow).
 *   - Payment Summary: the four payment cards.
 *   - Revenue & Expenses: one row per month of the chart, oldest first, with
 *     its revenue, expenses and net income.
 *   - Expense Breakdown: every category of the breakdown list (the page lists
 *     the first five), in the RPC's order, with its amount.
 *   - Net Operating Income: one row per month of the NOI chart, oldest first.
 * The page's Revenue Breakdown, Lease Profitability, Billing Timeline and
 * Invoice Summary have no data source (`mapFinancialOverview` always returns
 * them empty), so they contribute no rows; the test fails if the mapper ever
 * fills one, so the export cannot silently fall behind the page.
 *
 * NUMBERS. Every amount is dollars, rounded to cents (the ledger's collected
 * receipts are summed in floating point, so the raw sum can carry noise such
 * as 0.30000000000000004). Portfolio ROI is a percentage rounded to one
 * decimal, as the card shows it. Counts are written as they come.
 */

export const FINANCIAL_ANALYTICS_REPORT_TYPE = "financial-analytics";

export const FINANCIAL_ANALYTICS_HEADER = [
	"Section",
	"Item",
	"Value",
	"Revenue",
	"Expenses",
	"Net Income",
] as const;

/** One cell: text, a number, or empty. */
export type ReportCell = string | number | null;

export interface FinancialAnalyticsTable {
	readonly header: readonly string[];
	readonly rows: readonly (readonly ReportCell[])[];
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

/** `supabase.rpc`, as the loader needs it. */
export type RpcCaller = (
	name: string,
	args: Readonly<Record<string, string | number>>,
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

function money(value: number): number {
	return Math.round(value * 100) / 100;
}

function percentOneDecimal(value: number): number {
	return Math.round(value * 10) / 10;
}

function numberOrZero(value: unknown): number {
	return typeof value === "number" ? value : 0;
}

type Row = readonly ReportCell[];

function valueRow(section: string, item: string, value: number): Row {
	return [section, item, value, null, null, null];
}

/**
 * The page's figures as table rows. Each figure is derived as
 * `mapFinancialOverview` and `ownerPaymentSummary` derive it.
 */
export function buildFinancialAnalyticsTable(
	sources: FinancialAnalyticsSources,
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
				label: String(row["category"] ?? ""),
				amount: Number(row["amount"] ?? 0),
			};
		},
	);

	const billing = asRecord(sources.billingInsights) ?? {};

	const rows: Row[] = [
		valueRow("Overview", "Scheduled", money(totalRevenue)),
		valueRow("Overview", "Collected", money(totalCollected)),
		valueRow("Overview", "Net Income", money(netIncome)),
		valueRow("Overview", "Portfolio ROI (%)", percentOneDecimal(profitMargin)),
		valueRow("Overview", "Cash Flow", money(netIncome)),
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
		),
		valueRow(
			"Payment Summary",
			"Tenants monitored",
			numberOrZero(billing["tenantCount"]),
		),
		...months.map(
			(m): Row => [
				"Revenue & Expenses",
				m.month,
				null,
				money(m.revenue),
				money(m.expenses),
				money(m.net),
			],
		),
		...expenseCategories.map(
			(c): Row => valueRow("Expense Breakdown", c.label, money(c.amount)),
		),
		...months.map(
			(m): Row => valueRow("Net Operating Income", m.month, money(m.net)),
		),
	];

	return { header: FINANCIAL_ANALYTICS_HEADER, rows };
}
