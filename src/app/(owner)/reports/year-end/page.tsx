"use client";

import { ChevronLeft, Download, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { YearEndReportSection } from "#components/reports/sections/year-end-report-section";
import { yearEndUnavailableReason } from "#components/reports/sections/year-end-report-section-utils";
import { UNAVAILABLE_OUTLINE_BUTTON_CLASSES } from "#components/shared/unavailable-outline-button";
import { Button } from "#components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { useDownloadYearEndPdf } from "#hooks/api/use-report-mutations";
import { useYearEndSummary } from "#hooks/api/use-reports";
import { handleMutationError } from "#lib/mutation-error-handler";
import { CSV_MIME_TYPE } from "#lib/reports/csv";
import { downloadBlob } from "#lib/reports/download-blob";
import { cn } from "#lib/utils";
import { buildYearEndCsv } from "./year-end-csv";

function buildYearOptions(): number[] {
	const currentYear = new Date().getFullYear();
	const years: number[] = [];
	for (let y = currentYear; y >= currentYear - 5; y--) {
		years.push(y);
	}
	return years;
}

function downloadCsv(csv: string, filename: string) {
	downloadBlob(new Blob([csv], { type: CSV_MIME_TYPE }), filename);
}

export default function YearEndReportsPage() {
	const years = buildYearOptions();
	const [selectedYear, setSelectedYear] = useState<number>(
		years[0] ?? new Date().getFullYear(),
	);
	const [isExportingYearEnd, setIsExportingYearEnd] = useState(false);

	const { data: yearEndResult, isLoading: isLoadingYearEnd } =
		useYearEndSummary(selectedYear);
	// null-free: when the server cannot report the year's rent received yet
	// (get_billing_insights before 20261110123114, or
	// get_property_performance_analytics before 20261110123116), the section
	// says so and both downloads stay off.
	const yearEndResponse =
		yearEndResult?.status === "ready" ? yearEndResult.summary : undefined;

	const downloadPdfMutation = useDownloadYearEndPdf();

	const hasData =
		yearEndResponse &&
		(yearEndResponse.rentReceived !== 0 ||
			yearEndResponse.operatingExpenses > 0 ||
			yearEndResponse.byProperty.length > 0);

	// Why Download PDF is off: the year's reason, or a year with nothing
	// recorded (OD-12). The click is ignored while it is off, while the year
	// loads, and while a PDF generates.
	const pdfUnavailableReason =
		yearEndUnavailableReason({
			year: selectedYear,
			yearEndData: yearEndResponse,
			ledgerUnavailable: yearEndResult?.status === "ledger-unavailable",
			isLoadingYearEnd,
		}) ??
		(!isLoadingYearEnd && !hasData
			? `No rent received or expenses recorded for ${selectedYear}.`
			: null);
	const pdfBlocked =
		isLoadingYearEnd ||
		downloadPdfMutation.isPending ||
		pdfUnavailableReason !== null;
	const pdfReasonId = useId();

	const handleDownloadYearEndCsv = () => {
		if (!yearEndResponse) return;
		setIsExportingYearEnd(true);
		try {
			downloadCsv(
				buildYearEndCsv(yearEndResponse),
				`year-end-${selectedYear}.csv`,
			);
		} catch (error) {
			handleMutationError(
				error,
				"Export year-end CSV",
				"Couldn't export the year-end report. Please try again.",
			);
		} finally {
			setIsExportingYearEnd(false);
		}
	};

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<Button
						asChild
						variant="ghost"
						size="sm"
						className="gap-1.5 min-h-11"
					>
						<Link href="/reports">
							<ChevronLeft className="size-4" />
							Reports
						</Link>
					</Button>
					<div>
						<h1 className="text-2xl font-semibold flex items-center gap-2">
							<FileText className="size-6 text-primary" />
							Year-End Reports
						</h1>
						<p className="mb-0 text-sm text-muted-foreground">
							Rent received, expenses and net income for a tax year, by property
							and by vendor.
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={String(selectedYear)}
						onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
					>
						<SelectTrigger
							className="w-32 h-11"
							aria-label={`${selectedYear} (year)`}
						>
							<SelectValue placeholder="Year" />
						</SelectTrigger>
						<SelectContent>
							{years.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						variant="outline"
						size="sm"
						className={cn(
							"gap-1.5 min-h-11",
							UNAVAILABLE_OUTLINE_BUTTON_CLASSES,
						)}
						onClick={
							pdfBlocked
								? undefined
								: () => downloadPdfMutation.mutate(selectedYear)
						}
						aria-disabled={pdfBlocked || undefined}
						aria-describedby={
							pdfUnavailableReason !== null ? pdfReasonId : undefined
						}
						aria-label={
							downloadPdfMutation.isPending
								? "Generating..."
								: "Download PDF of the year-end report"
						}
					>
						{downloadPdfMutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Download className="size-4" />
						)}
						{downloadPdfMutation.isPending ? "Generating..." : "Download PDF"}
					</Button>
					{pdfUnavailableReason !== null ? (
						<span id={pdfReasonId} className="sr-only">
							{pdfUnavailableReason}
						</span>
					) : null}
				</div>
			</div>

			<div className="max-w-5xl">
				<YearEndReportSection
					year={selectedYear}
					yearEndData={yearEndResponse}
					ledgerUnavailable={yearEndResult?.status === "ledger-unavailable"}
					isLoadingYearEnd={isLoadingYearEnd}
					onDownloadYearEndCsv={handleDownloadYearEndCsv}
					isExportingYearEnd={isExportingYearEnd}
				/>
			</div>
		</div>
	);
}
