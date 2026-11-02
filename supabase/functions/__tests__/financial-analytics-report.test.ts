/**
 * The /analytics/financial export holds what the page shows.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. The page's figures come from two query
 * functions in `src/hooks/api/use-analytics.ts`: `financialPageData()` (three
 * RPCs through `mapFinancialOverview`) and `ownerPaymentSummary()` (one RPC).
 * The export builds its table with `_shared/financial-analytics-report`. Both
 * run here against the SAME recorded RPC answers, and every assertion compares
 * one side to the other, never to a hand-copied literal, so a change to either
 * side that the other does not follow fails:
 *   1. the four RPC calls (name and arguments) are identical;
 *   2. every figure the page renders is a table row, in the page's order;
 *   3. the page sections the export leaves out are empty on the page too;
 *   4. an RPC shape that makes the page fail makes the export fail;
 *   5. an RPC error fails the export load, naming the RPC;
 *   6. each figure is rounded as the page prints it (`formatCurrency` for an
 *      amount, the ROI card's `NumberTicker` for Portfolio ROI, rendered
 *      here) and carries the format the PDF and XLSX print it in.
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
	type RpcCall,
} from "../_shared/financial-analytics-report";

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
					accounts_receivable: 0,
					accounts_payable: 0,
				},
				highlights: [],
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
				year_over_year_change: null,
			},
			error: null,
		},
		get_billing_insights: {
			data: {
				totalRevenue: 61200,
				mrr: 5100,
				churnRate: 12.5,
				unpaidTotal: 0,
				unpaidCount: 0,
				lateFeeTotal: 0,
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
	const table = buildFinancialAnalyticsTable(load.sources);
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

/** Portfolio ROI as the ROI card prints it (its NumberTicker), as a number. */
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
	return rows.filter((row) => row[0] === name);
}

/** The rows the page's figures imply, in the page's top-to-bottom order. */
function rowsFromScreen(
	page: FinancialAnalyticsPageData,
	payments: OwnerPaymentSummaryResponse,
): (readonly ReportCell[])[] {
	const { metrics } = page;
	const value = (s: string, item: string, v: number): ReportCell[] => [
		s,
		item,
		v,
		null,
		null,
		null,
	];
	return [
		value("Overview", "Scheduled", cents(metrics.totalRevenue)),
		value("Overview", "Collected", cents(metrics.totalCollected)),
		value("Overview", "Net Income", cents(metrics.netIncome)),
		value(
			"Overview",
			"Portfolio ROI (%)",
			oneDecimal(metrics.profitMargin ?? 0),
		),
		value("Overview", "Cash Flow", cents(metrics.cashFlow)),
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
		...page.monthlyMetrics.map((m): ReportCell[] => [
			"Revenue & Expenses",
			m.month,
			null,
			cents(m.revenue),
			cents(m.expenses),
			cents(m.netIncome),
		]),
		...page.breakdown.expenses.map((e) =>
			value("Expense Breakdown", e.label, cents(e.value)),
		),
		...page.netOperatingIncome.map((n) =>
			value("Net Operating Income", n.propertyName, cents(n.noi)),
		),
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
		// Guards against both sides being empty: the fixture fills every section.
		expect(section(rows, "Revenue & Expenses")).toHaveLength(12);
		expect(section(rows, "Expense Breakdown")).toHaveLength(6);
		expect(section(rows, "Net Operating Income")).toHaveLength(12);
	});

	it("keeps every expense category, though the page lists the first five", async () => {
		const answers = richAnswers();
		const { page } = await screen(answers);
		const { rows } = await exported(answers);
		expect(page.breakdown.expenses.length).toBeGreaterThan(5);
		expect(section(rows, "Expense Breakdown").map((r) => r[1])).toEqual(
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
		expect(rows).toHaveLength(9);
	});

	it("writes the fixed header", async () => {
		const answers = richAnswers();
		const file = await exported(answers);
		const table = buildFinancialAnalyticsTable(file.sources);
		expect(table.header).toEqual(FINANCIAL_ANALYTICS_HEADER);
		for (const row of table.rows) {
			expect(row).toHaveLength(FINANCIAL_ANALYTICS_HEADER.length);
		}
	});
});

describe("each figure is rounded and formatted as the page prints it", () => {
	it.each([
		// [total_revenue, net_income]: ROI -124.75 (a tie Math.round took toward
		// +Infinity), 0.15 (toFixed rounds the binary value down), -24.95.
		[400, -499],
		[2000, 3],
		[2000, -499],
	])(
		"rounds Portfolio ROI as the card shows it (revenue %d, net %d)",
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
			const roi = section(rows, "Overview").find(
				(r) => r[1] === "Portfolio ROI (%)",
			);
			expect(roi?.[2]).toBe(oneDecimal(page.metrics.profitMargin ?? 0));
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
		const net = section(rows, "Overview").find((r) => r[1] === "Net Income");
		expect(net?.[2]).toBe(-200);
		expect(formatCurrency(page.metrics.netIncome)).toBe("-$200.00");
		expect(rows).toEqual(rowsFromScreen(page, payments));
	});

	it("gives every cell a format: money, Portfolio ROI a percentage, counts plain", async () => {
		const { rows, formats } = await exported(richAnswers());
		expect(formats.map((f) => f.length)).toEqual(rows.map((r) => r.length));
		const valueFormat = (item: string) => {
			const index = rows.findIndex((r) => r[1] === item);
			return formats[index]?.[2];
		};
		expect(valueFormat("Portfolio ROI (%)")).toBe("percent");
		expect(valueFormat("Outstanding invoices")).toBe("plain");
		expect(valueFormat("Tenants monitored")).toBe("plain");
		for (const item of [
			"Scheduled",
			"Collected",
			"Net Income",
			"Cash Flow",
			"Late fees cumulative",
			"Unpaid invoice total",
			"Acme Plumbing",
		]) {
			expect(valueFormat(item), item).toBe("money");
		}
		for (const [index, row] of rows.entries()) {
			const f = formats[index] ?? [];
			expect([f[0], f[1]]).toEqual(["plain", "plain"]);
			if (row[0] === "Revenue & Expenses") {
				expect(f.slice(2)).toEqual(["plain", "money", "money", "money"]);
			} else if (
				row[0] === "Expense Breakdown" ||
				row[0] === "Net Operating Income"
			) {
				expect(f.slice(2)).toEqual(["money", "plain", "plain", "plain"]);
			}
		}
	});
});

describe("the page sections the export leaves out are empty on the page", () => {
	it("has no revenue breakdown, lease, billing timeline or invoice data", async () => {
		const { page } = await screen(richAnswers());
		expect(page.breakdown.revenue).toEqual([]);
		expect(page.leaseAnalytics).toEqual([]);
		expect(page.invoiceSummary).toEqual([]);
		expect(page.billingInsights.points).toEqual([]);
		expect(page.billingInsights.totals).toEqual({
			invoiced: 0,
			paid: 0,
			overdue: 0,
		});
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
