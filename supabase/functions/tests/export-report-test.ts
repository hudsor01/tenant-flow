// In-process tests for the export-report Edge Function: a hand-rolled fake
// SupabaseClient and a stubbed generate-pdf fetch; no network, no
// `functions serve`, no deploy (mirrors lease-signature-metering-test.ts).
//
// What it pins:
//   - every RPC error is a 500 and never a file.
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/export-report-test.ts

import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";

Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");

const { handleRequest } = await import("../export-report/index.ts");

const OWNER_ID = "owner-1";

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
	const res = await handleRequest(req, { createClient: () => client });
	return { res, calls };
}

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
