// In-process tests for generate-pdf Mode 1: a fake SupabaseClient and a
// stubbed StirlingPDF fetch; no network, no `functions serve`, no deploy
// (mirrors lease-signature-metering-test.ts).
//
// What it pins: a reportType the function does not build (the deleted
// maintenance and revenue row dumps, income-statement, cash-flow) is a 400
// before the gate and any RPC, and so is a `{ leaseId }` body (the deleted
// lease-preview mode no caller sent); each page-backed report type is gated like
// export-report's (the 402 with upgrade_url, no RPC), its RPC errors are a
// 500, and a paid owner's PDF is printed from the same document
// export-report's pdf format posts here (`sectionedReportHtml` over the
// leaf's table, money in dollars as the pages print it): the
// /analytics/financial export, and the year-end and tax-documents pages for
// the year asked for (`_shared/tax-year-reports.ts`, whose rows the
// Vitest `__tests__/tax-year-reports.test.ts` proves equal to the pages').
//
// Run: deno test --allow-all --no-check \
//   --import-map=supabase/functions/deno.json \
//   supabase/functions/tests/generate-pdf-test.ts

import { assert, assertEquals } from "jsr:@std/assert@1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fakeSupabaseClient } from "./fake-supabase-client.ts";
import { buildFinancialAnalyticsTable } from "../_shared/financial-analytics-report.ts";
import { sectionedReportHtml } from "../_shared/report-html.ts";
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
): {
	client: SupabaseClient;
	rpcs: string[];
	calls: Array<{ name: string; args: unknown }>;
} {
	const rpcs: string[] = [];
	const calls: Array<{ name: string; args: unknown }> = [];
	const builder = (table: string) => {
		const filters: Array<[string, unknown]> = [];
		const b: Record<string, unknown> = {
			select: () => b,
			eq: (column: string, value: unknown) => {
				filters.push([column, value]);
				return b;
			},
			order: () => b,
			// The year-end report's read of the owner's deleted property ids:
			// none deleted, and recorded like an RPC with its filters.
			range: async () => {
				if (table !== "properties") return { data: null, error: null };
				calls.push({ name: "properties", args: filters });
				return { data: [], error: null };
			},
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
	const client = fakeSupabaseClient({
		auth: {
			getUser: async () => ({ data: { user: { id: "owner-1" } }, error: null }),
		},
		from: (table: string) => builder(table),
		rpc: (name: string, args?: unknown) => {
			rpcs.push(name);
			calls.push({ name, args });
			// An answer keyed by the as-of date first (the tax-year reports read
			// the ledger as of two), then by name. Awaitable, and after
			// .order()/.range() as well: the year-end reports page through the
			// property rows, and a fixture of fewer than a page is read in one.
			const asOf =
				args && typeof args === "object" && "end_date_param" in args
					? String(args.end_date_param)
					: "";
			const answer = Promise.resolve(
				rpc[`${name}@${asOf}`] ??
					rpc[name] ?? { data: null, error: { message: `no ${name}` } },
			);
			const query = Object.assign(answer, {
				order: () => query,
				range: () => answer,
			});
			return query;
		},
	});
	return { client, rpcs, calls };
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
		}, propertyReportName, expenseVendorLabel);
		const html = htmlPosts[0] ?? "";
		assert(html.includes('<td class="td num">$1,200.00</td>'), "Scheduled");
		assert(html.includes('<td class="td num">$200.00</td>'), "an expense");
		assert(!html.includes(">1200<"), "no bare amount");
		assertEquals(htmlPosts, [
			sectionedReportHtml("Financial Analytics", "2026-11-01", table),
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

// The year-end and tax-documents pages' RPCs (`_shared/tax-year-reports.ts`),
// plus get_financial_overview, which these reports used to print flattened
// (answered here so that defect would show as a wrong document, not a 500).
const TAX_YEAR_ANSWERS: Record<string, { data: unknown; error: unknown }> = {
	get_financial_overview: ANSWERS.get_financial_overview ?? {
		data: null,
		error: null,
	},
	// The rent ledger as of December 31, 2024 and 2023 (get_billing_insights
	// with end_date_param, 20261102055449): 61,200 received in 2024.
	"get_billing_insights@2024-12-31": {
		data: { collectedTotal: 73400, unpaidTotal: 0, chargedTotal: 73400 },
		error: null,
	},
	"get_billing_insights@2023-12-31": {
		data: { collectedTotal: 12200, unpaidTotal: 0, chargedTotal: 12200 },
		error: null,
	},
	get_expense_summary: {
		data: {
			categories: [
				{ category: "roof_and_gutter", amount: 2000, percentage: 18.0 },
				{ category: "<b>Vendor</b>", amount: 9000.5, percentage: 82.0 },
			],
			total_amount: 11000.5,
		},
		error: null,
	},
	get_property_performance_analytics: {
		data: [
			{
				property_id: "p1",
				property_name: "Maple Court",
				total_revenue: 61200,
				total_expenses: 11000.5,
				net_income: 50199.5,
				timeframe: "2024-01-01/2024-12-31",
			},
		],
		error: null,
	},
};

function modeOneFor(reportType: string, year: unknown): Request {
	return new Request("https://supabase.test/functions/v1/generate-pdf", {
		method: "POST",
		headers: {
			Authorization: "Bearer user-jwt",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ reportType, year, filename: "report.pdf" }),
	});
}

const TAX_YEAR_TYPES = [YEAR_END_REPORT_TYPE, TAX_DOCUMENTS_REPORT_TYPE];

Deno.test("Mode 1 year-end and tax documents print their page for the year asked for", async () => {
	for (const reportType of TAX_YEAR_TYPES) {
		await withStirling(async (htmlPosts) => {
			const { client, calls } = makeClient("growth", TAX_YEAR_ANSWERS);
			const res = await handleRequest(modeOneFor(reportType, 2024), {
				createClient: () => client,
				now: () => NOW,
			});
			assertEquals(res.status, 200, reportType);
			assertEquals(calls, [
				...taxYearReportCalls(reportType, "owner-1", 2024),
				// The year-end report also reads the owner's deleted property ids,
				// scoped by the validated owner id (the admin client bypasses RLS).
				...(reportType === YEAR_END_REPORT_TYPE
					? [
							{
								name: "properties",
								args: [
									["owner_user_id", "owner-1"],
									["status", "inactive"],
								],
							},
						]
					: []),
			]);
			const report = buildTaxYearReport(
				reportType,
				{
					ledgerAtYearEnd:
						TAX_YEAR_ANSWERS["get_billing_insights@2024-12-31"]?.data ?? null,
					ledgerAtPriorYearEnd:
						TAX_YEAR_ANSWERS["get_billing_insights@2023-12-31"]?.data ?? null,
					expenseSummary: TAX_YEAR_ANSWERS.get_expense_summary?.data ?? null,
					propertyPerformance:
						TAX_YEAR_ANSWERS.get_property_performance_analytics?.data ?? null,
					deletedProperties: [],
				},
				2024,
			);
			const html = htmlPosts[0] ?? "";
			assert(
				html.includes('<td class="td num">$61,200.00</td>'),
				`${reportType}: rent received in dollars`,
			);
			assert(!/1099|threshold/i.test(html), `${reportType}: no 1099 section`);
			assert(!html.includes(">61200<"), `${reportType}: no bare amount`);
			assert(!html.includes(">9000.5<"), `${reportType}: no bare amount`);
			assertEquals(htmlPosts, [
				sectionedReportHtml(report.title, "2026-11-01", report.table),
			]);
			assert(html.includes("2024"), reportType);
			assert(!html.includes("<b>Vendor</b>"), reportType);
			assert(!html.includes("overview"), reportType);
		});
	}
});

Deno.test("Mode 1 tax-year reports are gated: 402 with upgrade_url, no RPC", async () => {
	for (const reportType of TAX_YEAR_TYPES) {
		await withStirling(async (htmlPosts) => {
			const { client, rpcs } = makeClient("free", TAX_YEAR_ANSWERS);
			const res = await handleRequest(modeOneFor(reportType, 2024), {
				createClient: () => client,
			});
			assertEquals(res.status, 402, reportType);
			const body = (await res.json()) as { upgrade_url?: string };
			assertEquals(body.upgrade_url, "/billing/plans?source=reports_gate");
			assertEquals(rpcs, []);
			assertEquals(htmlPosts, []);
		});
	}
});

Deno.test("Mode 1 tax-year RPC errors are a 500 and no PDF", async () => {
	for (const reportType of TAX_YEAR_TYPES) {
		for (const { name, args } of taxYearReportCalls(
			reportType,
			"owner-1",
			2024,
		)) {
			// The answer the call reads: by as-of date first, as makeClient looks.
			const key =
				"end_date_param" in args ? `${name}@${String(args.end_date_param)}` : name;
			await withStirling(async (htmlPosts) => {
				const answers = {
					...TAX_YEAR_ANSWERS,
					[key]: { data: null, error: { message: "x" } },
				};
				const { client } = makeClient("growth", answers);
				const res = await handleRequest(modeOneFor(reportType, 2024), {
					createClient: () => client,
				});
				assertEquals(res.status, 500, `${reportType} ${key}`);
				assertEquals(await res.json(), { error: "An error occurred" });
				assertEquals(htmlPosts, []);
			});
		}
	}
});

Deno.test("Mode 1 rejects a year that is not a four-digit integer", async () => {
	for (const year of [2026.5, "2026", 99999, 26, null]) {
		await withStirling(async (htmlPosts) => {
			const { client, rpcs } = makeClient("growth", TAX_YEAR_ANSWERS);
			const res = await handleRequest(modeOneFor(YEAR_END_REPORT_TYPE, year), {
				createClient: () => client,
			});
			assertEquals(res.status, 400, String(year));
			assertEquals(rpcs, []);
			assertEquals(htmlPosts, []);
		});
	}
});

Deno.test("Mode 1 rejects a reportType it does not build, before the gate and any RPC", async () => {
	for (const reportType of [
		"maintenance",
		// The year-end page's 1099-NEC section, removed in 66.2-39.
		"1099",
		"revenue",
		"income-statement",
		"cash-flow",
		"Year-End",
	]) {
		for (const plan of ["growth", "free"]) {
			await withStirling(async (htmlPosts) => {
				const { client, rpcs } = makeClient(plan, TAX_YEAR_ANSWERS);
				const res = await handleRequest(modeOneFor(reportType, 2026), {
					createClient: () => client,
				});
				assertEquals(res.status, 400, `${reportType} ${plan}`);
				assertEquals(await res.json(), {
					error:
						"reportType must be one of: financial-analytics, year-end, financial",
				});
				assertEquals(rpcs, []);
				assertEquals(htmlPosts, []);
			});
		}
	}
});

Deno.test("a { leaseId } body (the deleted lease-preview mode) is a 400, with no read", async () => {
	await withStirling(async (htmlPosts) => {
		const { client, rpcs } = makeClient("growth", TAX_YEAR_ANSWERS);
		let tableReads = 0;
		const counting = new Proxy(client, {
			get(target, prop, receiver) {
				if (prop === "from") {
					return (table: string) => {
						tableReads++;
						return target.from(table);
					};
				}
				return Reflect.get(target, prop, receiver);
			},
		});
		const res = await handleRequest(
			new Request("https://supabase.test/functions/v1/generate-pdf", {
				method: "POST",
				headers: {
					Authorization: "Bearer user-jwt",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ leaseId: "lease-1", filename: "lease.pdf" }),
			}),
			{ createClient: () => counting },
		);
		assertEquals(res.status, 400);
		assertEquals(rpcs, []);
		assertEquals(tableReads, 0);
		assertEquals(htmlPosts, []);
	});
});
