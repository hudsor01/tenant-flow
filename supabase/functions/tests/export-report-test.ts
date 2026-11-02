// In-process tests for the export-report Edge Function: a hand-rolled fake
// SupabaseClient and a stubbed generate-pdf fetch; no network, no
// `functions serve`, no deploy (mirrors lease-signature-metering-test.ts).
//
// What it pins:
//   - a row report's xlsx is a real .xlsx (parsed back here with the same
//     SheetJS build);
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
import { XLSX_MIME_TYPE } from "../_shared/report-xlsx.ts";

Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");

const { handleRequest } = await import("../export-report/index.ts");

const OWNER_ID = "owner-1";
const NOW = new Date("2026-11-01T18:30:00Z");

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

const FA = "?type=financial-analytics";

Deno.test("every RPC error is a 500 and never a file", async () => {
	for (const type of ["year-end", "1099", "maintenance", "revenue"]) {
		const s = scenario();
		for (const name of Object.keys(s.rpc)) {
			s.rpc[name] = { data: null, error: { message: "boom" } };
		}
		const { res } = await run(get(`?type=${type}&format=csv&year=2026`), s);
		assertEquals(res.status, 500, type);
	}
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
