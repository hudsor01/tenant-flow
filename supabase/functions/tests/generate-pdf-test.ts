// In-process tests for generate-pdf Mode 1 `financial-analytics`: a fake
// SupabaseClient and a stubbed StirlingPDF fetch; no network, no
// `functions serve`, no deploy (mirrors lease-signature-metering-test.ts).
//
// What it pins: the report type is gated like export-report's (the 402 with
// upgrade_url, no RPC), its RPC errors are a 500, and a paid owner's PDF is
// printed from the same document export-report's pdf format posts here
// (`sectionedReportHtml` over the leaf's table).
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/generate-pdf-test.ts

import { assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFinancialAnalyticsTable } from "../_shared/financial-analytics-report.ts";
import { sectionedReportHtml } from "../_shared/report-html.ts";

Deno.env.set("DENO_TEST_NO_SERVE", "1");
Deno.env.set("SUPABASE_URL", "http://supabase.test");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
Deno.env.set("STIRLING_PDF_URL", "http://stirling.test");
Deno.env.set("NEXT_PUBLIC_APP_URL", "https://app.tenantflow.app");

const { handleRequest } = await import("../generate-pdf/index.ts");

const NOW = new Date("2026-11-01T18:30:00Z");

const ANSWERS: Record<string, { data: unknown; error: unknown }> = {
	get_financial_overview: {
		data: { overview: { total_revenue: 1200, total_expenses: 200 } },
		error: null,
	},
	get_revenue_trends_optimized: {
		data: [{ month: "2026-10", revenue: 100, collections: 50 }],
		error: null,
	},
	get_expense_summary: {
		data: {
			categories: [{ category: "<b>Vendor</b>", amount: 200 }],
			monthly_totals: [{ month: "2026-10", amount: 200 }],
		},
		error: null,
	},
	get_billing_insights: { data: { tenantCount: 1 }, error: null },
};

function makeClient(
	plan: string,
	rpc: Record<string, { data: unknown; error: unknown }>,
): { client: SupabaseClient; rpcs: string[] } {
	const rpcs: string[] = [];
	const builder = (table: string) => {
		const b: Record<string, unknown> = {
			select: () => b,
			eq: () => b,
			single: async () =>
				table === "users"
					? {
							data: { subscription_status: "active", subscription_plan: plan },
							error: null,
						}
					: { data: null, error: null },
			insert: () => b,
			then: (resolve: (v: { data: null; error: null }) => void) =>
				resolve({ data: null, error: null }),
		};
		return b;
	};
	const client = {
		auth: {
			getUser: async () => ({ data: { user: { id: "owner-1" } }, error: null }),
		},
		from: (table: string) => builder(table),
		rpc: async (name: string) => {
			rpcs.push(name);
			return rpc[name] ?? { data: null, error: { message: `no ${name}` } };
		},
	} as unknown as SupabaseClient;
	return { client, rpcs };
}

function modeOne(): Request {
	return new Request("https://supabase.test/functions/v1/generate-pdf", {
		method: "POST",
		headers: {
			Authorization: "Bearer user-jwt",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			reportType: "financial-analytics",
			year: 2026,
			filename: "financial-analytics-2026-11-01.pdf",
		}),
	});
}

async function withStirling(
	fn: (htmlPosts: string[]) => Promise<void>,
): Promise<void> {
	const prev = globalThis.fetch;
	const htmlPosts: string[] = [];
	globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
		const form = init?.body;
		if (form instanceof FormData) {
			htmlPosts.push(String(form.get("htmlContent")));
		}
		return new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 });
	}) as typeof fetch;
	try {
		await fn(htmlPosts);
	} finally {
		globalThis.fetch = prev;
	}
}

Deno.test("Mode 1 financial-analytics prints export-report's document", async () => {
	await withStirling(async (htmlPosts) => {
		const { client, rpcs } = makeClient("growth", ANSWERS);
		const res = await handleRequest(modeOne(), {
			createClient: () => client,
			now: () => NOW,
		});
		assertEquals(res.status, 200);
		assertEquals(res.headers.get("Content-Type"), "application/pdf");
		assertEquals(rpcs.sort(), [
			"get_billing_insights",
			"get_expense_summary",
			"get_financial_overview",
			"get_revenue_trends_optimized",
		]);
		const table = buildFinancialAnalyticsTable({
			overview: ANSWERS.get_financial_overview?.data,
			revenueTrends: ANSWERS.get_revenue_trends_optimized?.data,
			expenseSummary: ANSWERS.get_expense_summary?.data,
			billingInsights: ANSWERS.get_billing_insights?.data,
		});
		assertEquals(htmlPosts, [
			sectionedReportHtml(
				"Financial Analytics",
				"2026-11-01",
				table.header,
				table.rows,
			),
		]);
	});
});

Deno.test("Mode 1 financial-analytics is gated: 402 with upgrade_url, no RPC", async () => {
	await withStirling(async (htmlPosts) => {
		const { client, rpcs } = makeClient("free", ANSWERS);
		const res = await handleRequest(modeOne(), { createClient: () => client });
		assertEquals(res.status, 402);
		const body = (await res.json()) as { upgrade_url?: string };
		assertEquals(body.upgrade_url, "/billing/plans?source=reports_gate");
		assertEquals(rpcs, []);
		assertEquals(htmlPosts, []);
	});
});

Deno.test("Mode 1 financial-analytics RPC error is a 500 and no PDF", async () => {
	for (const failing of Object.keys(ANSWERS)) {
		await withStirling(async (htmlPosts) => {
			const answers = {
				...ANSWERS,
				[failing]: { data: null, error: { message: "x" } },
			};
			const { client } = makeClient("growth", answers);
			const res = await handleRequest(modeOne(), {
				createClient: () => client,
			});
			assertEquals(res.status, 500, failing);
			assertEquals(await res.json(), { error: "An error occurred" });
			assertEquals(htmlPosts, []);
		});
	}
});
