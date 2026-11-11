// In-process tests for the export-report Edge Function: a hand-rolled fake
// SupabaseClient and a stubbed generate-pdf fetch; no network, no
// `functions serve`, no deploy (mirrors lease-signature-metering-test.ts).
//
// What it pins:
//   - the function reads the query string and ignores a request body;
//   - financial-analytics writes the leaf's table (the page's figures) as CSV,
//     as a real .xlsx (parsed back here with the same SheetJS build: sheet,
//     cells, cell types, a leading `=` kept as text) and as PDF through the
//     generate-pdf delegate, with a month's scheduled rent and a lease's rent
//     received in columns of their own in every format;
//   - the paywall: a free-tier owner gets the 402 with upgrade_url and no RPC
//     runs, and a past-due Growth owner the 402 with Billing Settings;
//   - every RPC error is a 500 and never a file;
//   - type, format and year are validated: a type the function does not build
//     (the deleted maintenance and revenue row dumps, the removed 1099-NEC
//     report, income-statement, cash-flow, none) is a 400 before the gate and
//     any RPC;
//   - year-end and financial (the tax-documents page) write the leaf's
//     table of their page's figures for the year asked for, in every format
//     (`_shared/tax-year-reports.ts`; the Vitest `__tests__/tax-year-reports
//     .test.ts` proves those rows equal the pages');
//   - the PDF prints money as the pages do ($61,200.00, right-aligned), never
//     a bare number, and every XLSX money cell is a number with a currency
//     number format, read back here ("$61,200.00" as Excel shows it).
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/export-report-test.ts

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabaseClient } from "./fake-supabase-client.ts";
// @deno-types="../_shared/vendor/xlsx-0.20.3.d.ts"
import * as XLSX from "../_shared/vendor/xlsx-0.20.3.mjs";
import {
	buildFinancialAnalyticsTable,
	FINANCIAL_ANALYTICS_HEADER,
	type FinancialAnalyticsTable,
} from "../_shared/financial-analytics-report.ts";
import { tableToCsv } from "../_shared/report-csv.ts";
import { XLSX_MONEY_FORMAT } from "../_shared/report-format.ts";
import { sectionedReportHtml } from "../_shared/report-html.ts";
import { XLSX_MIME_TYPE } from "../_shared/report-xlsx.ts";
import {
	buildTaxYearReport,
	expenseVendorLabel,
	propertyReportName,
	TAX_DOCUMENTS_REPORT_TYPE,
	taxYearReportCalls,
	YEAR_END_REPORT_TYPE,
} from "../_shared/tax-year-reports.ts";

Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");

const { handleRequest } = await import("../export-report/index.ts");

const OWNER_ID = "owner-1";
const NOW = new Date("2026-11-01T18:30:00Z");
const TODAY = "2026-11-01";

type RpcAnswers = Record<string, { data: unknown; error: unknown }>;

function answers(): RpcAnswers {
	return {
		get_financial_overview: {
			data: {
				overview: {
					total_revenue: 61200,
					total_expenses: 18350.75,
					net_income: 42849.25,
				},
				// 20261110123124: each lease's rent received less its expenses.
				lease_profitability: {
					window: "2026-01-01/2026-11-01",
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
					],
				},
			},
			error: null,
		},
		get_revenue_trends_optimized: {
			data: [
				{ month: "2026-10", revenue: 5100, collections: 0.1, outstanding: 0 },
				{ month: "2026-09", revenue: 5000, collections: 0.2, outstanding: 0 },
			],
			error: null,
		},
		get_expense_summary: {
			data: {
				categories: [
					{ category: "=HYPERLINK(1)", amount: 120, percentage: 1 },
					{ category: "Roof, Gutter & Co", amount: 2000.5, percentage: 99 },
				],
				monthly_totals: [{ month: "2026-10", amount: 2120.5 }],
			},
			error: null,
		},
		get_billing_insights: {
			data: { unpaidTotal: 1185.5, unpaidCount: 4, lateFeeTotal: 115, tenantCount: 3 },
			error: null,
		},
		// The rent ledger as of December 31, 2024 and 2023 (get_billing_insights
		// with end_date_param, 20261110123114): 61,200 received in 2024.
		"get_billing_insights@2024-12-31": {
			data: { collectedTotal: 73400, unpaidTotal: 0, chargedTotal: 73400 },
			error: null,
		},
		"get_billing_insights@2023-12-31": {
			data: { collectedTotal: 12200, unpaidTotal: 0, chargedTotal: 12200 },
			error: null,
		},
		get_property_performance_analytics: {
			data: [
				{
					property_id: "p1",
					property_name: "Maple Court",
					total_revenue: 61200,
					total_expenses: 2120.5,
					net_income: 59079.5,
					timeframe: "2024-01-01/2024-12-31",
				},
			],
			error: null,
		},
	};
}

interface Scenario {
	plan: string;
	status: string;
	rpc: RpcAnswers;
	authenticated: boolean;
	/** The owner's deleted property ids the year-end report reads. */
	deleted: { id: string }[];
}

function scenario(overrides: Partial<Scenario> = {}): Scenario {
	return {
		plan: "growth",
		status: "active",
		rpc: answers(),
		authenticated: true,
		deleted: [],
		...overrides,
	};
}

interface Calls {
	rpcs: Array<{ name: string; args: Record<string, unknown> }>;
	gateEvents: number;
	/** Each read of `properties`: its .eq() filters, in order. */
	propertyReads: Array<Array<[string, unknown]>>;
}

function makeClient(s: Scenario): { client: SupabaseClient; calls: Calls } {
	const calls: Calls = { rpcs: [], gateEvents: 0, propertyReads: [] };
	const builder = (table: string) => {
		const filters: Array<[string, unknown]> = [];
		const b: Record<string, unknown> = {
			select: () => b,
			eq: (column: string, value: unknown) => {
				filters.push([column, value]);
				return b;
			},
			order: () => b,
			// The year-end report's read of the owner's deleted property ids.
			range: async () => {
				if (table !== "properties") return { data: null, error: null };
				calls.propertyReads.push(filters);
				return { data: s.deleted, error: null };
			},
			single: async () =>
				table === "users"
					? {
							data: {
								subscription_status: s.status,
								subscription_plan: s.plan,
							},
							error: null,
						}
					: { data: null, error: null },
			insert: () => {
				if (table === "gate_events") calls.gateEvents++;
				return b;
			},
			then: (resolve: (v: { data: null; error: null }) => void) =>
				resolve({ data: null, error: null }),
		};
		return b;
	};
	const client = fakeSupabaseClient({
		auth: {
			getUser: async (_token: string) =>
				s.authenticated
					? { data: { user: { id: OWNER_ID } }, error: null }
					: { data: { user: null }, error: { message: "bad jwt" } },
		},
		from: (table: string) => builder(table),
		rpc: (name: string, args: Record<string, unknown>) => {
			calls.rpcs.push({ name, args });
			// An answer keyed by the as-of date first (the tax-year reports read
			// the ledger as of two), then by name. Awaitable, and after
			// .order()/.range() as well: the year-end reports page through the
			// property rows, and a fixture of fewer than a page is read in one.
			const answer = Promise.resolve(
				s.rpc[`${name}@${String(args?.end_date_param)}`] ??
					s.rpc[name] ?? { data: null, error: { message: `no ${name}` } },
			);
			const query = Object.assign(answer, {
				order: () => query,
				range: () => answer,
			});
			return query;
		},
	});
	return { client, calls };
}

interface PdfPost {
	url: string;
	authorization: string | null;
	body: { html: string; filename: string };
}

/** Stub the generate-pdf delegate; record every POST. */
async function withPdfStub(
	ok: boolean,
	fn: (posts: PdfPost[]) => Promise<void>,
): Promise<void> {
	const prev = globalThis.fetch;
	const posts: PdfPost[] = [];
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;
		const headers = new Headers(init?.headers);
		posts.push({
			url,
			authorization: headers.get("Authorization"),
			body: JSON.parse(String(init?.body)),
		});
		return ok
			? new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 })
			: new Response("stirling down", { status: 503 });
	}) as typeof fetch;
	try {
		await fn(posts);
	} finally {
		globalThis.fetch = prev;
	}
}

function get(query: string, init: RequestInit = {}): Request {
	return new Request(
		`https://supabase.test/functions/v1/export-report${query}`,
		{
			method: "GET",
			...init,
			headers: {
				Authorization: "Bearer user-jwt",
				Origin: "https://app.tenantflow.app",
				...(init.headers ?? {}),
			},
		},
	);
}

async function run(req: Request, s: Scenario) {
	const { client, calls } = makeClient(s);
	const res = await handleRequest(req, {
		createClient: () => client,
		now: () => NOW,
	});
	return { res, calls };
}

/** The table the leaf builds from the scenario's answers. */
function expectedTable(s: Scenario) {
	return buildFinancialAnalyticsTable({
		overview: s.rpc.get_financial_overview?.data,
		revenueTrends: s.rpc.get_revenue_trends_optimized?.data,
		expenseSummary: s.rpc.get_expense_summary?.data,
		billingInsights: s.rpc.get_billing_insights?.data,
	}, propertyReportName, expenseVendorLabel);
}

const FA = "?type=financial-analytics";

/** An amount as the pages print it (en-US dollars, two decimals). */
const dollars = (value: number) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		value,
	);

/** Every money cell of `table` is printed as dollars, right-aligned. */
function assertPrintsMoney(html: string, table: FinancialAnalyticsTable): void {
	let money = 0;
	for (const [r, row] of table.rows.entries()) {
		for (const [c, value] of row.entries()) {
			if (typeof value !== "number" || table.formats[r]?.[c] !== "money") {
				continue;
			}
			money++;
			assertStringIncludes(html, `<td class="td num">${dollars(value)}</td>`);
		}
	}
	assert(money > 0, "the table has money cells");
}

/**
 * The workbook holds the table cell for cell: the raw numbers, a money cell
 * with the currency format (Excel shows it as the pages print it), any other
 * number in General, text as text, no formula anywhere.
 */
function assertXlsxIsTable(
	bytes: Uint8Array,
	sheetName: string,
	table: FinancialAnalyticsTable,
): void {
	const workbook = XLSX.read(bytes, { type: "array", cellNF: true });
	assertEquals(workbook.SheetNames, [sheetName]);
	const sheet = workbook.Sheets[sheetName];
	assert(sheet, "the sheet exists");
	assertEquals(
		XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null }),
		[[...table.header], ...table.rows.map((row) => [...row])],
	);
	let money = 0;
	for (const [r, row] of table.rows.entries()) {
		for (const [c, value] of row.entries()) {
			const cell = sheet[XLSX.utils.encode_cell({ r: r + 1, c })] as
				| XLSX.CellObject
				| undefined;
			if (value === null) {
				assertEquals(cell, undefined);
				continue;
			}
			assert(cell, `cell ${r + 1},${c}`);
			assertEquals(cell.f, undefined);
			if (typeof value === "number") {
				assertEquals(cell.t, "n");
				if (table.formats[r]?.[c] === "money") {
					money++;
					assertEquals(cell.z, XLSX_MONEY_FORMAT);
					assertEquals(cell.w, dollars(value));
				} else {
					assertEquals(cell.z, "General");
				}
			} else {
				assertEquals(cell.t, "s");
			}
		}
	}
	assert(money > 0, "the table has money cells");
}

Deno.test("financial-analytics csv is the leaf's table, from the four page RPCs", async () => {
	const s = scenario();
	const { res, calls } = await run(get(`${FA}&format=csv`), s);
	assertEquals(res.status, 200);
	const table = expectedTable(s);
	const body = await res.text();
	assertEquals(body, tableToCsv(table.header, table.rows));
	assertEquals(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
	assertEquals(
		res.headers.get("Content-Disposition"),
		`attachment; filename="financial-analytics-${TODAY}.csv"`,
	);
	const lines = body.split("\n");
	assertEquals(lines[0], FINANCIAL_ANALYTICS_HEADER.join(","));
	// Scheduled rent and rent received in columns of their own, so summing one
	// never adds scheduled rent to cash.
	assertEquals(
		lines[0],
		"Section,Item,Value,Scheduled Rent,Rent Received,Expenses,Scheduled Net,Net",
	);
	assert(
		lines.includes("Overview,Collected,0.3,,,,,"),
		"collected rounds to cents",
	);
	assert(
		lines.includes("Scheduled Rent & Expenses,2026-10,,5100,,2120.5,2979.5,"),
		"a month's scheduled rent and scheduled net, in the scheduled columns",
	);
	assert(lines.includes("Expenses by Vendor,'=HYPERLINK(1),120,,,,,"));
	assert(lines.includes('Expenses by Vendor,"Roof, Gutter & Co",2000.5,,,,,'));
	assert(lines.includes("Lease Profitability,Period,2026-01-01 to 2026-11-01,,,,,"));
	assert(
		lines.includes("Lease Profitability,South House (deleted) \u00b7 S1 (Ed South),,,5000,0,,5000"),
		"a lease on a deleted property, named so, its rent received in Rent Received",
	);
	assertEquals(calls.rpcs.map((c) => c.name).sort(), [
		"get_billing_insights",
		"get_expense_summary",
		"get_financial_overview",
		"get_revenue_trends_optimized",
	]);
	assertEquals(
		calls.rpcs.find((c) => c.name === "get_financial_overview")?.args,
		{ p_user_id: OWNER_ID },
	);
});

Deno.test("financial-analytics xlsx is a real workbook with typed cells", async () => {
	const s = scenario();
	const { res } = await run(get(`${FA}&format=xlsx`), s);
	assertEquals(res.status, 200);
	const bytes = new Uint8Array(await res.arrayBuffer());
	// An .xlsx is a zip: the local file header magic "PK\x03\x04".
	assertEquals([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
	assertEquals(res.headers.get("Content-Type"), XLSX_MIME_TYPE);
	assertEquals(
		res.headers.get("Content-Disposition"),
		`attachment; filename="financial-analytics-${TODAY}.xlsx"`,
	);

	const workbook = XLSX.read(bytes, { type: "array", cellNF: true });
	const sheet = workbook.Sheets["Financial Analytics"];
	assert(sheet, "the sheet exists");
	assertEquals(sheet.A1?.t, "s");
	assertEquals(sheet.A1?.v, "Section");
	// Scheduled rent and rent received head columns of their own.
	assertEquals(
		["D1", "E1", "F1", "G1", "H1"].map((address) => sheet[address]?.v),
		["Scheduled Rent", "Rent Received", "Expenses", "Scheduled Net", "Net"],
	);
	// Scheduled: a number Excel shows in dollars.
	assertEquals(sheet.B2?.v, "Scheduled");
	assertEquals(sheet.C2?.t, "n");
	assertEquals(sheet.C2?.v, 61200);
	assertEquals(sheet.C2?.w, "$61,200.00");
	// Scheduled Margin (row 5) is a percentage and Tenants monitored (row 9) a
	// count: numbers in General.
	assertEquals(sheet.B5?.v, "Scheduled Margin (%)");
	assertEquals(sheet.C5?.z, "General");
	assertEquals(sheet.B9?.v, "Tenants monitored");
	assertEquals(sheet.C9?.w, "3");
	const formulaText = Object.entries(sheet).find(
		([address, cell]) =>
			!address.startsWith("!") &&
			(cell as XLSX.CellObject).v === "=HYPERLINK(1)",
	);
	assert(formulaText, "the formula-like category is in the sheet");
	const cell = formulaText[1] as XLSX.CellObject;
	assertEquals(cell.t, "s");
	assertEquals(cell.f, undefined);

	assertXlsxIsTable(bytes, "Financial Analytics", expectedTable(s));
});

Deno.test("financial-analytics pdf posts the sectioned HTML to generate-pdf", async () => {
	await withPdfStub(true, async (posts) => {
		const { res } = await run(get(`${FA}&format=pdf`), scenario());
		assertEquals(res.status, 200);
		assertEquals(posts.length, 1);
		const post = posts[0];
		assert(post);
		assertEquals(post.url, "http://supabase.test/functions/v1/generate-pdf");
		assertEquals(post.authorization, "Bearer user-jwt");
		for (const heading of [
			"Overview",
			"Payment Summary",
			"Scheduled Rent &amp; Expenses",
			"Expenses by Vendor",
			"Scheduled Net",
			"Lease Profitability",
		]) {
			assertStringIncludes(post.body.html, `<h2>${heading}</h2>`);
		}
		// Each section prints the columns it fills: the months under the
		// scheduled heads, the leases under Rent Received and Net.
		assertStringIncludes(
			post.body.html,
			'<h2>Scheduled Rent &amp; Expenses</h2><table class="table"><thead><tr><th class="th">Item</th><th class="th num">Scheduled Rent</th><th class="th num">Expenses</th><th class="th num">Scheduled Net</th></tr></thead>',
		);
		assertStringIncludes(
			post.body.html,
			'<h2>Lease Profitability</h2><table class="table"><thead><tr><th class="th">Item</th><th class="th">Value</th><th class="th num">Rent Received</th><th class="th num">Expenses</th><th class="th num">Net</th></tr></thead>',
		);
		assertStringIncludes(post.body.html, "Roof, Gutter &amp; Co");
		assertStringIncludes(post.body.html, '<td class="td">=HYPERLINK(1)</td>');
		assertStringIncludes(post.body.html, '<td class="td num">$61,200.00</td>');
		assertStringIncludes(post.body.html, '<td class="td num">$2,000.50</td>');
		// The Payment Summary's ledger figures, in dollars as the cards print them.
		assertStringIncludes(post.body.html, '<td class="td num">$1,185.50</td>');
		assertStringIncludes(post.body.html, '<td class="td num">$115.00</td>');
		assert(!post.body.html.includes(">61200<"), "no bare amount");
		assert(!post.body.html.includes(">2000.5<"), "no bare amount");
		assertPrintsMoney(post.body.html, expectedTable(scenario()));
		assertStringIncludes(post.body.html, `Generated: ${TODAY}`);
		assertEquals(post.body.filename, `financial-analytics-${TODAY}.pdf`);
		assertEquals(res.headers.get("Content-Type"), "application/pdf");
		assertEquals(
			res.headers.get("Content-Disposition"),
			`attachment; filename="financial-analytics-${TODAY}.pdf"`,
		);
		assertEquals(
			[...new Uint8Array(await res.arrayBuffer())],
			[37, 80, 68, 70],
		);
	});
});

Deno.test("a generate-pdf failure is a 502, not a file", async () => {
	await withPdfStub(false, async () => {
		const { res } = await run(get(`${FA}&format=pdf`), scenario());
		assertEquals(res.status, 502);
		assertEquals(await res.json(), { error: "An error occurred" });
	});
});

Deno.test("a free-tier owner gets the 402 with upgrade_url, and no RPC runs", async () => {
	for (const format of ["csv", "xlsx", "pdf"]) {
		const { res, calls } = await run(
			get(`${FA}&format=${format}`),
			scenario({ plan: "free", status: "active" }),
		);
		assertEquals(res.status, 402);
		const body = (await res.json()) as {
			reason?: string;
			upgrade_required?: boolean;
			upgrade_url?: string;
		};
		assertEquals(body.reason, "plan");
		assertEquals(body.upgrade_required, true);
		assertEquals(body.upgrade_url, "/billing/plans?source=reports_gate");
		assertEquals(calls.rpcs.length, 0);
		assertEquals(calls.gateEvents, 1);
	}
});

// 66.2-39 fix round 4, Part 8n: a Growth owner whose subscription is past due
// has the plan, so the 402 names the payment and Billing Settings, not an
// upgrade (`_shared/tier-gate-decision.ts`).
Deno.test("a past-due Growth owner gets the 402 with Billing Settings, and no RPC runs", async () => {
	const { res, calls } = await run(
		get(`${FA}&format=csv`),
		scenario({ plan: "growth", status: "past_due" }),
	);
	assertEquals(res.status, 402);
	assertEquals(await res.json(), {
		error:
			"Your plan includes this, but it is paused while your subscription payment is past due. Update your payment method in Billing Settings.",
		reason: "subscription_inactive",
		upgrade_required: false,
		upgrade_url: "/settings?tab=billing",
		current_plan: "growth",
		current_status: "past_due",
	});
	assertEquals(calls.rpcs.length, 0);
	assertEquals(calls.gateEvents, 1);
});

Deno.test("every RPC error is a 500 and never a file", async () => {
	for (const rpc of [
		"get_financial_overview",
		"get_revenue_trends_optimized",
		"get_expense_summary",
		"get_billing_insights",
	]) {
		for (const format of ["csv", "xlsx", "pdf"]) {
			await withPdfStub(true, async (posts) => {
				const s = scenario();
				s.rpc[rpc] = { data: null, error: { message: "permission denied" } };
				const { res } = await run(get(`${FA}&format=${format}`), s);
				assertEquals(res.status, 500, `${rpc} ${format}`);
				assertEquals(await res.json(), { error: "An error occurred" });
				assertEquals(posts.length, 0);
			});
		}
	}
	for (const type of ["year-end", "financial"]) {
		const s = scenario();
		for (const name of Object.keys(s.rpc)) {
			s.rpc[name] = { data: null, error: { message: "boom" } };
		}
		const { res } = await run(get(`?type=${type}&format=csv&year=2026`), s);
		assertEquals(res.status, 500, type);
	}
});

Deno.test("an RPC shape the page cannot render is a 500", async () => {
	const s = scenario();
	s.rpc.get_revenue_trends_optimized = { data: { month: "x" }, error: null };
	const { res } = await run(get(`${FA}&format=csv`), s);
	assertEquals(res.status, 500);
});

Deno.test("the query string is read and a request body is ignored", async () => {
	const s = scenario();
	const { res } = await run(
		get(`${FA}&format=csv`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ format: "pdf", type: "maintenance", payload: {} }),
		}),
		s,
	);
	assertEquals(res.status, 200);
	assertEquals(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
	const table = expectedTable(s);
	assertEquals(await res.text(), tableToCsv(table.header, table.rows));
});

Deno.test("format and year are validated", async () => {
	for (const query of [
		`${FA}&format=excel`,
		`${FA}&format=xls`,
		"?type=year-end&format=csv&year=20x6",
		"?type=year-end&year=26",
	]) {
		const { res, calls } = await run(get(query), scenario());
		assertEquals(res.status, 400, query);
		assertEquals(calls.rpcs.length, 0, query);
	}
});

Deno.test("a missing token is a 401", async () => {
	const { res } = await run(
		new Request(
			`https://supabase.test/functions/v1/export-report${FA}&format=csv`,
		),
		scenario(),
	);
	assertEquals(res.status, 401);
	const { res: bad } = await run(
		get(`${FA}&format=csv`),
		scenario({ authenticated: false }),
	);
	assertEquals(bad.status, 401);
});

/** The tax-year report the leaf builds from the scenario's answers. */
function expectedTaxYearReport(s: Scenario, reportType: string, year: number) {
	return buildTaxYearReport(
		reportType,
		{
			ledgerAtYearEnd: s.rpc["get_billing_insights@2024-12-31"]?.data ?? null,
			ledgerAtPriorYearEnd:
				s.rpc["get_billing_insights@2023-12-31"]?.data ?? null,
			expenseSummary: s.rpc.get_expense_summary?.data ?? null,
			propertyPerformance:
				s.rpc.get_property_performance_analytics?.data ?? null,
			deletedProperties: s.deleted,
		},
		year,
	);
}

Deno.test("year-end names a property deleted since, read for the validated owner only", async () => {
	const s = scenario({ deleted: [{ id: "p1" }] });
	const { res, calls } = await run(get("?type=year-end&format=csv&year=2024"), s);
	assertEquals(res.status, 200);
	const lines = (await res.text()).split("\n");
	assert(
		lines.includes("By Property,Maple Court (deleted),,61200,2120.5,59079.5"),
	);
	assertEquals(calls.propertyReads, [
		[
			["owner_user_id", OWNER_ID],
			["status", "inactive"],
		],
	]);
	// The tax documents report lists no property: it reads none.
	const other = await run(
		get(`?type=${TAX_DOCUMENTS_REPORT_TYPE}&format=csv&year=2024`),
		s,
	);
	assertEquals(other.res.status, 200);
	assertEquals(other.calls.propertyReads, []);
});

const TAX_YEAR_FILES: ReadonlyArray<readonly [string, string]> = [
	[YEAR_END_REPORT_TYPE, "year-end-2024"],
	[TAX_DOCUMENTS_REPORT_TYPE, "tax-documents-2024"],
];

Deno.test("year-end and tax documents csv are their page's figures for the year", async () => {
	for (const [type, filename] of TAX_YEAR_FILES) {
		const s = scenario();
		const { res, calls } = await run(
			get(`?type=${type}&format=csv&year=2024`),
			s,
		);
		assertEquals(res.status, 200, type);
		assertEquals(
			res.headers.get("Content-Disposition"),
			`attachment; filename="${filename}.csv"`,
		);
		assertEquals(calls.rpcs, [...taxYearReportCalls(type, OWNER_ID, 2024)]);
		const report = expectedTaxYearReport(s, type, 2024);
		const body = await res.text();
		assertEquals(body, tableToCsv(report.table.header, report.table.rows));
		assert(!body.includes("overview"), type);
	}
	const s = scenario();
	const { res } = await run(get("?type=year-end&format=csv&year=2024"), s);
	const lines = (await res.text()).split("\n");
	assertEquals(lines[0], "Section,Item,Amount,Rent Received,Expenses,Net Income");
	assert(lines.includes("Summary,Rent Received,61200,,,"));
	assert(lines.includes("By Property,Maple Court,,61200,2120.5,59079.5"));
	assert(lines.includes("Expenses by Vendor,'=HYPERLINK(1),120,,,"));
	assert(!lines.some((line) => /1099|threshold/i.test(line)));
});

Deno.test("year-end and tax documents pdf post the sectioned HTML", async () => {
	for (const [type, filename] of TAX_YEAR_FILES) {
		await withPdfStub(true, async (posts) => {
			const s = scenario();
			const { res } = await run(get(`?type=${type}&format=pdf&year=2024`), s);
			assertEquals(res.status, 200, type);
			const report = expectedTaxYearReport(s, type, 2024);
			assertEquals(posts.length, 1);
			const html = posts[0]?.body.html ?? "";
			assertStringIncludes(html, "2024");
			assertStringIncludes(html, '<td class="td num">$61,200.00</td>');
			assert(!html.includes(">61200<"), `${type}: no bare amount`);
			assert(!html.includes(">2120.5<"), `${type}: no bare amount`);
			assert(!html.includes(">2000.5<"), `${type}: no bare amount`);
			assertPrintsMoney(html, report.table);
			assertEquals(posts[0]?.body, {
				html: sectionedReportHtml(report.title, TODAY, report.table),
				filename: `${filename}.pdf`,
			});
		});
	}
});

Deno.test("year-end and tax documents xlsx keep numbers, money in dollars", async () => {
	for (const [type, filename] of TAX_YEAR_FILES) {
		const s = scenario();
		const { res } = await run(get(`?type=${type}&format=xlsx&year=2024`), s);
		assertEquals(res.status, 200, type);
		assertEquals(
			res.headers.get("Content-Disposition"),
			`attachment; filename="${filename}.xlsx"`,
		);
		const report = expectedTaxYearReport(s, type, 2024);
		const bytes = new Uint8Array(await res.arrayBuffer());
		const sheet = XLSX.read(bytes, { type: "array", cellNF: true }).Sheets[
			report.title
		];
		assert(sheet, `${type}: the sheet exists`);
		// Row 2 is Rent Received; both tables carry the amount in column C.
		const amount = sheet.C2;
		assertEquals(amount?.t, "n", type);
		assertEquals(amount?.w, "$61,200.00", type);
		assertXlsxIsTable(bytes, report.title, report.table);
	}
});

Deno.test("year-end and tax documents are gated: 402, no RPC", async () => {
	for (const [type] of TAX_YEAR_FILES) {
		const { res, calls } = await run(
			get(`?type=${type}&format=csv&year=2024`),
			scenario({ plan: "free" }),
		);
		assertEquals(res.status, 402, type);
		assertEquals(calls.rpcs, []);
	}
});

Deno.test("a type the function does not build is a 400, before the gate and any RPC", async () => {
	for (const query of [
		"?type=maintenance&format=csv&year=2026",
		// The year-end page's 1099-NEC section, removed in 66.2-39.
		"?type=1099&format=csv&year=2026",
		"?type=revenue&format=xlsx",
		"?type=income-statement&format=pdf",
		"?type=cash-flow&format=csv",
		"?type=&format=csv",
		"?format=csv",
		"",
	]) {
		for (const plan of ["growth", "free"]) {
			await withPdfStub(true, async (posts) => {
				const { res, calls } = await run(get(query), scenario({ plan }));
				assertEquals(res.status, 400, `${query} ${plan}`);
				assertEquals(await res.json(), {
					error:
						"type must be one of: financial-analytics, year-end, financial",
				});
				assertEquals(calls.rpcs, [], query);
				assertEquals(calls.gateEvents, 0, query);
				assertEquals(posts, [], query);
			});
		}
	}
});
