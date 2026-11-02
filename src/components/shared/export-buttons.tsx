"use client";

/**
 * The /analytics/financial export controls: one button per file format. Each
 * click asks the export-report Edge Function for that format; the function
 * builds the file from the same RPCs the page renders, so the file holds the
 * page's figures. While one export runs, every button is disabled and the
 * clicked one reads "Exporting…".
 */

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "#components/ui/button";
import type { ReportExportFormat } from "#hooks/api/query-keys/report-keys";
import {
	EXPORT_FORMAT_LABELS,
	useExportFinancialAnalytics,
} from "#hooks/api/use-report-mutations";

const EXPORT_BUTTONS: readonly {
	format: ReportExportFormat;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ format: "xlsx", icon: FileSpreadsheet },
	{ format: "pdf", icon: FileText },
	{ format: "csv", icon: Download },
];

export function ExportButtons() {
	const exportMutation = useExportFinancialAnalytics();
	const pendingFormat = exportMutation.isPending
		? exportMutation.variables
		: undefined;

	return (
		<div className="flex flex-wrap gap-2">
			{EXPORT_BUTTONS.map(({ format, icon: Icon }) => (
				<Button
					key={format}
					variant="outline"
					size="sm"
					onClick={() => exportMutation.mutate(format)}
					disabled={exportMutation.isPending}
				>
					<Icon className="mr-2 size-4" />
					{pendingFormat === format
						? "Exporting…"
						: `Export ${EXPORT_FORMAT_LABELS[format]}`}
				</Button>
			))}
		</div>
	);
}
