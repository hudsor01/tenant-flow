// Supabase Edge Function: export-report
// GET /functions/v1/export-report?type=<report type>&format=<csv|xlsx|pdf>[&year=YYYY]
// Reads only the query string; a request body is ignored. `type` is required
// and names one of the reports below; `format` defaults to csv. Any other
// type, any other format, or a year that is not four digits, is a 400.
// Every type holds its page's figures: `financial-analytics` is
// /analytics/financial (`_shared/financial-analytics-report.ts`); `year-end`,
// `1099` and `financial` are /reports/year-end, its 1099-NEC section and
// /reports/tax-documents for the year asked for (`_shared/tax-year-reports.ts`).
// Formats: csv (`_shared/report-csv.ts`), xlsx (a real workbook,
// `_shared/report-xlsx.ts`), pdf (HTML delegated to the generate-pdf Edge
// Function, StirlingPDF).
// Authenticates via JWT bearer token, no anon access. Premium report types
// return 402 with `upgrade_url` below Growth (`_shared/tier-gate.ts`).
// Every RPC error is a 500 (`errorResponse`), never an empty export.

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
	type FinancialAnalyticsTable,
	loadFinancialAnalyticsSources,
} from "../_shared/financial-analytics-report.ts";
import { tableToCsv } from "../_shared/report-csv.ts";
import { sectionedReportHtml } from "../_shared/report-html.ts";
import { reportTableToXlsx, XLSX_MIME_TYPE } from "../_shared/report-xlsx.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import {
	buildTaxYearReport,
	expenseVendorLabel,
	loadTaxYearSources,
	propertyReportName,
	TAX_YEAR_REPORT_TYPES,
	taxYearReportFilename,
} from "../_shared/tax-year-reports.ts";
import {
	checkTierEntitlement,
	GROWTH_AND_MAX_PLANS,
} from "../_shared/tier-gate.ts";

// Report types gated behind Growth/Max (REQ-46-02): tax prep, year-end and
// the financial analytics export. Every type this function builds is one of
// them; the set stays separate from REPORT_TYPES so a free type added later
// is ungated only by choice.
const PREMIUM_REPORT_TYPES: ReadonlySet<string> = new Set([
	"year-end",
	"1099",
	"financial",
	"financial-analytics",
]);

/** The report types this function builds; any other is a 400. */
const REPORT_TYPES: readonly string[] = [
	FINANCIAL_ANALYTICS_REPORT_TYPE,
	...TAX_YEAR_REPORT_TYPES,
];

type ExportFormat = "csv" | "xlsx" | "pdf";

function isExportFormat(value: string): value is ExportFormat {
	return value === "csv" || value === "xlsx" || value === "pdf";
}

const CSV_MIME_TYPE = "text/csv; charset=utf-8";

/** Injectable dependencies for `deno test` (mirrors lease-signature). */
export interface ExportReportDeps {
	createClient?: (url: string, key: string) => SupabaseClient;
	now?: () => Date;
}

/** One report, ready to write in any format. */
interface ReportContent {
	readonly title: string;
	readonly filename: string;
	readonly table: FinancialAnalyticsTable;
}

function fileHeaders(
	req: Request,
	contentType: string,
	filename: string,
): Record<string, string> {
	return {
		...getCorsHeaders(req),
		"Content-Type": contentType,
		// For a direct (non-browser) client: a cross-origin browser fetch cannot
		// read this header (it is not CORS-safelisted and is not exposed).
		"Content-Disposition": `attachment; filename="${filename}"`,
	};
}

function rpcErrorResponse(req: Request, rpc: string, error: unknown): Response {
	return errorResponse(req, 500, error, {
		action: "export_report_rpc",
		rpc,
	});
}

/** Core request handler, exported so the Deno test drives it directly. */
export async function handleRequest(
	req: Request,
	deps: ExportReportDeps = {},
): Promise<Response> {
	const optionsResponse = handleCorsOptions(req);
	if (optionsResponse) return optionsResponse;

	let env: Record<string, string>;
	try {
		env = validateEnv({
			required: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "env_validation" });
	}

	try {
		// Authenticate
		const supabaseUrl = env.SUPABASE_URL;
		const makeClient = deps.createClient ?? createAdminClient;
		const supabase = makeClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);

		const auth = await validateBearerAuth(req, supabase);
		if ("error" in auth) {
			return new Response(JSON.stringify({ error: auth.error }), {
				status: auth.status,
				headers: getJsonHeaders(req),
			});
		}
		const { user, token } = auth;
		const now = (deps.now ?? (() => new Date()))();

		const url = new URL(req.url);
		const reportType = url.searchParams.get("type");
		const format = url.searchParams.get("format") ?? "csv";
		const yearParam = url.searchParams.get("year");
		if (reportType === null || !REPORT_TYPES.includes(reportType)) {
			return new Response(
				JSON.stringify({
					error: `type must be one of: ${REPORT_TYPES.join(", ")}`,
				}),
				{ status: 400, headers: getJsonHeaders(req) },
			);
		}
		if (!isExportFormat(format)) {
			return new Response(
				JSON.stringify({ error: "format must be csv, xlsx or pdf" }),
				{ status: 400, headers: getJsonHeaders(req) },
			);
		}
		if (yearParam !== null && !/^\d{4}$/.test(yearParam)) {
			return new Response(
				JSON.stringify({ error: "year must be a four-digit year" }),
				{ status: 400, headers: getJsonHeaders(req) },
			);
		}
		const year = yearParam === null ? now.getUTCFullYear() : Number(yearParam);

		// REQ-46-01: gate premium report types behind Growth/Max tier.
		// Returns 402 with upgrade_url on the free tier; records a row in
		// public.gate_events so admin analytics can attribute conversions.
		if (PREMIUM_REPORT_TYPES.has(reportType)) {
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

		const today = now.toISOString().slice(0, 10);
		let content: ReportContent;
		if (reportType === FINANCIAL_ANALYTICS_REPORT_TYPE) {
			const load = await loadFinancialAnalyticsSources(
				(name, args) => supabase.rpc(name, args),
				user.id,
			);
			if (!load.ok) return rpcErrorResponse(req, load.rpc, load.error);
			content = {
				title: "Financial Analytics",
				filename: `${FINANCIAL_ANALYTICS_REPORT_TYPE}-${today}`,
				table: buildFinancialAnalyticsTable(
						load.sources,
						propertyReportName,
						expenseVendorLabel,
					),
			};
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
				reportType,
				user.id,
				year,
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
			if (!load.ok) return rpcErrorResponse(req, load.rpc, load.error);
			const report = buildTaxYearReport(reportType, load.sources, year);
			content = {
				title: report.title,
				filename: taxYearReportFilename(reportType, year),
				table: report.table,
			};
		}

		// PDF format: delegate to generate-pdf Edge Function (StirlingPDF on k3s)
		if (format === "pdf") {
			const generatePdfUrl = `${supabaseUrl}/functions/v1/generate-pdf`;

			const pdfResponse = await fetch(generatePdfUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					html: sectionedReportHtml(content.title, today, content.table),
					filename: `${content.filename}.pdf`,
				}),
			});

			if (!pdfResponse.ok) {
				const errText = await pdfResponse
					.text()
					.catch(() => pdfResponse.statusText);
				captureWebhookError(new Error("PDF generation failed"), {
					message: "[export-report] PDF generation failed",
					err_text: errText,
					status: pdfResponse.status,
				});
				return errorResponse(req, 502, new Error("PDF generation failed"), {
					action: "export_report_pdf",
				});
			}

			const pdfBlob = await pdfResponse.arrayBuffer();
			return new Response(pdfBlob, {
				status: 200,
				headers: fileHeaders(req, "application/pdf", `${content.filename}.pdf`),
			});
		}

		if (format === "xlsx") {
			const workbook = reportTableToXlsx(content.title, content.table);
			return new Response(workbook, {
				status: 200,
				headers: fileHeaders(req, XLSX_MIME_TYPE, `${content.filename}.xlsx`),
			});
		}

		return new Response(tableToCsv(content.table.header, content.table.rows), {
			status: 200,
			headers: fileHeaders(req, CSV_MIME_TYPE, `${content.filename}.csv`),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "export_report" });
	}
}

// The handler registers Deno.serve() as a module side-effect (like every edge fn
// in this repo). The unit test sets DENO_TEST_NO_SERVE=1 and dynamic-imports this
// module, driving handleRequest() directly, so no real listener binds during
// `deno test`. In prod the var is never set, so Deno.serve always runs.
if (!Deno.env.get("DENO_TEST_NO_SERVE")) {
	Deno.serve((req: Request) => handleRequest(req));
}
