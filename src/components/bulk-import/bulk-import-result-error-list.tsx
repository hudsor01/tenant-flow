"use client";

import { Download, RotateCcw } from "lucide-react";
import { Button } from "#components/ui/button";
import type { ParsedRow } from "#types/api-contracts";
import { buildCsvTemplate, triggerCsvDownload } from "./parse-csv-with-schema";

// Papa's header mode leaves the fields a short row lacks off its object, and
// puts the cells past the header row under `__parsed_extra` (an array).
const PAPA_EXTRA_FIELDS_KEY = "__parsed_extra";

// Fall through to the synthetic `row,error` shape when parseResult is
// missing OR every error is a synthetic `row: 0` entry from the mutation's
// onError handler. Otherwise emit the original-headers shape so users can
// fix in Excel and re-upload. The headers are every parsed row's keys in
// first-seen order: the first row's keys alone dropped, from every row, any
// column the first row was short of.
export function buildFailedRowsCsv(
	errors: Array<{ row: number; error: string }>,
	parseResult: {
		rows: ParsedRow<unknown>[];
		tooManyRows: boolean;
		totalRowCount: number;
	} | null,
): string {
	const allSynthetic = errors.every((e) => e.row === 0);
	if (!parseResult || allSynthetic) {
		const header = '"row","error"';
		const body = errors
			.map((e) => `"${e.row}","${e.error.replace(/"/g, '""')}"`)
			.join("\n");
		return `${header}\n${body}\n`;
	}
	const originalHeaders = [
		...new Set(parseResult.rows.flatMap((r) => Object.keys(r.data))),
	].filter((key) => key !== PAPA_EXTRA_FIELDS_KEY);
	const headerRow = [...originalHeaders, "_error"];
	const errorByLine = new Map(errors.map((e) => [e.row, e.error]));
	const dataRows = parseResult.rows
		.filter((r) => errorByLine.has(r.row))
		.map((r) => {
			const cells = originalHeaders.map((h) => r.data[h] ?? "");
			cells.push(errorByLine.get(r.row) ?? "");
			return cells;
		});
	return buildCsvTemplate(headerRow, dataRows);
}

interface ResultErrorListProps {
	errors: Array<{ row: number; error: string }>;
	parseResult: {
		rows: ParsedRow<unknown>[];
		tooManyRows: boolean;
		totalRowCount: number;
	} | null;
	onRetryFailed?: () => void;
}

export function ResultErrorList({
	errors,
	parseResult,
	onRetryFailed,
}: ResultErrorListProps) {
	// Synthetic onError result populates a single `row: 0` entry. There's
	// no real CSV row to retry, so hide the retry button — clicking it
	// would be a silent no-op (handleRetryFailed filters by csvLine and
	// finds nothing).
	const isSyntheticError = errors.every((e) => e.row === 0);
	const downloadFailedRowsCsv = () => {
		triggerCsvDownload(
			buildFailedRowsCsv(errors, parseResult),
			"failed-rows.csv",
		);
	};

	return (
		<div className="space-y-2">
			<p className="text-sm font-semibold">Failed rows</p>
			<div className="card-standard max-h-56 overflow-y-auto">
				<ul className="divide-y divide-border/40 pl-0 mt-0 mb-0 [&>li]:mb-0 text-xs">
					{errors.map((err) => (
						<li key={err.row} className="px-3 py-2 flex items-start gap-2">
							<span className="font-mono text-muted-foreground shrink-0">
								{err.row === 0 ? "!" : `#${err.row}`}
							</span>
							<span className="text-destructive-text">{err.error}</span>
						</li>
					))}
				</ul>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					size="sm"
					variant="outline"
					onClick={downloadFailedRowsCsv}
					className="gap-2"
				>
					<Download className="size-3.5" />
					Download failed rows
				</Button>
				{onRetryFailed && !isSyntheticError && (
					<Button
						size="sm"
						variant="outline"
						onClick={onRetryFailed}
						className="gap-2"
					>
						<RotateCcw className="size-3.5" />
						Retry failed rows
					</Button>
				)}
			</div>
		</div>
	);
}
