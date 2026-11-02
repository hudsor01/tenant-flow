import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { handlePostgrestError } from "#lib/postgrest-error-handler";
import { downloadBlob } from "#lib/reports/download-blob";
import { createClient } from "#lib/supabase/client";
import { getCachedUser } from "#lib/supabase/get-cached-user";
import { ApiErrorCode, createApiErrorFromResponse } from "#lib/utils/api-error";
import type {
	ListReportsResponse,
	Report as ReportType,
	RevenueData,
} from "#types/reports";
import { FINANCIAL_ANALYTICS_REPORT_TYPE } from "../../../../supabase/functions/_shared/financial-analytics-report";
import { mutationKeys } from "../mutation-keys";
import { fetchRevenueWithExpenses } from "./analytics-keys";

export const reportKeys = {
	all: ["reports"] as const,
	lists: () => [...reportKeys.all, "list"] as const,
	list: (offset: number, limit: number) =>
		[...reportKeys.lists(), offset, limit] as const,
	runs: (reportId: string) => [...reportKeys.all, "runs", reportId] as const,
	revenue: (months: number) =>
		[...reportKeys.all, "revenue", "monthly", months] as const,
	paymentAnalytics: (start_date?: string, end_date?: string) =>
		[...reportKeys.all, "analytics", "payments", start_date, end_date] as const,
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
	report1099: (year: number) => [...reportKeys.all, "1099", year] as const,
};

export const reportQueries = {
	all: () => reportKeys.all,

	list: (offset: number, limit: number = 20) =>
		queryOptions({
			queryKey: reportKeys.list(offset, limit),
			queryFn: async (): Promise<ListReportsResponse> => {
				const supabase = createClient();
				const user = await getCachedUser();
				if (!user) {
					return {
						success: true,
						data: [],
						pagination: { total: 0, limit, offset, hasMore: false },
					};
				}

				const { data, error, count } = await supabase
					.from("reports")
					.select("*", { count: "exact" })
					.eq("owner_user_id", user.id)
					.order("created_at", { ascending: false })
					.range(offset, offset + limit - 1);

				if (error) handlePostgrestError(error, "reports list");

				const total = count ?? 0;
				const reports: ReportType[] = (data ?? []).map((r) => ({
					id: r.id,
					user_id: r.owner_user_id,
					reportType: r.report_type,
					reportName: r.title,
					format: "pdf",
					status: r.is_active ? "active" : "inactive",
					fileUrl: null,
					filePath: null,
					fileSize: null,
					start_date: r.created_at ?? "",
					end_date: r.updated_at ?? r.created_at ?? "",
					metadata: {
						description: r.description,
						schedule_cron: r.schedule_cron,
						next_run_at: r.next_run_at,
					},
					errorMessage: null,
					created_at: r.created_at ?? "",
					updated_at: r.updated_at ?? r.created_at ?? "",
				}));

				return {
					success: true,
					data: reports,
					pagination: { total, limit, offset, hasMore: offset + limit < total },
				};
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
		}),

	runs: (reportId: string) =>
		queryOptions({
			queryKey: reportKeys.runs(reportId),
			queryFn: async () => {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("report_runs")
					.select(
						"id, report_id, execution_status, file_path, file_size, execution_time_ms, error_message, started_at, completed_at, created_at",
					)
					.eq("report_id", reportId)
					.order("created_at", { ascending: false })
					.limit(50);

				if (error) handlePostgrestError(error, "report runs");
				return data ?? [];
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			enabled: Boolean(reportId),
		}),

	monthlyRevenue: (months: number = 12) =>
		queryOptions({
			queryKey: reportKeys.revenue(months),
			queryFn: async (): Promise<RevenueData[]> => {
				const user = await getCachedUser();
				if (!user) return [];
				// get_revenue_trends_optimized is revenue-only; expenses/profit come
				// from the shared join with get_expense_summary.monthly_totals
				// (TYPE-06). Previously mapped phantom expenses/profit/count keys the
				// RPC never emits, so the Profit series flatlined at 0.
				const rows = await fetchRevenueWithExpenses(months);
				return rows.map(
					(row): RevenueData => ({
						month: row.month,
						revenue: row.revenue,
						expenses: row.expenses,
						profit: row.revenue - row.expenses,
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

	const filename = `${reportType}-${year}.pdf`;
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
		const errText = await response.text().catch(() => response.statusText);
		throw new Error(`PDF generation failed: ${errText}`);
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
				await callGeneratePdfEdgeFunction("year-end", year);
			},
		}),

	downloadTaxDocumentPdf: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadTaxDocumentPdf,
			mutationFn: async (year: number): Promise<void> => {
				await callGeneratePdfEdgeFunction("financial", year);
			},
		}),
};
