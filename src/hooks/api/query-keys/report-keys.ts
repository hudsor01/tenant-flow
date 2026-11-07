import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { downloadBlob } from "#lib/reports/download-blob";
import { jsonArrayOrEmpty } from "#lib/rpc-shape";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { ApiErrorCode, createApiErrorFromResponse } from "#lib/utils/api-error";
import type { RevenueData } from "#types/reports";
import { FINANCIAL_ANALYTICS_REPORT_TYPE } from "../../../../supabase/functions/_shared/financial-analytics-report";
import {
	TAX_DOCUMENTS_REPORT_TYPE,
	taxYearReportFilename,
	YEAR_END_REPORT_TYPE,
} from "../../../../supabase/functions/_shared/tax-year-reports";
import { mutationKeys } from "../mutation-keys";

export const reportKeys = {
	all: ["reports"] as const,
	revenue: (months: number) =>
		[...reportKeys.all, "revenue", "monthly", months] as const,
	occupancyMetrics: () =>
		[...reportKeys.all, "analytics", "occupancy"] as const,
	financial: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, "financial", start_date, end_date] as const,
	properties: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, "properties", start_date, end_date] as const,
	tenants: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, "tenants", start_date, end_date] as const,
	maintenance: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, "maintenance", start_date, end_date] as const,
	yearEnd: (year: number) => [...reportKeys.all, "year-end", year] as const,
};

export const reportQueries = {
	monthlyRevenue: (months: number = 12) =>
		queryOptions({
			queryKey: reportKeys.revenue(months),
			queryFn: async (): Promise<RevenueData[]> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) return [];
				// Each month's scheduled rent, all the executive report prints. Its
				// expenses and profit (a join with get_expense_summary's
				// monthly_totals) were read by no report and went in 66.2-39.
				const { data, error } = await supabase.rpc(
					"get_revenue_trends_optimized",
					{ p_user_id: user.id, p_months: months },
				);
				if (error) handlePostgrestError(error, "scheduled rent");
				return jsonArrayOrEmpty<Record<string, unknown>>(data).map(
					(row): RevenueData => ({
						month: String(row.month ?? ""),
						revenue: Number(row.revenue ?? 0),
					}),
				);
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),
};

/**
 * Thrown when the reports tier gate returns 402. Caller mutations detect this
 * via `instanceof PaywallError` to surface an upgrade CTA instead of a generic
 * error toast.
 */
export class PaywallError extends Error {
	readonly upgradeUrl: string;
	readonly feature: string;
	constructor(message: string, upgradeUrl: string, feature: string) {
		super(message);
		this.name = "PaywallError";
		this.upgradeUrl = upgradeUrl;
		this.feature = feature;
	}
}

async function parsePaywallResponse(
	response: Response,
	defaultFeature: string,
): Promise<PaywallError> {
	try {
		const body = (await response.json()) as {
			error?: string;
			upgrade_url?: string;
			upgrade_required?: boolean;
		};
		const url =
			typeof body.upgrade_url === "string"
				? body.upgrade_url
				: `/billing/plans?source=${defaultFeature}_gate`;
		const msg =
			typeof body.error === "string"
				? body.error
				: "This feature requires a Growth or Max subscription.";
		return new PaywallError(msg, url, defaultFeature);
	} catch {
		return new PaywallError(
			"This feature requires a Growth or Max subscription.",
			`/billing/plans?source=${defaultFeature}_gate`,
			defaultFeature,
		);
	}
}

/** The file formats `export-report` writes. */
export type ReportExportFormat = "csv" | "xlsx" | "pdf";

/**
 * Download one export from the `export-report` Edge Function, a GET whose
 * query string (`type`, `format`) is all the function reads; it builds the
 * file on the server. A 402 is its tier gate and becomes a PaywallError.
 *
 * `getUser()` (via `getCachedUser`) decides whether anyone is signed in; the
 * session is read only for its Bearer token. The browser cannot read the
 * response's Content-Disposition (it is not a CORS-safelisted header and the
 * function does not expose it), so the download is named here
 * `<type>-<UTC date>.<format>`, the name the function gives a
 * financial-analytics export.
 */
async function callExportEdgeFunction(
	reportType: string,
	format: ReportExportFormat,
): Promise<void> {
	const user = await getCachedUser();
	if (!user) throw new Error("You need to be signed in to export a report.");
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const token = session?.access_token;
	if (!token) throw new Error("You need to be signed in to export a report.");

	const params = new URLSearchParams({ type: reportType, format });
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(
		`${baseUrl}/functions/v1/export-report?${params.toString()}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);

	if (response.status === 402) {
		throw await parsePaywallResponse(response, "reports");
	}
	if (!response.ok) {
		throw createApiErrorFromResponse(
			response,
			ApiErrorCode.FINANCIAL_EXPORT_FAILED,
		);
	}

	const today = new Date().toISOString().slice(0, 10);
	downloadBlob(await response.blob(), `${reportType}-${today}.${format}`);
}

async function callGeneratePdfEdgeFunction(
	reportType: string,
	year: number,
): Promise<void> {
	const supabase = createClient();
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.access_token) throw new Error("Not authenticated");

	const filename = `${taxYearReportFilename(reportType, year)}.pdf`;
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(`${baseUrl}/functions/v1/generate-pdf`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${session.access_token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ reportType, year, filename }),
	});

	if (response.status === 402) {
		throw await parsePaywallResponse(response, "reports");
	}
	if (!response.ok) {
		throw createApiErrorFromResponse(
			response,
			ApiErrorCode.PDF_GENERATION_FAILED,
		);
	}

	downloadBlob(await response.blob(), filename);
}

export const reportMutations = {
	/** The /analytics/financial export: the page's figures, built server-side. */
	exportFinancialAnalytics: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.exportFinancialAnalytics,
			mutationFn: async (format: ReportExportFormat): Promise<void> => {
				await callExportEdgeFunction(FINANCIAL_ANALYTICS_REPORT_TYPE, format);
			},
		}),

	downloadYearEndPdf: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadYearEndPdf,
			mutationFn: async (year: number): Promise<void> => {
				await callGeneratePdfEdgeFunction(YEAR_END_REPORT_TYPE, year);
			},
		}),

	downloadTaxDocumentPdf: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadTaxDocumentPdf,
			mutationFn: async (year: number): Promise<void> => {
				await callGeneratePdfEdgeFunction(TAX_DOCUMENTS_REPORT_TYPE, year);
			},
		}),
};
