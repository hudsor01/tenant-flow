/**
 * Excel writer for ReportData. Uses SheetJS (xlsx).
 *
 * Layout: one worksheet per section. Summary rows render as 2-column
 * (Metric / Value); table sections render with header + body rows.
 */

import * as XLSX from "xlsx";
import type { ReportData, ReportSection } from "./report-data";

function buildCoverSheetData(report: ReportData): Array<Array<string>> {
	return [
		[report.title],
		[report.subtitle],
		[`Generated: ${new Date(report.generatedAt).toLocaleString("en-US")}`],
		[],
		["Section", "Type", "Rows"],
		...report.sections.map((s) => [
			s.heading,
			s.table ? "Table" : s.rows ? "Summary" : "Note",
			s.table
				? String(s.table.rows.length)
				: s.rows
					? String(s.rows.length)
					: "0",
		]),
	];
}

function buildSectionSheetData(
	section: ReportSection,
): Array<Array<string | number>> {
	const sheetData: Array<Array<string | number>> = [[section.heading], []];

	if (section.rows && section.rows.length > 0) {
		sheetData.push(["Metric", "Value"]);
		for (const row of section.rows) {
			sheetData.push([row.label, row.value]);
		}
	}

	if (section.table) {
		if (section.rows && section.rows.length > 0) sheetData.push([]);
		sheetData.push(section.table.headers);
		if (section.table.rows.length === 0) {
			sheetData.push(["No data for the selected period."]);
		} else {
			for (const row of section.table.rows) {
				sheetData.push(row);
			}
		}
	}

	if (section.note) {
		sheetData.push([]);
		sheetData.push([`Note: ${section.note}`]);
	}

	return sheetData;
}

export function generateExcelBlob(report: ReportData): Blob {
	const workbook = XLSX.utils.book_new();

	const coverSheet = XLSX.utils.aoa_to_sheet(buildCoverSheetData(report));
	coverSheet["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 8 }];
	XLSX.utils.book_append_sheet(workbook, coverSheet, "Cover");

	for (const section of report.sections) {
		const sheetData = buildSectionSheetData(section);
		const sheet = XLSX.utils.aoa_to_sheet(sheetData);
		sheet["!cols"] = computeColumnWidths(sheetData);
		XLSX.utils.book_append_sheet(
			workbook,
			sheet,
			sanitizeSheetName(section.heading),
		);
	}

	const arrayBuffer = XLSX.write(workbook, {
		bookType: "xlsx",
		type: "array",
	}) as ArrayBuffer;
	return new Blob([arrayBuffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
}

function sanitizeSheetName(name: string): string {
	// Excel sheet name limit: 31 chars, no [ ] : * ? / \
	return name.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "Sheet";
}

function computeColumnWidths(
	data: Array<Array<string | number>>,
): Array<{ wch: number }> {
	const widths: number[] = [];
	for (const row of data) {
		row.forEach((cell, i) => {
			const len = String(cell ?? "").length;
			if (!widths[i] || widths[i] < len) {
				widths[i] = len;
			}
		});
	}
	return widths.map((w) => ({ wch: Math.min(Math.max(w + 2, 10), 50) }));
}
