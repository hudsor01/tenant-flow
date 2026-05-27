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
			"Detailed P&L, NOI by property, and expense breakdown with monthly trends",
		icon: TrendingUp,
		formats: ["pdf", "excel"],
		category: "financial",
	},
	{
		id: "property-portfolio",
		title: "Property Portfolio",
		description:
			"Portfolio analysis with property rankings, occupancy metrics, and vacancy analysis",
		icon: Building2,
		formats: ["pdf", "excel"],
		category: "operations",
	},
	{
		id: "lease-portfolio",
		title: "Lease Portfolio",
		description:
			"Lease analytics including profitability scores, lifecycle trends, and status breakdown",
		icon: FileText,
		formats: ["pdf", "excel"],
		category: "financial",
	},
	{
		id: "maintenance-operations",
		title: "Maintenance Operations",
		description:
			"Operations metrics with response times, cost breakdown, and urgency analysis",
		icon: Wrench,
		formats: ["pdf", "excel"],
		category: "operations",
	},
	{
		id: "tax-preparation",
		title: "Tax Preparation",
		description:
			"Tax-ready report with Schedule E codes and depreciation calculations (Excel only)",
		icon: FileSpreadsheet,
		formats: ["excel"],
		category: "financial",
	},
];

// Client-side report generation. Pulls data via the existing
// reportAnalyticsQueries factories using `queryClient.fetchQuery()` (cache-
// aware), shapes into a generic `ReportData` payload, renders to PDF
// (jspdf + jspdf-autotable) or XLSX (sheetjs), and triggers an immediate
// browser download. No backend or Edge Function dependency — runs entirely
// in the user's tab against authenticated PostgREST RPCs.
export const reportsClient = {
	generateReport: async (
		reportType: ReportType,
		params: {
			user_id: string;
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
		const baseFilename = `${reportType}_${params.start_date}_${params.end_date}_${stamp}`;

		if (params.format === "pdf") {
			const blob = generatePdfBlob(data);
			downloadBlob(blob, `${baseFilename}.pdf`);
		} else {
			const blob = generateExcelBlob(data);
			downloadBlob(blob, `${baseFilename}.xlsx`);
		}
	},
};
