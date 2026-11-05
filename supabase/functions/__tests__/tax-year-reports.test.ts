/**
 * The year-end and tax-documents PDFs hold what their pages show.
 *
 * WHAT WENT WRONG. "Download PDF" on `/reports/year-end` and
 * `/reports/tax-documents` asked generate-pdf (Mode 1) for `year-end` and
 * `financial`, which printed `get_financial_overview` flattened into two
 * `metric | value` rows (`overview` and `highlights` as JSON text): none of the
 * figures either page shows. export-report's `year-end` type had the same
 * defect. (A `1099` type, the year-end page's 1099-NEC section, went in
 * 66.2-39 with the section: TenantFlow does not determine which vendors need
 * a 1099.)
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Each page's figures come from query
 * functions in `src/hooks/api/query-keys/`: `reportAnalyticsQueries.yearEnd`
 * (the year-end page) and `financialTaxQueries.taxDocuments`
 * (the tax-documents page). The exports build their tables with
 * `_shared/tax-year-reports`. Both run here against the SAME recorded RPC
 * answers, and every assertion compares one side to the other, never to a
 * hand-copied literal:
 *   1. the RPC calls (name and arguments, so the year) are identical;
 *   2. every figure the page renders is a table row, in the page's order;
 *   3. an RPC shape that makes the page fail makes the export fail;
 *   4. an RPC error fails the export load, naming the RPC;
 *   5. every amount is rounded as the pages print it (`formatCurrency`), and
 *      each column carries the format the PDF and XLSX print it in.
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
import { formatCurrency } from "#lib/utils/currency";
import type { TaxDocumentsData } from "#types/financial-statements";
import type { YearEndSummary } from "#types/reports";
import type {
	ReportCell,
	RpcCall,
} from "../_shared/financial-analytics-report";
import {
	buildTaxYearReport,
	loadTaxYearSources,
	TAX_DOCUMENTS_FORMATS,
	TAX_DOCUMENTS_HEADER,
	TAX_DOCUMENTS_REPORT_TYPE,
	TAX_YEAR_REPORT_TYPES,
	taxYearReportCalls,
	YEAR_END_FORMATS,
	YEAR_END_HEADER,
	YEAR_END_REPORT_TYPE,
} from "../_shared/tax-year-reports";

const { mockRpc, mockDeletedProperties, USER_ID } = vi.hoisted(() => ({
	mockRpc: vi.fn(),
	/** The page's read of the owner's deleted property ids: (filters) => rows. */
	mockDeletedProperties: vi.fn(),
	USER_ID: "owner-1",
}));

vi.mock("#lib/supabase/client", async () => {
	const { pagedRpc } = await import("#test/mocks/paged-rpc");
	/** `.from("properties").select().eq().eq().order().range()`, recorded. */
	const from = (table: string) => {
		const filters: Record<string, unknown> = { table };
		const chain = {
			select: (columns: string) => {
				filters["select"] = columns;
				return chain;
			},
			eq: (column: string, value: unknown) => {
				filters[column] = value;
				return chain;
			},
			order: () => chain,
			range: () => Promise.resolve(mockDeletedProperties(filters)),
		};
		return chain;
	};
	return { createClient: () => ({ rpc: pagedRpc(mockRpc), from }) };
});
vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: USER_ID }),
}));

import { financialTaxQueries } from "#hooks/api/query-keys/expense-keys";
import { reportAnalyticsQueries } from "#hooks/api/query-keys/report-analytics-keys";

const YEAR = 2024;

type RpcAnswers = Record<string, { data: unknown; error: unknown }>;

/** The owner's deleted property ids both sides read (key `properties`). */
const DELETED_READ = "properties";

function richAnswers(): RpcAnswers {
	return {
		[DELETED_READ]: { data: [], error: null },
		// The rent ledger as of December 31 of the year and of the year before
		// (keyed name@end_date_param): 61,200.25 received in 2024.
		"get_billing_insights@2024-12-31": {
			data: { collectedTotal: 74450.25, unpaidTotal: 300, chargedTotal: 74750.25 },
			error: null,
		},
		"get_billing_insights@2023-12-31": {
			data: { collectedTotal: 13250, unpaidTotal: 0, chargedTotal: 13250 },
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
					timeframe: "2024-01-01/2024-12-31",
				},
				{
					property_id: "p2",
					property_name: "Elm & Oak",
					total_revenue: 25200.25,
					total_expenses: 2120,
					net_income: 23080.25,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		},
	};
}

/** Answer by name and as-of date first (name@end_date_param), then by name. */
function answer(answers: RpcAnswers) {
	return (name: string, args?: Readonly<Record<string, unknown>>) => {
		const result =
			(args?.["end_date_param"] !== undefined
				? answers[`${name}@${String(args["end_date_param"])}`]
				: undefined) ?? answers[name];
		if (!result) throw new Error(`unexpected rpc ${name}`);
		return Promise.resolve(result);
	};
}

function queryClient(): QueryClient {
	return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

interface Screen {
	yearEnd: YearEndSummary;
	taxDocuments: TaxDocumentsData;
	calls: Record<"yearEnd" | "taxDocuments", RpcCall[]>;
}

/** What the pages render: their query functions, run against `answers`. */
async function screen(answers: RpcAnswers): Promise<Screen> {
	const calls: Screen["calls"] = {
		yearEnd: [],
		taxDocuments: [],
	};
	let sink: RpcCall[] = [];
	mockRpc.mockImplementation(
		(name: string, args: Readonly<Record<string, string | number>>) => {
			sink.push({ name, args });
			return answer(answers)(name, args);
		},
	);
	mockDeletedProperties.mockImplementation((filters: Record<string, unknown>) => {
		const { table: _table, select: _select, ...args } = filters;
		sink.push({
			name: DELETED_READ,
			args: args as Readonly<Record<string, string | number>>,
		});
		return answers[DELETED_READ];
	});
	sink = calls.yearEnd;
	const yearEndResult = await queryClient().query(
		reportAnalyticsQueries.yearEnd(YEAR),
	);
	if (yearEndResult.status !== "ready") {
		throw new Error("the year-end page shows its unavailable state");
	}
	const yearEnd = yearEndResult.summary;
	sink = calls.taxDocuments;
	const taxResult = await queryClient().query(
		financialTaxQueries.taxDocuments(YEAR),
	);
	if (taxResult.status !== "ready") {
		throw new Error("the tax documents page shows its unavailable state");
	}
	const taxDocuments = taxResult.documents;
	return { yearEnd, taxDocuments, calls };
}

/** What an export loads and writes for one report type, against `answers`. */
async function exported(
	reportType: string,
	answers: RpcAnswers,
): Promise<{
	rows: readonly (readonly ReportCell[])[];
	formats: readonly (readonly string[])[];
	calls: RpcCall[];
	title: string;
	header: readonly string[];
}> {
	const calls: RpcCall[] = [];
	const load = await loadTaxYearSources(
		(name, args) => {
			calls.push({ name, args });
			return answer(answers)(name, args);
		},
		reportType,
		USER_ID,
		YEAR,
		// As export-report and generate-pdf read it: scoped by the owner id.
		() => {
			calls.push({
				name: DELETED_READ,
				args: { owner_user_id: USER_ID, status: "inactive" },
			});
			const result = answers[DELETED_READ];
			if (!result) throw new Error("no deleted-property answer");
			return Promise.resolve(result);
		},
	);
	if (!load.ok) throw new Error(`load failed on ${load.rpc}`);
	const report = buildTaxYearReport(reportType, load.sources, YEAR);
	return {
		rows: report.table.rows,
		formats: report.table.formats,
		calls,
		title: report.title,
		header: report.table.header,
	};
}

/** An amount as the pages print it (`formatCurrency`), back as a number. */
const cents = (value: number) =>
	Number(formatCurrency(value).replace(/[$,]/g, ""));
const distinct = (calls: readonly RpcCall[]) =>
	[...new Set(calls.map((c) => JSON.stringify(c)))].sort();

/** The year-end page's figures as rows, top to bottom. */
function expectedYearEndRows(page: Screen): ReportCell[][] {
	const s = page.yearEnd;
	return [
		["Summary", "Rent Received", cents(s.rentReceived), null, null, null],
		[
			"Summary",
			"Operating Expenses",
			cents(s.operatingExpenses),
			null,
			null,
			null,
		],
		["Summary", "Net Income", cents(s.netIncome), null, null, null],
		...s.byProperty.map((p): ReportCell[] => [
			"By Property",
			p.propertyName,
			null,
			cents(p.rentReceived),
			cents(p.expenses),
			cents(p.netIncome),
		]),
		...sortExpenseCategoriesDesc(s.expenseByCategory).map((c): ReportCell[] => [
			"Expenses by Vendor",
			c.category,
			cents(c.amount),
			null,
			null,
			null,
		]),
	];
}

/** The tax-documents page's figures as rows, top to bottom. */
function expectedTaxRows(data: TaxDocumentsData): ReportCell[][] {
	return [
		["Summary", "Rent Received", cents(data.totals.totalIncome), null],
		["Summary", "Operating Expenses", cents(data.totals.totalExpenses), null],
		["Summary", "Net Income", cents(data.totals.netIncome), null],
		...data.expenseCategories.map((c): ReportCell[] => [
			"Expenses by Vendor",
			c.category,
			cents(c.amount),
			Number(c.percentage.toFixed(1)),
		]),
		[
			"Note",
			"TenantFlow doesn't decide which expenses are deductible; review them with your tax preparer.",
			null,
			null,
		],
	];
}

describe("tax-year reports hold their pages' figures", () => {
	beforeEach(() => {
		mockRpc.mockReset();
	});

	it("year-end", async () => {
		const page = await screen(richAnswers());
		const file = await exported(YEAR_END_REPORT_TYPE, richAnswers());
		expect(distinct(file.calls)).toEqual(distinct(page.calls.yearEnd));
		expect(file.rows).toEqual(expectedYearEndRows(page));
		expect(file.title).toContain(String(YEAR));
		// No row names a vendor as needing a 1099, and no column carries jobs
		// or a filing status.
		expect(file.header).toEqual([
			"Section",
			"Item",
			"Amount",
			"Rent Received",
			"Expenses",
			"Net Income",
		]);
		expect(JSON.stringify(file.rows)).not.toMatch(/1099|threshold/i);
	});

	it("builds no 1099 report", async () => {
		expect(TAX_YEAR_REPORT_TYPES).not.toContain("1099");
		await expect(exported("1099", richAnswers())).rejects.toMatchObject({
			message: expect.stringContaining("load failed on"),
		});
	});

	it("tax documents", async () => {
		const page = await screen(richAnswers());
		const file = await exported(TAX_DOCUMENTS_REPORT_TYPE, richAnswers());
		expect(distinct(file.calls)).toEqual(distinct(page.calls.taxDocuments));
		expect(file.rows).toEqual(expectedTaxRows(page.taxDocuments));
		// No row claims a deduction, taxable income or Schedule E category.
		expect(
			file.rows.flatMap((r) => [r[0], r[1]]).join(" "),
		).not.toMatch(/deductible expenses|deduction|taxable|schedule e/i);
		// Shares print as the page's toFixed(1): 0.15 is "0.1", not Math.round's 0.2.
		expect(file.rows.map((r) => r[3])).toContain(0.1);
	});

	it("rounds an amount as formatCurrency does", async () => {
		// 9000.505 and -199.995: Math.round wrote 9000.5 and -199.99 where the
		// pages print $9,000.51 and -$200.00.
		const answers = richAnswers();
		answers.get_property_performance_analytics = {
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					total_revenue: 9000.505,
					total_expenses: 9200.5,
					net_income: -199.995,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		};
		const page = await screen(answers);
		const file = await exported(YEAR_END_REPORT_TYPE, answers);
		expect(file.rows).toEqual(expectedYearEndRows(page));
		const maple = file.rows.find((r) => r[1] === "Maple Court");
		expect([maple?.[3], maple?.[5]]).toEqual([9000.51, -200]);
	});

	it("gives each column one format: amounts money, shares a percentage", async () => {
		expect(YEAR_END_FORMATS).toHaveLength(YEAR_END_HEADER.length);
		expect(TAX_DOCUMENTS_FORMATS).toHaveLength(TAX_DOCUMENTS_HEADER.length);
		const byColumn = (header: readonly string[], formats: readonly string[]) =>
			Object.fromEntries(header.map((h, i) => [h, formats[i]]));
		expect(byColumn(YEAR_END_HEADER, YEAR_END_FORMATS)).toEqual({
			Section: "plain",
			Item: "plain",
			Amount: "money",
			"Rent Received": "money",
			Expenses: "money",
			"Net Income": "money",
		});
		expect(byColumn(TAX_DOCUMENTS_HEADER, TAX_DOCUMENTS_FORMATS)).toEqual({
			Section: "plain",
			Item: "plain",
			Amount: "money",
			"Share of Expenses (%)": "percent",
		});
		for (const type of TAX_YEAR_REPORT_TYPES) {
			const file = await exported(type, richAnswers());
			const columns =
				type === TAX_DOCUMENTS_REPORT_TYPE
					? TAX_DOCUMENTS_FORMATS
					: YEAR_END_FORMATS;
			expect(file.formats, type).toEqual(file.rows.map(() => columns));
		}
	});

	it("reads the year asked for", () => {
		for (const type of [YEAR_END_REPORT_TYPE, TAX_DOCUMENTS_REPORT_TYPE]) {
			const expense = taxYearReportCalls(type, USER_ID, 2019).find(
				(c) => c.name === "get_expense_summary",
			);
			expect(expense?.args, type).toEqual({
				p_user_id: USER_ID,
				p_start_date: "2019-01-01",
				p_end_date: "2019-12-31",
			});
		}
		// The calendar year, not the function's trailing 30 days, and the
		// ledger as of the year's end and the year before's.
		expect(taxYearReportCalls(YEAR_END_REPORT_TYPE, USER_ID, 2019)).toEqual([
			{
				name: "get_billing_insights",
				args: { owner_id_param: USER_ID, end_date_param: "2019-12-31" },
			},
			{
				name: "get_billing_insights",
				args: { owner_id_param: USER_ID, end_date_param: "2018-12-31" },
			},
			{
				name: "get_expense_summary",
				args: {
					p_user_id: USER_ID,
					p_start_date: "2019-01-01",
					p_end_date: "2019-12-31",
				},
			},
			{
				name: "get_property_performance_analytics",
				args: { p_user_id: USER_ID, p_timeframe: "2019-01-01..2019-12-31" },
			},
		]);
		for (const type of TAX_YEAR_REPORT_TYPES) {
			expect(
				taxYearReportCalls(type, USER_ID, 2019).map((c) => c.name),
				type,
			).not.toContain("get_dashboard_stats");
		}
	});

	it("presents rent received, never scheduled rent, as the year's income", async () => {
		const page = await screen(richAnswers());
		// 74,450.25 - 13,250 received in 2024.
		expect(page.yearEnd.rentReceived).toBe(61200.25);
		expect(page.taxDocuments.totals.totalIncome).toBe(61200.25);
		const file = await exported(YEAR_END_REPORT_TYPE, richAnswers());
		expect(file.rows[0]).toEqual([
			"Summary",
			"Rent Received",
			61200.25,
			null,
			null,
			null,
		]);
		expect(file.header).toContain("Rent Received");
	});

	it("shows unavailable, and writes no file, without the ledger's totals", async () => {
		// get_billing_insights' body before 20261102055449.
		const answers = richAnswers();
		const before = { data: { unpaidTotal: 0, mrr: 5100 }, error: null };
		answers["get_billing_insights@2024-12-31"] = before;
		answers["get_billing_insights@2023-12-31"] = before;
		await expect(screen(answers)).rejects.toMatchObject({
			message: expect.stringContaining("unavailable state"),
		});
		for (const type of [YEAR_END_REPORT_TYPE, TAX_DOCUMENTS_REPORT_TYPE]) {
			await expect(exported(type, answers), type).rejects.toMatchObject({
				message: expect.stringContaining("rent ledger totals unavailable"),
			});
		}
	});

	it("shows unavailable, and writes no file, from the property body before 20261102163709", async () => {
		const answers = richAnswers();
		answers.get_property_performance_analytics = {
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					total_revenue: 0,
					total_expenses: 106,
					net_income: -106,
					timeframe: "2024-01-01..2024-12-31",
				},
			],
			error: null,
		};
		await expect(screen(answers)).rejects.toMatchObject({
			message: expect.stringContaining("year-end page shows its unavailable"),
		});
		await expect(
			exported(YEAR_END_REPORT_TYPE, answers),
		).rejects.toMatchObject({
			message: expect.stringContaining("property rent received unavailable"),
		});
	});

	it('names the expenses with no vendor once, never as the vendor "Other"', async () => {
		// get_expense_summary puts an expense with no vendor under a NULL
		// category (20261102184502); "Other" is a vendor the owner named so.
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
		const page = await screen(answers);
		expect(page.yearEnd.expenseByCategory.map((c) => c.category)).toEqual([
			"Other",
			"No vendor recorded",
		]);
		expect(page.taxDocuments.expenseCategories.map((c) => c.category)).toEqual(
			["Other", "No vendor recorded"],
		);
		for (const type of [YEAR_END_REPORT_TYPE, TAX_DOCUMENTS_REPORT_TYPE]) {
			const file = await exported(type, answers);
			const items = file.rows.map((r) => r[1]);
			expect(items, type).toContain("No vendor recorded");
			expect(items, type).toContain("Other");
			expect(items, type).not.toContain("");
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
		await expect(
			exported(TAX_DOCUMENTS_REPORT_TYPE, bad),
		).rejects.toMatchObject({
			message: expect.stringContaining("expense categories"),
		});
	});

	it("an RPC error fails the load, naming the RPC", async () => {
		for (const [rpc, key] of [
			["get_billing_insights", "get_billing_insights@2024-12-31"],
			["get_billing_insights", "get_billing_insights@2023-12-31"],
			["get_expense_summary", "get_expense_summary"],
			[
				"get_property_performance_analytics",
				"get_property_performance_analytics",
			],
		] as const) {
			const answers = richAnswers();
			answers[key] = { data: null, error: { message: "denied" } };
			const load = await loadTaxYearSources(
				(name, args) => answer(answers)(name, args),
				YEAR_END_REPORT_TYPE,
				USER_ID,
				YEAR,
				() => Promise.resolve({ data: [], error: null }),
			);
			expect(load).toMatchObject({ ok: false, rpc });
		}
	});

	it("a failed deleted-property read fails the year-end load, naming it", async () => {
		const load = await loadTaxYearSources(
			(name, args) => answer(richAnswers())(name, args),
			YEAR_END_REPORT_TYPE,
			USER_ID,
			YEAR,
			() => Promise.resolve({ data: null, error: { message: "denied" } }),
		);
		expect(load).toMatchObject({ ok: false, rpc: DELETED_READ });
	});

	it("the tax documents report reads no deleted property", async () => {
		const read = vi.fn();
		const load = await loadTaxYearSources(
			(name, args) => answer(richAnswers())(name, args),
			TAX_DOCUMENTS_REPORT_TYPE,
			USER_ID,
			YEAR,
			read,
		);
		expect(load.ok).toBe(true);
		expect(read).not.toHaveBeenCalled();
	});
});

describe("a property the owner deleted after the year", () => {
	/**
	 * Gamma Flats received 333.00 in the year and was deleted since: the
	 * function lists it for the year (20261102163709), so the summary's rent
	 * received (61,533.25) and expenses equal the table's to the cent.
	 */
	function withDeleted(): RpcAnswers {
		const answers = richAnswers();
		answers["get_billing_insights@2024-12-31"] = {
			data: { collectedTotal: 74783.25, unpaidTotal: 300, chargedTotal: 75083.25 },
			error: null,
		};
		answers.get_expense_summary = {
			data: {
				categories: [{ category: "Acme Plumbing", amount: 11132.5, percentage: 100 }],
				monthly_totals: [],
				total_amount: 11132.5,
			},
			error: null,
		};
		const rows = answers.get_property_performance_analytics?.data;
		answers.get_property_performance_analytics = {
			data: [
				...(Array.isArray(rows) ? rows : []),
				{
					property_id: "p3",
					property_name: "Gamma Flats",
					total_revenue: 333,
					total_expenses: 12,
					net_income: 321,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		};
		answers[DELETED_READ] = { data: [{ id: "p3" }], error: null };
		return answers;
	}

	it("is named as deleted on the page and in the file, which tie to the cent", async () => {
		const page = await screen(withDeleted());
		const file = await exported(YEAR_END_REPORT_TYPE, withDeleted());
		expect(distinct(file.calls)).toEqual(distinct(page.calls.yearEnd));
		expect(file.rows).toEqual(expectedYearEndRows(page));
		expect(page.yearEnd.byProperty.map((p) => p.propertyName)).toEqual([
			"Maple Court",
			"Elm & Oak",
			"Gamma Flats (deleted)",
		]);
		const sum = (pick: (p: YearEndSummary["byProperty"][number]) => number) =>
			Math.round(
				page.yearEnd.byProperty.reduce((total, p) => total + pick(p), 0) * 100,
			);
		expect(Math.round(page.yearEnd.rentReceived * 100)).toBe(6_153_325);
		expect(sum((p) => p.rentReceived)).toBe(6_153_325);
		expect(sum((p) => p.expenses)).toBe(
			Math.round(page.yearEnd.operatingExpenses * 100),
		);
		const fileSum = (column: number) =>
			Math.round(
				file.rows
					.filter((r) => r[0] === "By Property")
					.reduce((total, r) => total + Number(r[column]), 0) * 100,
			);
		const summary = (item: string) =>
			Math.round(
				Number(file.rows.find((r) => r[0] === "Summary" && r[1] === item)?.[2]) *
					100,
			);
		expect(fileSum(3)).toBe(summary("Rent Received"));
		expect(fileSum(4)).toBe(summary("Operating Expenses"));
		expect(file.rows.map((r) => r[1])).toContain("Gamma Flats (deleted)");
	});

	it("is not named as deleted when the owner still has it", async () => {
		const answers = withDeleted();
		answers[DELETED_READ] = { data: [], error: null };
		const file = await exported(YEAR_END_REPORT_TYPE, answers);
		expect(file.rows.map((r) => r[1])).toContain("Gamma Flats");
		expect(file.rows.map((r) => r[1])).not.toContain("Gamma Flats (deleted)");
	});
});

describe("the year-end export's By Property table", () => {
	it("holds every property past one page, as the page reads them", async () => {
		const answers = richAnswers();
		const rows = Array.from({ length: 1005 }, (_, at) => ({
			property_id: `p${String(at).padStart(4, "0")}`,
			property_name: `Lot ${String(at).padStart(4, "0")}`,
			occupancy_rate: 0,
			total_revenue: 0,
			total_expenses: 0,
			net_income: 0,
			timeframe: `${YEAR}-01-01/${YEAR}-12-31`,
		}));
		const pages: Array<{ from: number; to: number; order: readonly string[] }> =
			[];
		const load = await loadTaxYearSources(
			(name, args, page) => {
				if (name !== "get_property_performance_analytics") {
					return answer(answers)(name, args);
				}
				if (!page) return Promise.resolve({ data: rows.slice(0, 100), error: null });
				pages.push(page);
				// A server that caps a request at 1000 rows.
				return Promise.resolve({
					data: rows.slice(page.from, Math.min(page.to + 1, page.from + 1000)),
					error: null,
				});
			},
			YEAR_END_REPORT_TYPE,
			USER_ID,
			YEAR,
			() => Promise.resolve({ data: [], error: null }),
		);
		if (!load.ok) throw new Error(`load failed on ${load.rpc}`);
		const report = buildTaxYearReport(YEAR_END_REPORT_TYPE, load.sources, YEAR);
		const byProperty = report.table.rows.filter((r) => r[0] === "By Property");
		expect(byProperty).toHaveLength(1005);
		expect(byProperty.at(-1)?.[1]).toBe("Lot 1004");
		expect(pages).toEqual([
			{ from: 0, to: 999, order: ["property_name", "property_id"] },
			{ from: 1000, to: 1999, order: ["property_name", "property_id"] },
		]);
	});
});
