/**
 * The /analytics/financial export holds what the page shows.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. The page's figures come from two query
 * functions in `src/hooks/api/use-analytics.ts`: `financialPageData()` (three
 * RPCs through `mapFinancialOverview`) and `ownerPaymentSummary()` (one RPC).
 * The export builds its table with `_shared/financial-analytics-report`. Both
 * run here against the SAME recorded RPC answers, and every figure is
 * compared one side to the other, so a change to either side that the other
 * does not follow fails; a literal pins only what both sides must hold (a
 * rounding case, a lease's label, the column a figure sits in):
 *   1. the four RPC calls (name and arguments) are identical;
 *   2. every figure the page renders is a table row, in the page's order;
 *   3. the page sections the export leaves out are not on the page;
 *   4. an RPC shape that makes the page fail makes the export fail;
 *   5. an RPC error fails the export load, naming the RPC;
 *   6. each figure is rounded as the page prints it (`formatCurrency` for an
 *      amount, the margin card's `NumberTicker` for Scheduled Margin, rendered
 *      here) and carries the format the PDF and XLSX print it in;
 *   7. scheduled rent and rent received never share a column.
 * The specifier carries no `.ts` extension (TS5097, see report-csv.test.ts).
 *
 * WHAT NOTHING HERE PROVES. That export-report writes this table to the file:
 * `supabase/functions/tests/export-report-test.ts` (Deno) drives the handler
 * and parses the CSV and XLSX it returns.
 */

import { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NumberTicker } from "#components/ui/number-ticker";
import { formatCurrency } from "#lib/utils/currency";
import type { FinancialAnalyticsPageData } from "#types/analytics-page-data";
import type { OwnerPaymentSummaryResponse } from "#types/api-contracts";
import {
	buildFinancialAnalyticsTable,
	FINANCIAL_ANALYTICS_HEADER,
	type FinancialAnalyticsSources,
	loadFinancialAnalyticsSources,
	type ReportCell,
	type ReportCellFormat,
	leaseProfitabilityLabel,
	type RpcCall,
} from "../_shared/financial-analytics-report";
import {
	expenseVendorLabel,
	propertyReportName,
} from "../_shared/tax-year-reports";

const { mockRpc, USER_ID } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	USER_ID: "owner-1",
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => ({ rpc: mockRpc }),
}));
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: USER_ID }),
}));

import { analyticsQueries } from "#hooks/api/use-analytics";

/** A fresh client per read, so no answer is served from an earlier test. */
function queryClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** The page's two queries, run as the page runs them: through a QueryClient. */
function fetchFinancialPageData(): Promise<FinancialAnalyticsPageData> {
	return queryClient().query(analyticsQueries.financialPageData());
}

function fetchPaymentSummary(): Promise<OwnerPaymentSummaryResponse> {
	return queryClient().query(analyticsQueries.ownerPaymentSummary());
}

type RpcAnswers = Record<string, { data: unknown; error: unknown }>;

/**
 * get_financial_overview's lease profitability (20261110123124): a lease on a
 * property the owner deleted since, then two more, largest net first.
 */
const LEASE_PROFITABILITY = {
	window: "2026-01-01/2026-11-02",
	leases: [
		{
			lease_id: "l8",
			property_name: "South House",
			property_deleted: true,
			unit_number: "S1",
			tenant_name: "Ed South",
			rent_received: 5000,
			expenses: 0,
			net: 5000,
		},
		{
			lease_id: "l1",
			property_name: "North Court",
			property_deleted: false,
			unit_number: "N1",
			tenant_name: "Ann North",
			rent_received: 2000.005,
			expenses: 360.5,
			net: 1639.505,
		},
		{
			lease_id: "l2",
			property_name: "Lot 9",
			property_deleted: false,
			unit_number: null,
			tenant_name: null,
			rent_received: 0,
			expenses: 30,
			net: -30,
		},
	],
};

/** Twelve months, newest first, as get_revenue_trends_optimized returns them. */
function revenueTrends(): unknown[] {
	const months = [
		"2026-10",
		"2026-09",
		"2026-08",
		"2026-07",
		"2026-06",
		"2026-05",
		"2026-04",
		"2026-03",
		"2026-02",
		"2026-01",
		"2025-12",
		"2025-11",
	];
	return months.map((month, index) => ({
		month,
		revenue: 4200 + index * 100,
		// Ledger receipts are numeric(10,2): a float sum carries noise.
		collections: index % 3 === 0 ? 0.1 : 1234.2,
		outstanding: 0,
	}));
}

function richAnswers(): RpcAnswers {
	return {
		get_financial_overview: {
			data: {
				overview: {
					total_revenue: 61200,
					total_expenses: 18350.75,
					net_income: 42849.25,
				},
				lease_profitability: LEASE_PROFITABILITY,
			},
			error: null,
		},
		get_revenue_trends_optimized: { data: revenueTrends(), error: null },
		get_expense_summary: {
			data: {
				categories: [
					{ category: "Acme Plumbing", amount: 9000.5, percentage: 49.05 },
					{ category: "=HYPERLINK(1)", amount: 120, percentage: 0.65 },
					{ category: "Other", amount: 4000.25, percentage: 21.8 },
					{ category: "Roof, Gutter & Co", amount: 2000, percentage: 10.9 },
					{ category: "Sparky Electric", amount: 1500, percentage: 8.17 },
					{ category: "Paint Pros", amount: 1730, percentage: 9.43 },
				],
				monthly_totals: [
					{ month: "2025-11", amount: 0 },
					{ month: "2026-02", amount: 1500 },
					{ month: "2026-06", amount: 9000.5 },
					{ month: "2026-09", amount: 4000.25 },
					{ month: "2026-10", amount: 3850 },
				],
				total_amount: 18350.75,
				monthly_average: 1529.23,
				year_over_year_change: 4.8,
				year_over_year_prior_period: "2025-01-01/2025-11-02",
			},
			error: null,
		},
		get_billing_insights: {
			data: {
				totalRevenue: 61200,
				mrr: 5100,
				churnRate: 12.5,
				// The ledger's figures since 20261110123114: numeric(10,2) dollars
				// and a count, none of them zero, so a dropped figure shows.
				unpaidTotal: 1185.5,
				unpaidCount: 4,
				lateFeeTotal: 115,
				tenantCount: 7,
			},
			error: null,
		},
	};
}

function answer(answers: RpcAnswers) {
	return (name: string) => {
		const result = answers[name];
		if (!result) throw new Error(`unexpected rpc ${name}`);
		return Promise.resolve(result);
	};
}

/** What the page renders: both query functions, run against `answers`. */
async function screen(answers: RpcAnswers): Promise<{
	page: FinancialAnalyticsPageData;
	payments: OwnerPaymentSummaryResponse;
	calls: RpcCall[];
}> {
	const calls: RpcCall[] = [];
	mockRpc.mockImplementation(
		(name: string, args: Readonly<Record<string, string | number>>) => {
			calls.push({ name, args });
			return answer(answers)(name);
		},
	);
	const page = await fetchFinancialPageData();
	const payments = await fetchPaymentSummary();
	return { page, payments, calls };
}

/** What the export loads and writes, against the same `answers`. */
async function exported(answers: RpcAnswers): Promise<{
	rows: readonly (readonly ReportCell[])[];
	formats: readonly (readonly ReportCellFormat[])[];
	calls: RpcCall[];
	sources: FinancialAnalyticsSources;
}> {
	const calls: RpcCall[] = [];
	const load = await loadFinancialAnalyticsSources((name, args) => {
		calls.push({ name, args });
		return answer(answers)(name);
	}, USER_ID);
	if (!load.ok) throw new Error(`load failed on ${load.rpc}`);
	const table = buildFinancialAnalyticsTable(
		load.sources,
		propertyReportName,
		expenseVendorLabel,
	);
	return {
		rows: table.rows,
		formats: table.formats,
		calls,
		sources: load.sources,
	};
}

/** An amount as the page prints it (`formatCurrency`), back as a number. */
const cents = (value: number) =>
	Number(formatCurrency(value).replace(/[$,]/g, ""));

/** Scheduled Margin as its card prints it (its NumberTicker), as a number. */
function oneDecimal(value: number): number {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
	const { container, unmount } = render(
		createElement(NumberTicker, { value, decimalPlaces: 1, duration: 1500 }),
	);
	const text = container.textContent ?? "";
	unmount();
	vi.unstubAllGlobals();
	return Number(text.replace(/,/g, ""));
}

function section(
	rows: readonly (readonly ReportCell[])[],
	name: string,
): (readonly ReportCell[])[] {
	return rows.filter((cells) => cells[0] === name);
}

type Column = (typeof FINANCIAL_ANALYTICS_HEADER)[number];

/** A row with each figure under its column by name, every other cell empty. */
function row(
	s: string,
	item: string,
	figures: Partial<Record<Column, ReportCell>> = {},
): ReportCell[] {
	return FINANCIAL_ANALYTICS_HEADER.map((column) =>
		column === "Section"
			? s
			: column === "Item"
				? item
				: (figures[column] ?? null),
	);
}

/** The columns a row holds a figure in (Section and Item aside). */
function filledColumns(cells: readonly ReportCell[]): Column[] {
	return FINANCIAL_ANALYTICS_HEADER.filter(
		(column, index) =>
			column !== "Section" && column !== "Item" && cells[index] !== null,
	);
}

/** The rows the page's figures imply, in the page's top-to-bottom order. */
function rowsFromScreen(
	page: FinancialAnalyticsPageData,
	payments: OwnerPaymentSummaryResponse,
): (readonly ReportCell[])[] {
	const { metrics } = page;
	const value = (s: string, item: string, v: number): ReportCell[] =>
		row(s, item, { Value: v });
	return [
		value("Overview", "Scheduled", cents(metrics.totalRevenue)),
		value("Overview", "Collected", cents(metrics.totalCollected)),
		value("Overview", "Scheduled Net", cents(metrics.netIncome)),
		value(
			"Overview",
			"Scheduled Margin (%)",
			oneDecimal(metrics.profitMargin ?? 0),
		),
		value(
			"Payment Summary",
			"Late fees cumulative",
			cents(payments.lateFeeTotal),
		),
		value(
			"Payment Summary",
			"Unpaid invoice total",
			cents(payments.unpaidTotal),
		),
		value("Payment Summary", "Outstanding invoices", payments.unpaidCount),
		value("Payment Summary", "Tenants monitored", payments.tenantCount),
		...page.monthlyMetrics.map((m) =>
			row("Scheduled Rent & Expenses", m.month, {
				"Scheduled Rent": cents(m.revenue),
				Expenses: cents(m.expenses),
				"Scheduled Net": cents(m.netIncome),
			}),
		),
		...page.breakdown.expenses.map((e) =>
			value("Expenses by Vendor", e.label, cents(e.value)),
		),
		...page.netOperatingIncome.map((n) =>
			value("Scheduled Net", n.propertyName, cents(n.noi)),
		),
		...(page.leaseProfitability.status === "ready"
			? [
					row("Lease Profitability", "Period", {
						Value: `${page.leaseProfitability.window.start_date} to ${page.leaseProfitability.window.end_date}`,
					}),
					...page.leaseProfitability.leases.map((l) =>
						row("Lease Profitability", leaseProfitabilityLabel(l), {
							"Rent Received": cents(l.rentReceived),
							Expenses: cents(l.expenses),
							Net: cents(l.net),
						}),
					),
				]
			: [row("Lease Profitability", "Unavailable")]),
	];
}

beforeEach(() => {
	mockRpc.mockReset();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the export calls the RPCs the page calls", () => {
	it("makes the same four calls with the same arguments", async () => {
		const answers = richAnswers();
		const page = await screen(answers);
		const file = await exported(answers);
		const key = (c: RpcCall) => JSON.stringify([c.name, c.args]);
		expect(page.calls.map(key).sort()).toEqual(file.calls.map(key).sort());
		expect(file.calls).toHaveLength(4);
	});
});

describe("every figure the page renders is a row of the file", () => {
	it("matches the screen row for row, for a full portfolio", async () => {
		const answers = richAnswers();
		const { page, payments } = await screen(answers);
		const { rows } = await exported(answers);
		expect(rows).toEqual(rowsFromScreen(page, payments));
		// Guards against both sides being empty: the fixture fills every section,
		// the four payment figures included.
		for (const figure of [
			payments.lateFeeTotal,
			payments.unpaidTotal,
			payments.unpaidCount,
			payments.tenantCount,
		]) {
			expect(figure).toBeGreaterThan(0);
		}
		expect(section(rows, "Payment Summary").map((r) => r[2])).toEqual([
			cents(payments.lateFeeTotal),
			cents(payments.unpaidTotal),
			payments.unpaidCount,
			payments.tenantCount,
		]);
		expect(section(rows, "Scheduled Rent & Expenses")).toHaveLength(12);
		expect(section(rows, "Expenses by Vendor")).toHaveLength(6);
		expect(section(rows, "Scheduled Net")).toHaveLength(12);
	});

	it('names the expenses with no vendor once, never as the vendor "Other"', async () => {
		// get_expense_summary puts an expense with no vendor under a NULL
		// category (20261110123120); "Other" is a vendor the owner named so.
		const answers = richAnswers();
		answers.get_expense_summary = {
			data: {
				categories: [
					{ category: "Other", amount: 4000.25, percentage: 80 },
					{ category: null, amount: 1000, percentage: 20 },
				],
				monthly_totals: [],
				total_amount: 5000.25,
			},
			error: null,
		};
		const { page } = await screen(answers);
		const { rows } = await exported(answers);
		expect(page.breakdown.expenses.map((e) => e.label)).toEqual([
			"Other",
			"No vendor recorded",
		]);
		expect(section(rows, "Expenses by Vendor").map((r) => r[1])).toEqual([
			"Other",
			"No vendor recorded",
		]);
	});

	it("keeps every expense category, though the page lists the first five", async () => {
		const answers = richAnswers();
		const { page } = await screen(answers);
		const { rows } = await exported(answers);
		expect(page.breakdown.expenses.length).toBeGreaterThan(5);
		expect(section(rows, "Expenses by Vendor").map((r) => r[1])).toEqual(
			page.breakdown.expenses.map((e) => e.label),
		);
	});

	it("rounds the summed ledger receipts to cents, as the card shows dollars", async () => {
		const answers = richAnswers();
		const { page } = await screen(answers);
		const { rows } = await exported(answers);
		const collected = section(rows, "Overview").find(
			(r) => r[1] === "Collected",
		);
		expect(collected?.[2]).toBe(cents(page.metrics.totalCollected));
		expect(Number.isInteger((collected?.[2] as number) * 100)).toBe(true);
	});

	it("matches when net_income is absent and revenue is zero", async () => {
		const answers = richAnswers();
		answers.get_financial_overview = {
			data: { overview: { total_revenue: 0, total_expenses: 250 } },
			error: null,
		};
		const { page, payments } = await screen(answers);
		const { rows } = await exported(answers);
		expect(rows).toEqual(rowsFromScreen(page, payments));
		expect(page.metrics.netIncome).toBe(-250);
		expect(page.metrics.profitMargin).toBe(0);
	});

	it("matches a new owner whose RPCs return no data", async () => {
		const answers: RpcAnswers = {
			get_financial_overview: { data: null, error: null },
			get_revenue_trends_optimized: { data: null, error: null },
			get_expense_summary: { data: null, error: null },
			get_billing_insights: { data: null, error: null },
		};
		const { page, payments } = await screen(answers);
		const { rows } = await exported(answers);
		expect(rows).toEqual(rowsFromScreen(page, payments));
		// The four overview cards and the four payment cards (no Cash Flow),
		// and the lease table's one row: unavailable, never empty.
		expect(rows).toHaveLength(9);
		expect(section(rows, "Lease Profitability")).toEqual([
			row("Lease Profitability", "Unavailable"),
		]);
	});

	it("writes the fixed header", async () => {
		const answers = richAnswers();
		const file = await exported(answers);
		const table = buildFinancialAnalyticsTable(
			file.sources,
			propertyReportName,
			expenseVendorLabel,
		);
		expect(table.header).toEqual(FINANCIAL_ANALYTICS_HEADER);
		for (const cells of table.rows) {
			expect(cells).toHaveLength(FINANCIAL_ANALYTICS_HEADER.length);
		}
	});

	it("never puts scheduled rent and rent received in one column", async () => {
		// A spreadsheet sums a column, and scheduled rent is never summed with the
		// ledger's cash (CLAUDE.md). The chart's months (scheduled) and the
		// table's leases (rent received) fill columns of their own, named as the
		// chart's series and the table's columns are; Expenses is an expense in
		// both.
		const { rows } = await exported(richAnswers());
		const months = section(rows, "Scheduled Rent & Expenses");
		const leases = section(rows, "Lease Profitability").filter(
			(cells) => cells[1] !== "Period",
		);
		expect(months).toHaveLength(12);
		expect(leases).toHaveLength(LEASE_PROFITABILITY.leases.length);
		for (const month of months) {
			expect(filledColumns(month), String(month[1])).toEqual([
				"Scheduled Rent",
				"Expenses",
				"Scheduled Net",
			]);
		}
		for (const lease of leases) {
			expect(filledColumns(lease), String(lease[1])).toEqual([
				"Rent Received",
				"Expenses",
				"Net",
			]);
		}
	});
});

describe("each figure is rounded and formatted as the page prints it", () => {
	it.each([
		// [total_revenue, net_income]: Scheduled Margin -124.75 (a tie Math.round
		// took toward +Infinity), 0.15 (toFixed rounds the binary value down),
		// -24.95.
		[400, -499],
		[2000, 3],
		[2000, -499],
	])(
		"rounds Scheduled Margin as the card shows it (revenue %d, net %d)",
		async (revenue, net) => {
			const answers = richAnswers();
			answers.get_financial_overview = {
				data: {
					overview: {
						total_revenue: revenue,
						total_expenses: revenue - net,
						net_income: net,
					},
				},
				error: null,
			};
			const { page, payments } = await screen(answers);
			const { rows } = await exported(answers);
			const margin = section(rows, "Overview").find(
				(r) => r[1] === "Scheduled Margin (%)",
			);
			expect(margin?.[2]).toBe(oneDecimal(page.metrics.profitMargin ?? 0));
			expect(rows).toEqual(rowsFromScreen(page, payments));
		},
	);

	it("rounds an amount as formatCurrency does", async () => {
		const answers = richAnswers();
		// -199.995: Math.round wrote -199.99 where formatCurrency prints -$200.00.
		answers.get_financial_overview = {
			data: {
				overview: {
					total_revenue: 100.005,
					total_expenses: 300,
					net_income: -199.995,
				},
			},
			error: null,
		};
		const { page, payments } = await screen(answers);
		const { rows } = await exported(answers);
		const net = section(rows, "Overview").find((r) => r[1] === "Scheduled Net");
		expect(net?.[2]).toBe(-200);
		expect(formatCurrency(page.metrics.netIncome)).toBe("-$200.00");
		expect(rows).toEqual(rowsFromScreen(page, payments));
	});

	it("gives every cell a format: money, Scheduled Margin a percentage, counts plain", async () => {
		const { rows, formats } = await exported(richAnswers());
		expect(formats.map((f) => f.length)).toEqual(rows.map((r) => r.length));
		const valueFormat = (item: string) => {
			const index = rows.findIndex((r) => r[1] === item);
			return formats[index]?.[2];
		};
		expect(valueFormat("Scheduled Margin (%)")).toBe("percent");
		expect(valueFormat("Outstanding invoices")).toBe("plain");
		expect(valueFormat("Tenants monitored")).toBe("plain");
		for (const item of [
			"Scheduled",
			"Collected",
			"Scheduled Net",
			"Late fees cumulative",
			"Unpaid invoice total",
			"Acme Plumbing",
		]) {
			expect(valueFormat(item), item).toBe("money");
		}
		// A month's, a vendor's and a lease's figures are money; every other
		// cell of those rows, and the lease table's period, prints plain.
		const moneyColumns: Partial<Record<string, readonly Column[]>> = {
			"Scheduled Rent & Expenses": [
				"Scheduled Rent",
				"Expenses",
				"Scheduled Net",
			],
			"Expenses by Vendor": ["Value"],
			"Scheduled Net": ["Value"],
			"Lease Profitability": ["Rent Received", "Expenses", "Net"],
		};
		for (const [index, cells] of rows.entries()) {
			const f = formats[index] ?? [];
			expect([f[0], f[1]]).toEqual(["plain", "plain"]);
			const name = String(cells[0]);
			const money =
				name === "Lease Profitability" && cells[1] === "Period"
					? []
					: moneyColumns[name];
			if (money === undefined) continue;
			expect(f, `${name} ${String(cells[1])}`).toEqual(
				FINANCIAL_ANALYTICS_HEADER.map((column) =>
					money.includes(column) ? "money" : "plain",
				),
			);
		}
	});
});

describe("the page sections the export leaves out are not on the page", () => {
	// The page's Revenue Breakdown card was always empty and went in 66.2-39
	// part P; neither the page data nor the file carries a revenue breakdown.
	it("has no revenue breakdown", async () => {
		const { page } = await screen(richAnswers());
		expect(Object.keys(page.breakdown)).not.toContain("revenue");
		const { rows } = await exported(richAnswers());
		expect(rows.map((cells) => cells[0])).not.toContain("Revenue Breakdown");
	});
});

describe("the lease profitability table is in the file as on the page", () => {
	it("writes each lease the page lists, labelled as the page labels it", async () => {
		const { page } = await screen(richAnswers());
		const { rows } = await exported(richAnswers());
		expect(section(rows, "Lease Profitability")).toEqual([
			row("Lease Profitability", "Period", {
				Value: "2026-01-01 to 2026-11-02",
			}),
			row("Lease Profitability", "South House (deleted) \u00b7 S1 (Ed South)", {
				"Rent Received": 5000,
				Expenses: 0,
				Net: 5000,
			}),
			row("Lease Profitability", "North Court \u00b7 N1 (Ann North)", {
				"Rent Received": 2000.01,
				Expenses: 360.5,
				Net: 1639.51,
			}),
			row("Lease Profitability", "Lot 9", {
				"Rent Received": 0,
				Expenses: 30,
				Net: -30,
			}),
		]);
		expect(page.leaseProfitability).toMatchObject({
			status: "ready",
			window: { start_date: "2026-01-01", end_date: "2026-11-02" },
		});
	});

	it("says the table is unavailable from the body before 20261110123124", async () => {
		const answers = richAnswers();
		answers.get_financial_overview = {
			data: {
				overview: {
					total_revenue: 61200,
					total_expenses: 18350.75,
					net_income: 42849.25,
				},
			},
			error: null,
		};
		const { page, payments } = await screen(answers);
		const { rows } = await exported(answers);
		expect(page.leaseProfitability).toEqual({ status: "unavailable" });
		expect(rows).toEqual(rowsFromScreen(page, payments));
		expect(section(rows, "Lease Profitability")).toEqual([
			row("Lease Profitability", "Unavailable"),
		]);
	});
});

describe("an RPC shape the page cannot render fails the export", () => {
	it("throws on a revenue trend that is not an array, as the page does", async () => {
		const answers = richAnswers();
		answers.get_revenue_trends_optimized = {
			data: { month: "2026-10" },
			error: null,
		};
		mockRpc.mockImplementation(answer(answers));
		await expect(fetchFinancialPageData()).rejects.toMatchObject({
			message: expect.stringContaining("array"),
		});
		await expect(exported(answers)).rejects.toMatchObject({
			message: expect.stringContaining("array"),
		});
	});

	it.each([
		["an array", [{ unpaidTotal: 1185.5 }]],
		["a scalar", 0],
	])(
		"throws on billing insights that are %s, as the page does",
		async (_what, data) => {
			const answers = richAnswers();
			answers.get_billing_insights = { data, error: null };
			mockRpc.mockImplementation(answer(answers));
			await expect(fetchPaymentSummary()).rejects.toMatchObject({
				message: expect.stringContaining("Expected JSON object"),
			});
			await expect(exported(answers)).rejects.toMatchObject({
				message: expect.stringContaining("JSON object"),
			});
		},
	);

	it("throws on monthly expense totals that are not an array, as the page does", async () => {
		const answers = richAnswers();
		answers.get_expense_summary = {
			data: { categories: [], monthly_totals: { month: "2026-10" } },
			error: null,
		};
		mockRpc.mockImplementation(answer(answers));
		await expect(fetchFinancialPageData()).rejects.toBeInstanceOf(TypeError);
		await expect(exported(answers)).rejects.toMatchObject({
			message: expect.stringContaining("array"),
		});
	});
});

describe("an RPC error fails the load", () => {
	for (const rpc of [
		"get_financial_overview",
		"get_revenue_trends_optimized",
		"get_expense_summary",
		"get_billing_insights",
	]) {
		it(`names ${rpc} and returns no sources`, async () => {
			const answers = richAnswers();
			const failure = { message: "permission denied", code: "42501" };
			answers[rpc] = { data: null, error: failure };
			const load = await loadFinancialAnalyticsSources(
				(name) => answer(answers)(name),
				USER_ID,
			);
			expect(load).toEqual({ ok: false, rpc, error: failure });
		});
	}
});
