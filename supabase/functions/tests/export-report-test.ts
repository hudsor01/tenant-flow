// In-process tests for the export-report Edge Function: a hand-rolled fake
// SupabaseClient and a stubbed generate-pdf fetch; no network, no
// `functions serve`, no deploy (mirrors lease-signature-metering-test.ts).
//
// What it pins:
//   - the function reads the query string and ignores a request body;
//   - financial-analytics writes the leaf's table (the page's figures) as CSV,
//     as a real .xlsx (parsed back here with the same SheetJS build: sheet,
//     cells, cell types, a leading `=` kept as text) and as PDF through the
//     generate-pdf delegate;
//   - the paywall: a free-tier owner gets the 402 with upgrade_url and no RPC
//     runs;
//   - every RPC error is a 500 and never a file;
//   - format and year are validated, and a year-end export reads that year.
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/export-report-test.ts

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from "xlsx";
import {
	buildFinancialAnalyticsTable,
	FINANCIAL_ANALYTICS_HEADER,
} from "../_shared/financial-analytics-report.ts";
import { tableToCsv } from "../_shared/report-csv.ts";
import { XLSX_MIME_TYPE } from "../_shared/report-xlsx.ts";

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
				highlights: [],
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
			data: { unpaidTotal: 0, unpaidCount: 0, lateFeeTotal: 0, tenantCount: 3 },
			error: null,
		},
		get_maintenance_analytics: {
			data: { open_requests: 2, avg_resolution_hours: 5.5 },
			error: null,
		},
	};
}

interface Scenario {
	plan: string;
	status: string;
	rpc: RpcAnswers;
	authenticated: boolean;
}

function scenario(overrides: Partial<Scenario> = {}): Scenario {
	return {
		plan: "growth",
		status: "active",
		rpc: answers(),
		authenticated: true,
		...overrides,
	};
}

interface Calls {
	rpcs: Array<{ name: string; args: Record<string, unknown> }>;
	gateEvents: number;
}

function makeClient(s: Scenario): { client: SupabaseClient; calls: Calls } {
	const calls: Calls = { rpcs: [], gateEvents: 0 };
	const builder = (table: string) => {
		const b: Record<string, unknown> = {
			select: () => b,
			eq: () => b,
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
	const client = {
		auth: {
			getUser: async (_token: string) =>
				s.authenticated
					? { data: { user: { id: OWNER_ID } }, error: null }
					: { data: { user: null }, error: { message: "bad jwt" } },
		},
		from: (table: string) => builder(table),
		rpc: async (name: string, args: Record<string, unknown>) => {
			calls.rpcs.push({ name, args });
			return s.rpc[name] ?? { data: null, error: { message: `no ${name}` } };
		},
	} as unknown as SupabaseClient;
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
	});
}

const FA = "?type=financial-analytics";

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
	assert(
		lines.includes("Overview,Collected,0.3,,,"),
		"collected rounds to cents",
	);
	assert(lines.includes("Expense Breakdown,'=HYPERLINK(1),120,,,"));
	assert(lines.includes('Expense Breakdown,"Roof, Gutter & Co",2000.5,,,'));
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

	const workbook = XLSX.read(bytes, { type: "array" });
	assertEquals(workbook.SheetNames, ["Financial Analytics"]);
	const sheet = workbook.Sheets["Financial Analytics"];
	assert(sheet, "the sheet exists");

	const table = expectedTable(s);
	const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		header: 1,
		defval: null,
	});
	assertEquals(grid, [[...table.header], ...table.rows.map((row) => [...row])]);

	// Types: text cells are strings, figures are numbers, no cell is a formula.
	assertEquals(sheet.A1?.t, "s");
	assertEquals(sheet.A1?.v, "Section");
	const scheduled = sheet.C2;
	assertEquals(sheet.B2?.v, "Scheduled");
	assertEquals(scheduled?.t, "n");
	assertEquals(scheduled?.v, 61200);
	const formulaText = Object.entries(sheet).find(
		([address, cell]) =>
			!address.startsWith("!") &&
			(cell as XLSX.CellObject).v === "=HYPERLINK(1)",
	);
	assert(formulaText, "the formula-like category is in the sheet");
	const cell = formulaText[1] as XLSX.CellObject;
	assertEquals(cell.t, "s");
	assertEquals(cell.f, undefined);
	for (const [address, value] of Object.entries(sheet)) {
		if (address.startsWith("!")) continue;
		assertEquals((value as XLSX.CellObject).f, undefined, address);
	}
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
			"Revenue &amp; Expenses",
			"Expense Breakdown",
			"Net Operating Income",
		]) {
			assertStringIncludes(post.body.html, `<h2>${heading}</h2>`);
		}
		assertStringIncludes(post.body.html, "Roof, Gutter &amp; Co");
		assertStringIncludes(post.body.html, '<td class="td">=HYPERLINK(1)</td>');
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
			upgrade_required?: boolean;
			upgrade_url?: string;
		};
		assertEquals(body.upgrade_required, true);
		assertEquals(body.upgrade_url, "/billing/plans?source=reports_gate");
		assertEquals(calls.rpcs.length, 0);
		assertEquals(calls.gateEvents, 1);
	}
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
	for (const type of ["year-end", "1099", "maintenance", "revenue"]) {
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
		"?format=csv&year=20x6",
		"?year=26",
	]) {
		const { res, calls } = await run(get(query), scenario());
		assertEquals(res.status, 400, query);
		assertEquals(calls.rpcs.length, 0, query);
	}
});

Deno.test("a missing token is a 401", async () => {
	const { res } = await run(
		new Request("https://supabase.test/functions/v1/export-report?format=csv"),
		scenario(),
	);
	assertEquals(res.status, 401);
	const { res: bad } = await run(
		get("?format=csv"),
		scenario({ authenticated: false }),
	);
	assertEquals(bad.status, 401);
});

Deno.test("a year-end export reads the requested year", async () => {
	const { res, calls } = await run(
		get("?type=year-end&format=csv&year=2024"),
		scenario(),
	);
	assertEquals(res.status, 200);
	assertEquals(
		res.headers.get("Content-Disposition"),
		'attachment; filename="year-end-2024.csv"',
	);
	assertEquals(calls.rpcs, [
		{
			name: "get_financial_overview",
			args: {
				p_user_id: OWNER_ID,
				p_start_date: "2024-01-01",
				p_end_date: "2024-12-31",
			},
		},
	]);
});

Deno.test("a row report's xlsx is a real workbook of its rows", async () => {
	const s = scenario();
	const { res } = await run(get("?type=maintenance&format=xlsx&year=2026"), s);
	assertEquals(res.status, 200);
	const bytes = new Uint8Array(await res.arrayBuffer());
	// A zip, not CSV text under the spreadsheet MIME type (SheetJS would parse
	// CSV text into a workbook too, so the magic is what tells them apart).
	assertEquals([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
	assertEquals(res.headers.get("Content-Type"), XLSX_MIME_TYPE);
	const workbook = XLSX.read(bytes, { type: "array" });
	const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
	assert(sheet);
	assertEquals(XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }), [
		["metric", "value"],
		["open_requests", 2],
		["avg_resolution_hours", 5.5],
	]);
	assertEquals(sheet.B2?.t, "n");

	const empty = scenario();
	empty.rpc.get_maintenance_analytics = { data: null, error: null };
	const { res: none } = await run(
		get("?type=maintenance&format=xlsx&year=2026"),
		empty,
	);
	const blank = XLSX.read(new Uint8Array(await none.arrayBuffer()), {
		type: "array",
	});
	const blankSheet = blank.Sheets[blank.SheetNames[0] ?? ""];
	assert(blankSheet);
	assertEquals(XLSX.utils.sheet_to_json<unknown[]>(blankSheet, { header: 1 }), [
		["No data available"],
	]);
});
