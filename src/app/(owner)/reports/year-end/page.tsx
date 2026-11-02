"use client";

import { ChevronLeft, Download, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { YearEndReportSection } from "#components/reports/sections/year-end-report-section";
import { Button } from "#components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { useDownloadYearEndPdf } from "#hooks/api/use-report-mutations";
import {
	useReport1099Summary,
	useYearEndSummary,
} from "#hooks/api/use-reports";
import { handleMutationError } from "#lib/mutation-error-handler";
import { CSV_MIME_TYPE } from "#lib/reports/csv";
import { downloadBlob } from "#lib/reports/download-blob";
import { build1099Csv, buildYearEndCsv } from "./year-end-csv";

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
	const [isExporting1099, setIsExporting1099] = useState(false);

	const { data: yearEndResponse, isLoading: isLoadingYearEnd } =
		useYearEndSummary(selectedYear);
	const { data: data1099Response, isLoading: isLoading1099 } =
		useReport1099Summary(selectedYear);

	const downloadPdfMutation = useDownloadYearEndPdf();

	const hasData =
		yearEndResponse &&
		(yearEndResponse.grossRentalIncome > 0 ||
			yearEndResponse.operatingExpenses > 0 ||
			yearEndResponse.byProperty.length > 0);

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

	const handleDownload1099Csv = () => {
		if (!data1099Response) return;
		setIsExporting1099(true);
		try {
			downloadCsv(
				build1099Csv(data1099Response, selectedYear),
				`1099-${selectedYear}.csv`,
			);
		} catch (error) {
			handleMutationError(
				error,
				"Export 1099 CSV",
				"Couldn't export the 1099 summary. Please try again.",
			);
		} finally {
			setIsExporting1099(false);
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
						<p className="text-sm text-muted-foreground">
							Annual income, expenses, and 1099-NEC vendor data for tax
							preparation
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
						className="gap-1.5 min-h-11"
						onClick={() => downloadPdfMutation.mutate(selectedYear)}
						disabled={
							downloadPdfMutation.isPending || isLoadingYearEnd || !hasData
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
				</div>
			</div>

			<div className="max-w-5xl">
				<YearEndReportSection
					year={selectedYear}
					yearEndData={yearEndResponse}
					data1099={data1099Response}
					isLoadingYearEnd={isLoadingYearEnd}
					isLoading1099={isLoading1099}
					onDownloadYearEndCsv={handleDownloadYearEndCsv}
					onDownload1099Csv={handleDownload1099Csv}
					isExportingYearEnd={isExportingYearEnd}
					isExporting1099={isExporting1099}
				/>
			</div>
		</div>
	);
}
