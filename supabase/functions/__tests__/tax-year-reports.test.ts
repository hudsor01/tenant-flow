/**
 * The year-end, 1099-NEC and tax-documents PDFs hold what their pages show.
 *
 * WHAT WENT WRONG. "Download PDF" on `/reports/year-end` and
 * `/reports/tax-documents` asked generate-pdf (Mode 1) for `year-end` and
 * `financial`, which printed `get_financial_overview` flattened into two
 * `metric | value` rows (`overview` and `highlights` as JSON text): none of the
 * figures either page shows. export-report's `year-end` and `1099` types had
 * the same defect (`1099` printed `get_billing_insights`, a lease-revenue
 * payload, as a "1099" report).
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Each page's figures come from query
 * functions in `src/hooks/api/query-keys/`: `reportAnalyticsQueries.yearEnd`
 * and `report1099` (the year-end page) and `financialTaxQueries.taxDocuments`
 * (the tax-documents page). The exports build their tables with
 * `_shared/tax-year-reports`. Both run here against the SAME recorded RPC
 * answers, and every assertion compares one side to the other, never to a
 * hand-copied literal:
 *   1. the RPC calls (name and arguments, so the year) are identical;
 *   2. every figure the page renders is a table row, in the page's order;
 *   3. the section the export leaves out (Property Depreciation) is empty on
 *      the page too;
 *   4. an RPC shape that makes the page fail makes the export fail;
 *   5. an RPC error fails the export load, naming the RPC.
 * The specifier carries no `.ts` extension (TS5097, see report-csv.test.ts).
 *
 * WHAT NOTHING HERE PROVES. That the functions print this table: the Deno
 * tests `supabase/functions/tests/generate-pdf-test.ts` and
 * `export-report-test.ts` drive the handlers and compare the HTML each posts
 * (`report-html.ts` has a `.ts` import, so it cannot load here).
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sortExpenseCategoriesDesc } from "#components/reports/sections/year-end-report-section-utils";
import type { TaxDocumentsData } from "#types/financial-statements";
import type { Year1099Summary, YearEndSummary } from "#types/reports";
import type {
	ReportCell,
	RpcCall,
} from "../_shared/financial-analytics-report";
import {
	buildTaxYearReport,
	loadTaxYearSources,
	REPORT_1099_SECTION,
	REPORT_1099_THRESHOLD,
	REPORT_1099_TYPE,
	TAX_DOCUMENTS_REPORT_TYPE,
	taxYearReportCalls,
	YEAR_END_REPORT_TYPE,
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

import { financialTaxQueries } from "#hooks/api/query-keys/expense-keys";
import { reportAnalyticsQueries } from "#hooks/api/query-keys/report-analytics-keys";

const YEAR = 2024;

type RpcAnswers = Record<string, { data: unknown; error: unknown }>;

function richAnswers(): RpcAnswers {
	return {
		get_dashboard_stats: {
			data: { revenue: { monthly: 5100, yearly: 61200 }, units: {} },
			error: null,
		},
		get_expense_summary: {
			data: {
				categories: [
					{ category: "=HYPERLINK(1)", amount: 120, percentage: 0.65 },
					{ category: "Acme Plumbing", amount: 9000.5, percentage: 49.05 },
					{ category: "roof_and_gutter", amount: 2000, percentage: 0.15 },
				],
				monthly_totals: [],
				total_amount: 11120.5,
				vendor_payments: [
					{ vendor_name: "Acme Plumbing", total_paid: 9000.5, job_count: 4 },
					{ vendor_name: "<b>Sparky</b>", total_paid: 750, job_count: 1 },
				],
			},
			error: null,
		},
		get_property_performance_analytics: {
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					total_revenue: 36000,
					total_expenses: 9000.5,
					net_income: 26999.5,
				},
				{
					property_id: "p2",
					property_name: "Elm & Oak",
					total_revenue: 25200,
					total_expenses: 2120,
					net_income: 23080,
				},
			],
			error: null,
		},
	};
}

/** No vendor payments: what the RPC really returns today (no such key). */
function plainAnswers(): RpcAnswers {
	const answers = richAnswers();
	const summary = answers.get_expense_summary?.data;
	if (summary && typeof summary === "object" && "vendor_payments" in summary) {
		const { vendor_payments: _omit, ...rest } = summary;
		answers.get_expense_summary = { data: rest, error: null };
	}
	return answers;
}

function answer(answers: RpcAnswers) {
	return (name: string) => {
		const result = answers[name];
		if (!result) throw new Error(`unexpected rpc ${name}`);
		return Promise.resolve(result);
	};
}

function queryClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface Screen {
	yearEnd: YearEndSummary;
	report1099: Year1099Summary;
	taxDocuments: TaxDocumentsData;
	calls: Record<"yearEnd" | "report1099" | "taxDocuments", RpcCall[]>;
}

/** What the pages render: their query functions, run against `answers`. */
async function screen(answers: RpcAnswers): Promise<Screen> {
	const calls: Screen["calls"] = {
		yearEnd: [],
		report1099: [],
		taxDocuments: [],
	};
	let sink: RpcCall[] = [];
	mockRpc.mockImplementation(
		(name: string, args: Readonly<Record<string, string | number>>) => {
			sink.push({ name, args });
			return answer(answers)(name);
		},
	);
	sink = calls.yearEnd;
	const yearEnd = await queryClient().fetchQuery(
		reportAnalyticsQueries.yearEnd(YEAR),
	);
	sink = calls.report1099;
	const report1099 = await queryClient().fetchQuery(
		reportAnalyticsQueries.report1099(YEAR),
	);
	sink = calls.taxDocuments;
	const taxDocuments = await queryClient().fetchQuery(
		financialTaxQueries.taxDocuments(YEAR),
	);
	return { yearEnd, report1099, taxDocuments, calls };
}

/** What an export loads and writes for one report type, against `answers`. */
async function exported(
	reportType: string,
	answers: RpcAnswers,
): Promise<{ rows: readonly (readonly ReportCell[])[]; calls: RpcCall[]; title: string; header: readonly string[] }> {
	const calls: RpcCall[] = [];
	const load = await loadTaxYearSources(
		(name, args) => {
			calls.push({ name, args });
			return answer(answers)(name);
		},
		reportType,
		USER_ID,
		YEAR,
	);
	if (!load.ok) throw new Error(`load failed on ${load.rpc}`);
	const report = buildTaxYearReport(reportType, load.sources, YEAR);
	return {
		rows: report.table.rows,
		calls,
		title: report.title,
		header: report.table.header,
	};
}

const cents = (value: number) => Math.round(value * 100) / 100;
const distinct = (calls: readonly RpcCall[]) =>
	[...new Set(calls.map((c) => JSON.stringify(c)))].sort();

/** The 1099-NEC section as the year-end page renders it. */
function expected1099Rows(summary: Year1099Summary): ReportCell[][] {
	if (summary.recipients.length === 0) {
		return [
			[
				REPORT_1099_SECTION,
				`No vendors exceeded the $${summary.threshold} threshold`,
				null,
				null,
				null,
				null,
				null,
				null,
			],
		];
	}
	return summary.recipients.map((r) => [
		REPORT_1099_SECTION,
		r.vendorName,
		r.jobCount,
		cents(r.totalPaid),
		null,
		null,
		null,
		"1099 Required",
	]);
}

/** The year-end page's figures as rows, top to bottom. */
function expectedYearEndRows(page: Screen): ReportCell[][] {
	const s = page.yearEnd;
	return [
		["Summary", "Gross Rental Income", null, cents(s.grossRentalIncome), null, null, null, null],
		["Summary", "Operating Expenses", null, cents(s.operatingExpenses), null, null, null, null],
		["Summary", "Net Income", null, cents(s.netIncome), null, null, null, null],
		...s.byProperty.map((p): ReportCell[] => [
			"By Property",
			p.propertyName,
			null,
			null,
			cents(p.income),
			cents(p.expenses),
			cents(p.netIncome),
			null,
		]),
		...sortExpenseCategoriesDesc(s.expenseByCategory).map((c): ReportCell[] => [
			"Expense Breakdown",
			c.category,
			null,
			cents(c.amount),
			null,
			null,
			null,
			null,
		]),
		...expected1099Rows(page.report1099),
	];
}

/** The tax-documents page's figures as rows, top to bottom. */
function expectedTaxRows(data: TaxDocumentsData): ReportCell[][] {
	return [
		["Summary", "Gross Income", cents(data.totals.totalIncome), null],
		["Summary", "Total Deductions", cents(data.totals.totalDeductions), null],
		["Summary", "Net Taxable Income", cents(data.totals.netTaxableIncome), null],
		...data.expenseCategories
			.filter((c) => c.deductible)
			.map((c): ReportCell[] => [
				"Deductible Expenses (Schedule E)",
				c.category.replace(/_/g, " "),
				cents(c.amount),
				Number(c.percentage.toFixed(1)),
			]),
	];
}

describe("tax-year reports hold their pages' figures", () => {
	beforeEach(() => {
		mockRpc.mockReset();
	});

	it.each([
		["with 1099 recipients", richAnswers],
		["with none (the RPC emits no vendor_payments today)", plainAnswers],
	])("year-end, %s", async (_name, answers) => {
		const page = await screen(answers());
		const file = await exported(YEAR_END_REPORT_TYPE, answers());
		expect(distinct(file.calls)).toEqual(
			distinct([...page.calls.yearEnd, ...page.calls.report1099]),
		);
		expect(file.rows).toEqual(expectedYearEndRows(page));
		expect(file.title).toContain(String(YEAR));
		expect(page.report1099.threshold).toBe(REPORT_1099_THRESHOLD);
	});

	it.each([
		["with 1099 recipients", richAnswers],
		["with none", plainAnswers],
	])("1099, %s", async (_name, answers) => {
		const page = await screen(answers());
		const file = await exported(REPORT_1099_TYPE, answers());
		expect(distinct(file.calls)).toEqual(distinct(page.calls.report1099));
		expect(file.rows).toEqual(expected1099Rows(page.report1099));
	});

	it("tax documents", async () => {
		const page = await screen(richAnswers());
		const file = await exported(TAX_DOCUMENTS_REPORT_TYPE, richAnswers());
		expect(distinct(file.calls)).toEqual(distinct(page.calls.taxDocuments));
		expect(file.rows).toEqual(expectedTaxRows(page.taxDocuments));
		// The page's Property Depreciation has no source; were it to fill, this
		// export would fall behind the page.
		expect(page.taxDocuments.propertyDepreciation).toEqual([]);
		// Shares print as the page's toFixed(1): 0.15 is "0.1", not Math.round's 0.2.
		expect(file.rows.map((r) => r[3])).toContain(0.1);
	});

	it("reads the year asked for", () => {
		for (const type of [
			YEAR_END_REPORT_TYPE,
			REPORT_1099_TYPE,
			TAX_DOCUMENTS_REPORT_TYPE,
		]) {
			const expense = taxYearReportCalls(type, USER_ID, 2019).find(
				(c) => c.name === "get_expense_summary",
			);
			expect(expense?.args, type).toEqual({
				p_user_id: USER_ID,
				p_start_date: "2019-01-01",
				p_end_date: "2019-12-31",
			});
		}
	});

	it("fails where the page fails: a non-array categories payload", async () => {
		const bad = richAnswers();
		bad.get_expense_summary = {
			data: { categories: { not: "an array" }, total_amount: 1 },
			error: null,
		};
		await expect(screen(bad)).rejects.toBeInstanceOf(Error);
		await expect(exported(YEAR_END_REPORT_TYPE, bad)).rejects.toMatchObject({
			message: expect.stringContaining("expense categories"),
		});
		await expect(exported(TAX_DOCUMENTS_REPORT_TYPE, bad)).rejects.toMatchObject(
			{ message: expect.stringContaining("expense categories") },
		);
	});

	it("an RPC error fails the load, naming the RPC", async () => {
		for (const rpc of [
			"get_dashboard_stats",
			"get_expense_summary",
			"get_property_performance_analytics",
		]) {
			const answers = richAnswers();
			answers[rpc] = { data: null, error: { message: "denied" } };
			const load = await loadTaxYearSources(
				(name) => answer(answers)(name),
				YEAR_END_REPORT_TYPE,
				USER_ID,
				YEAR,
			);
			expect(load).toMatchObject({ ok: false, rpc });
		}
	});
});
