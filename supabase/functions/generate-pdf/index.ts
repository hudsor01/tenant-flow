// Supabase Edge Function: generate-pdf
// Accepts two request modes:
//   1. { reportType, year }   — server-side report data fetch + HTML build
//      (`financial-analytics` prints the /analytics/financial export, the same
//      document export-report's pdf format prints; `year` is not used for it.
//      `year-end` and `financial` print the /reports/year-end page and the
//      /reports/tax-documents page for that year, `_shared/tax-year-reports.ts`.
//      Any other reportType is a 400.)
//   2. { html }               — pre-built HTML from caller (no DB fetch)
// (A third mode, { leaseId }, printed a lease summary that no caller requests;
// such a body is now a Mode 1 request without a reportType, a 400.)
// Calls the self-hosted StirlingPDF k3s instance and streams the resulting PDF blob.
// JWT-authenticated — requires a valid Bearer token.
// Fail-fast: no retry on StirlingPDF errors (matches stripe-webhooks pattern).

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateBearerAuth } from "../_shared/auth.ts";
import {
	getCorsHeaders,
	getJsonHeaders,
	handleCorsOptions,
} from "../_shared/cors.ts";
import { validateEnv } from "../_shared/env.ts";
import { captureWebhookError, errorResponse } from "../_shared/errors.ts";
import {
	buildFinancialAnalyticsTable,
	FINANCIAL_ANALYTICS_REPORT_TYPE,
	loadFinancialAnalyticsSources,
} from "../_shared/financial-analytics-report.ts";
import { sectionedReportHtml } from "../_shared/report-html.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import {
	buildTaxYearReport,
	expenseVendorLabel,
	loadTaxYearSources,
	propertyReportName,
	TAX_YEAR_REPORT_TYPES,
} from "../_shared/tax-year-reports.ts";
import {
	checkTierEntitlement,
	GROWTH_AND_MAX_PLANS,
} from "../_shared/tier-gate.ts";

// Mirror of export-report PREMIUM_REPORT_TYPES. generate-pdf's Mode 1
// (structured report data via {reportType, year}) bypasses export-report
// entirely, so the same gate has to live here. Mode 2 (raw HTML the caller
// built from data it already holds) is not gated.
const PREMIUM_REPORT_TYPES: ReadonlySet<string> = new Set([
	"year-end",
	"financial",
	"financial-analytics",
]);

/** The Mode 1 report types this function builds; any other is a 400. */
const REPORT_TYPES: readonly string[] = [
	FINANCIAL_ANALYTICS_REPORT_TYPE,
	...TAX_YEAR_REPORT_TYPES,
];

type RequestBody =
	| { reportType: string; year: number; filename?: string }
	| { html: string; filename?: string };

/** Injectable dependencies for `deno test` (mirrors lease-signature). */
export interface GeneratePdfDeps {
	createClient?: (url: string, key: string) => SupabaseClient;
	now?: () => Date;
}

/** Core request handler, exported so the Deno test drives it directly. */
export async function handleRequest(
	req: Request,
	deps: GeneratePdfDeps = {},
): Promise<Response> {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	try {
		const env = validateEnv({
			required: [
				"SUPABASE_URL",
				"SUPABASE_SERVICE_ROLE_KEY",
				"STIRLING_PDF_URL",
			],
		});

		const makeClient = deps.createClient ?? createAdminClient;
		const supabase = makeClient(
			env["SUPABASE_URL"],
			env["SUPABASE_SERVICE_ROLE_KEY"],
		);

		const auth = await validateBearerAuth(req, supabase);
		if ("error" in auth) {
			return new Response(JSON.stringify({ error: auth.error }), {
				status: auth.status,
				headers: getJsonHeaders(req),
			});
		}
		const { user } = auth;

		const body = (await req.json()) as RequestBody;
		const filename = body.filename ?? "report.pdf";

		let html: string;

		if ("html" in body) {
			// Mode 2: pre-built HTML from caller (export-report or frontend component)
			if (!body.html || typeof body.html !== "string") {
				return new Response(
					JSON.stringify({ error: "html field must be a non-empty string" }),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}
			html = body.html;
		} else {
			// Mode 1: structured report data — fetch DB data and build HTML
			if (
				!body.reportType ||
				typeof body.reportType !== "string" ||
				!Number.isInteger(body.year) ||
				body.year < 1000 ||
				body.year > 9999
			) {
				return new Response(
					JSON.stringify({
						error:
							"reportType (string) and year (a four-digit integer) are required",
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}
			if (!REPORT_TYPES.includes(body.reportType)) {
				return new Response(
					JSON.stringify({
						error: `reportType must be one of: ${REPORT_TYPES.join(", ")}`,
					}),
					{ status: 400, headers: getJsonHeaders(req) },
				);
			}

			// REQ-46-01: premium report types require Growth/Max tier.
			if (PREMIUM_REPORT_TYPES.has(body.reportType)) {
				const entitlementBlock = await checkTierEntitlement(
					req,
					supabase,
					user.id,
					{
						feature: "premium_reports",
						upgrade_source: "reports_gate",
						entitled_plans: GROWTH_AND_MAX_PLANS,
					},
				);
				if (entitlementBlock) return entitlementBlock;
			}

			const today = (deps.now ?? (() => new Date()))()
				.toISOString()
				.slice(0, 10);
			if (body.reportType === FINANCIAL_ANALYTICS_REPORT_TYPE) {
				const load = await loadFinancialAnalyticsSources(
					(name, args) => supabase.rpc(name, args),
					user.id,
				);
				if (!load.ok) {
					return errorResponse(req, 500, load.error, {
						action: "generate_pdf_rpc",
						rpc: load.rpc,
					});
				}
				html = sectionedReportHtml(
					"Financial Analytics",
					today,
					buildFinancialAnalyticsTable(
						load.sources,
						propertyReportName,
						expenseVendorLabel,
					),
				);
			} else {
				const load = await loadTaxYearSources(
					// A page when the loader asks for one: every property row.
					(name, args, page) => {
						const query = supabase.rpc(name, args);
						if (!page) return query;
						let ordered = query;
						for (const column of page.order) ordered = ordered.order(column);
						return ordered.range(page.from, page.to);
					},
					body.reportType,
					user.id,
					body.year,
					// The owner's deleted property ids, scoped by the validated id: the
					// admin client bypasses RLS, so this filter is the boundary.
					(page) =>
						supabase
							.from("properties")
							.select("id")
							.eq("owner_user_id", user.id)
							.eq("status", "inactive")
							.order("id")
							.range(page.from, page.to),
				);
				if (!load.ok) {
					return errorResponse(req, 500, load.error, {
						action: "generate_pdf_rpc",
						rpc: load.rpc,
					});
				}
				const report = buildTaxYearReport(
					body.reportType,
					load.sources,
					body.year,
				);
				html = sectionedReportHtml(report.title, today, report.table);
			}
		}

		const formData = new FormData();
		formData.append("htmlContent", html);

		const stirlingPdfUrl = env["STIRLING_PDF_URL"];
		const pdfResponse = await fetch(
			`${stirlingPdfUrl}/api/v1/misc/html-to-pdf`,
			{
				method: "POST",
				body: formData,
				signal: AbortSignal.timeout(30_000),
			},
		);

		if (!pdfResponse.ok) {
			const errorText = await pdfResponse
				.text()
				.catch(() => pdfResponse.statusText);
			captureWebhookError(new Error("StirlingPDF non-OK response"), {
				message: "StirlingPDF non-OK response",
				status: pdfResponse.status,
				err_text: errorText,
			});
			return errorResponse(req, 502, new Error("PDF generation failed"), {
				action: "generate_pdf",
			});
		}

		const pdfBlob = await pdfResponse.arrayBuffer();
		return new Response(pdfBlob, {
			status: 200,
			headers: {
				...getCorsHeaders(req),
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		const isTimeout =
			message.includes("timed out") || message.includes("TimeoutError");
		if (isTimeout) {
			return new Response(
				JSON.stringify({ error: "PDF generation timed out" }),
				{ status: 504, headers: getJsonHeaders(req) },
			);
		}
		return errorResponse(req, 500, err, { action: "generate_pdf" });
	}
}

// The handler registers Deno.serve() as a module side-effect (like every edge fn
// in this repo). The unit test sets DENO_TEST_NO_SERVE=1 and dynamic-imports this
// module, driving handleRequest() directly, so no real listener binds during
// `deno test`. In prod the var is never set, so Deno.serve always runs.
if (!Deno.env.get("DENO_TEST_NO_SERVE")) {
	Deno.serve((req: Request) => handleRequest(req));
}
