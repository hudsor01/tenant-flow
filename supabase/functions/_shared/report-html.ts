/**
 * A sectioned report table as the HTML document StirlingPDF renders to a PDF.
 *
 * The table's first column names the row's section (`FinancialAnalyticsTable`).
 * Each run of rows with the same section becomes a heading and a table of its
 * own, and a section's table keeps only the columns that hold a value in that
 * section, so the Overview prints Item and Value while Revenue & Expenses
 * prints Item, Revenue, Expenses and Net Income. Each cell prints as its
 * format says (`formatReportCell`: `$61,200.00`, `49.1%`, text as it is), a
 * money or percentage cell is right-aligned, as the pages align their
 * amounts, and so is a column header whose cells all are. Every value is
 * escaped.
 *
 * Callers: `export-report/index.ts` (the `pdf` format of every report type,
 * posted to generate-pdf as Mode 2 HTML) and `generate-pdf/index.ts` (Mode 1),
 * so both paths print the same document.
 */

import { escapeHtml } from "./escape-html.ts";
import type {
	FinancialAnalyticsTable,
	ReportCell,
	ReportCellFormat,
} from "./financial-analytics-report.ts";
import { formatReportCell } from "./report-format.ts";

interface SectionRow {
	readonly cells: readonly ReportCell[];
	readonly formats: readonly ReportCellFormat[];
}

interface Section {
	readonly title: string;
	readonly rows: SectionRow[];
}

function cellText(value: ReportCell | undefined): string {
	return value === null || value === undefined ? "" : String(value);
}

function isNumeric(format: ReportCellFormat | undefined): boolean {
	return format === "money" || format === "percent";
}

function sections(table: FinancialAnalyticsTable): Section[] {
	const out: Section[] = [];
	for (const [index, cells] of table.rows.entries()) {
		const formats = table.formats[index];
		if (!formats || formats.length !== cells.length) {
			throw new Error(`report row ${index} has no format for every cell`);
		}
		const row = { cells, formats };
		const title = cellText(cells[0]);
		const last = out[out.length - 1];
		if (last && last.title === title) last.rows.push(row);
		else out.push({ title, rows: [row] });
	}
	return out;
}

function sectionHtml(header: readonly string[], section: Section): string {
	const columns = header
		.map((_, index) => index)
		.filter(
			(index) =>
				index > 0 &&
				section.rows.some((row) => cellText(row.cells[index]) !== ""),
		);
	const head = columns
		.map((index) => {
			const numeric = section.rows.every(
				(row) =>
					cellText(row.cells[index]) === "" || isNumeric(row.formats[index]),
			);
			const cls = numeric ? "th num" : "th";
			return `<th class="${cls}">${escapeHtml(header[index] ?? "")}</th>`;
		})
		.join("");
	const body = section.rows
		.map(
			(row) =>
				`<tr>${columns
					.map((index) => {
						const value = row.cells[index] ?? null;
						const format = row.formats[index] ?? "plain";
						const cls = value !== null && isNumeric(format) ? "td num" : "td";
						return `<td class="${cls}">${escapeHtml(formatReportCell(value, format))}</td>`;
					})
					.join("")}</tr>`,
		)
		.join("");
	return `<h2>${escapeHtml(section.title)}</h2><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function sectionedReportHtml(
	title: string,
	generatedOn: string,
	table: FinancialAnalyticsTable,
): string {
	const content =
		table.rows.length === 0
			? '<p class="empty">No data available for this report.</p>'
			: sections(table)
					.map((section) => sectionHtml(table.header, section))
					.join("");
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #222; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin: 20px 0 8px; }
    .meta { color: #666; margin-bottom: 16px; font-size: 13px; }
    .table { border-collapse: collapse; width: 100%; font-size: 13px; }
    .th { border: 1px solid #ccc; padding: 6px 10px; background: #f0f0f0; text-align: left; }
    .td { border: 1px solid #ccc; padding: 6px 10px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .empty { color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated: ${escapeHtml(generatedOn)}</p>
  ${content}
</body>
</html>`;
}
