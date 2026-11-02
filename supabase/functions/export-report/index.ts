// Supabase Edge Function: export-report
// GET /functions/v1/export-report?type=<report type>&format=<csv|xlsx|pdf>[&year=YYYY]
// Reads only the query string; a request body is ignored. `format` defaults to
// csv and `type` to financial; any other format, or a year that is not four
// digits, is a 400.
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
import { escapeHtml } from "../_shared/escape-html.ts";
import {
	reportColumns,
	rowsToCsv,
	rowsToTable,
} from "../_shared/report-csv.ts";
import { reportTableToXlsx, XLSX_MIME_TYPE } from "../_shared/report-xlsx.ts";
import { createAdminClient } from "../_shared/supabase-client.ts";
import {
	checkTierEntitlement,
	GROWTH_AND_MAX_PLANS,
} from "../_shared/tier-gate.ts";

// Report types gated behind Growth/Max (REQ-46-02).
// Free-tier keeps basic reports (maintenance, default revenue trends) so the
// product is usable without upgrading; tax-prep + year-end reports require paid.
const PREMIUM_REPORT_TYPES: ReadonlySet<string> = new Set([
	"year-end",
	"1099",
	"financial",
	"income-statement",
	"cash-flow",
]);

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
	readonly header: readonly string[];
	readonly rows: readonly (readonly unknown[])[];
	readonly csv: string;
	readonly html: string;
}

type RowsResult =
	| { readonly ok: true; readonly rows: Record<string, unknown>[] }
	| { readonly ok: false; readonly rpc: string; readonly error: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * An RPC's JSON as report rows: an array's objects as they are (any other
 * element as `{ value }`), an object as one `{ metric, value }` row per key
 * (a nested value as its JSON text), and nothing for anything else.
 */
function flattenToRows(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) {
		return data.map((row: unknown) => (isRecord(row) ? row : { value: row }));
	}
	if (!isRecord(data)) return [];
	return Object.entries(data).map(([key, value]) => ({
		metric: key,
		value:
			value !== null && typeof value === "object"
				? JSON.stringify(value)
				: value,
	}));
}

// Branch by report type to the SAME RPCs, with the same arguments, as
// generate-pdf's Mode 1 `fetchReportRows`, so a report's CSV, XLSX and PDF
// hold the same figures. The year-end/financial overview is scoped to the
// requested year.
async function fetchReportRows(
	supabase: SupabaseClient,
	userId: string,
	reportType: string,
	year: number,
): Promise<RowsResult> {
	let rpc: string;
	let args: Record<string, string | number>;
	if (reportType === "year-end" || reportType === "financial") {
		rpc = "get_financial_overview";
		args = {
			p_user_id: userId,
			p_start_date: `${year}-01-01`,
			p_end_date: `${year}-12-31`,
		};
	} else if (reportType === "1099") {
		rpc = "get_billing_insights";
		args = { owner_id_param: userId };
	} else if (reportType === "maintenance") {
		rpc = "get_maintenance_analytics";
		args = { user_id: userId };
	} else {
		rpc = "get_revenue_trends_optimized";
		args = { p_user_id: userId, p_months: 12 };
	}
	const { data, error } = await supabase.rpc(rpc, args);
	if (error) return { ok: false, rpc, error };
	return { ok: true, rows: flattenToRows(data) };
}

function rowsReportFilename(reportType: string, year: number): string {
	if (reportType === "year-end" || reportType === "financial") {
		return `year-end-${year}`;
	}
	if (reportType === "1099") return `1099-vendors-${year}`;
	if (reportType === "maintenance") return `maintenance-report-${year}`;
	return `revenue-report-${year}`;
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
		const reportType = url.searchParams.get("type") ?? "financial";
		const format = url.searchParams.get("format") ?? "csv";
		const yearParam = url.searchParams.get("year");
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

		const result = await fetchReportRows(supabase, user.id, reportType, year);
		if (!result.ok) return rpcErrorResponse(req, result.rpc, result.error);
		const table = rowsToTable(result.rows);
		const content: ReportContent = {
			title: `${reportType.replace(/-/g, " ").toUpperCase()} REPORT ${year}`,
			filename: rowsReportFilename(reportType, year),
			header: table.header.length > 0 ? table.header : ["No data available"],
			rows: table.rows,
			csv: rowsToCsv(result.rows),
			html: buildReportHtml(result.rows, reportType, year),
		};

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
					html: content.html,
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
			const workbook = reportTableToXlsx(
				content.title,
				content.header,
				content.rows,
			);
			return new Response(workbook, {
				status: 200,
				headers: fileHeaders(req, XLSX_MIME_TYPE, `${content.filename}.xlsx`),
			});
		}

		return new Response(content.csv, {
			status: 200,
			headers: fileHeaders(req, CSV_MIME_TYPE, `${content.filename}.csv`),
		});
	} catch (err) {
		return errorResponse(req, 500, err, { action: "export_report" });
	}
}

function buildReportHtml(
	rows: Record<string, unknown>[],
	reportType: string,
	year: number,
): string {
	const title = escapeHtml(
		`${reportType.replace(/-/g, " ").toUpperCase()} REPORT — ${year}`,
	);
	const headers = reportColumns(rows);

	const tableRows = rows
		.map(
			(row) =>
				`<tr>${headers
					.map((h) => {
						const val = row[h];
						return `<td style="border:1px solid #ccc;padding:6px 10px;">${val === null || val === undefined ? "" : escapeHtml(String(val))}</td>`;
					})
					.join("")}</tr>`,
		)
		.join("");

	const headerCells = headers
		.map(
			(h) =>
				`<th style="border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left;">${escapeHtml(h)}</th>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;margin:32px;color:#222;">
  <h1 style="font-size:20px;margin-bottom:4px;">${title}</h1>
  <p style="color:#666;margin-bottom:16px;">Generated: ${new Date().toLocaleDateString()}</p>
  ${
		rows.length === 0
			? "<p>No data available for this report.</p>"
			: `<table style="border-collapse:collapse;width:100%;font-size:13px;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`
	}
</body>
</html>`;
}

// The handler registers Deno.serve() as a module side-effect (like every edge fn
// in this repo). The unit test sets DENO_TEST_NO_SERVE=1 and dynamic-imports this
// module, driving handleRequest() directly, so no real listener binds during
// `deno test`. In prod the var is never set, so Deno.serve always runs.
if (!Deno.env.get("DENO_TEST_NO_SERVE")) {
	Deno.serve((req: Request) => handleRequest(req));
}
