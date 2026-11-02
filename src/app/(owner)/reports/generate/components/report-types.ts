import type { QueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
	Building2,
	FileSpreadsheet,
	FileText,
	TrendingUp,
	Wrench,
} from "lucide-react";
import { downloadBlob } from "#lib/reports/download-blob";
import { generateExcelBlob } from "#lib/reports/generate-excel";
import { generatePdfBlob } from "#lib/reports/generate-pdf";
import { buildReportData } from "#lib/reports/report-data";

export type ReportFormat = "pdf" | "excel";
export type ReportType =
	| "executive-monthly"
	| "financial-performance"
	| "property-portfolio"
	| "lease-portfolio"
	| "maintenance-operations"
	| "tax-preparation";

export interface ReportCard {
	id: ReportType;
	title: string;
	description: string;
	icon: LucideIcon;
	formats: ReportFormat[];
	category: "executive" | "financial" | "operations";
	/**
	 * Set when the report's RPCs take no dates: it is to date, the page's
	 * Report Period does not apply to it, and the card says why. The file is
	 * named and headed to date, never with the period.
	 */
	toDateReason?: string;
}

export const reportCards: ReportCard[] = [
	{
		id: "executive-monthly",
		title: "Executive Monthly Report",
		description:
			"Comprehensive monthly summary for leadership with key metrics and trends",
		icon: FileText,
		formats: ["pdf", "excel"],
		category: "executive",
	},
	{
		id: "financial-performance",
		title: "Financial Performance",
		description:
			"Rent and fees charged, expenses, net income and cash flow for the period, with the charges by type and the expense categories",
		icon: TrendingUp,
		formats: ["pdf", "excel"],
		category: "financial",
	},
	{
		id: "property-portfolio",
		title: "Property Portfolio",
		description:
			"Each property's rent received, expenses and net income for the period, with occupancy today",
		icon: Building2,
		formats: ["pdf", "excel"],
		category: "operations",
	},
	{
		id: "lease-portfolio",
		title: "Lease Portfolio",
		description: "Tenants, active leases and leases ending within 30 days",
		icon: FileText,
		formats: ["pdf", "excel"],
		category: "financial",
		toDateReason:
			"Covers your leases as of today; the report period doesn't apply.",
	},
	{
		id: "maintenance-operations",
		title: "Maintenance Operations",
		description:
			"Requests by status and priority, resolution time, and spend by month and vendor",
		icon: Wrench,
		formats: ["pdf", "excel"],
		category: "operations",
		toDateReason:
			"Covers every request to date; the report period doesn't apply.",
	},
	{
		id: "tax-preparation",
		title: "Tax Preparation",
		description:
			"Rent received, expenses and net income for the tax year, by property (Excel only)",
		icon: FileSpreadsheet,
		formats: ["excel"],
		category: "financial",
	},
];

// Client-side report generation. Pulls data via the existing
// reportAnalyticsQueries factories using `queryClient.query()` (cache-
// aware), shapes into a generic `ReportData` payload, renders to PDF
// (jspdf + jspdf-autotable) or XLSX (sheetjs), and triggers an immediate
// browser download. No backend or Edge Function dependency — runs entirely
// in the user's tab against authenticated PostgREST RPCs.
export const reportsClient = {
	generateReport: async (
		reportType: ReportType,
		// Auth derives via `getCachedUser()` inside the per-RPC fetchers
		// `buildReportData` consumes — `user_id` deliberately omitted here.
		// Callers should still gate on auth as a UX check before invoking.
		params: {
			start_date: string;
			end_date: string;
			format: ReportFormat;
		},
		queryClient: QueryClient,
	): Promise<void> => {
		const data = await buildReportData(
			reportType,
			queryClient,
			params.start_date,
			params.end_date,
		);

		const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
		// A report with no period is named to date, never with the period.
		const toDate = reportCards.some(
			(card) => card.id === reportType && card.toDateReason !== undefined,
		);
		const baseFilename = toDate
			? `${reportType}_to_${params.end_date}_${stamp}`
			: `${reportType}_${params.start_date}_${params.end_date}_${stamp}`;

		if (params.format === "pdf") {
			const blob = generatePdfBlob(data);
			downloadBlob(blob, `${baseFilename}.pdf`);
		} else {
			const blob = generateExcelBlob(data);
			downloadBlob(blob, `${baseFilename}.xlsx`);
		}
	},
};
