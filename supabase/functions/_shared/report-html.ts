/**
 * A sectioned report table as the HTML document StirlingPDF renders to a PDF.
 *
 * The table's first column names the row's section (`FinancialAnalyticsTable`).
 * Each run of rows with the same section becomes a heading and a table of its
 * own, and a section's table keeps only the columns that hold a value in that
 * section, so the Overview prints Item and Value while Revenue & Expenses
 * prints Item, Revenue, Expenses and Net Income. Every value is escaped.
 *
 * Callers: `export-report/index.ts` (the `pdf` format of `financial-analytics`,
 * posted to generate-pdf as Mode 2 HTML) and `generate-pdf/index.ts` (Mode 1
 * `financial-analytics`), so both paths print the same document.
 */

import { escapeHtml } from "./escape-html.ts";

interface Section {
	readonly title: string;
	readonly rows: (readonly unknown[])[];
}

function cellText(value: unknown): string {
	return value === null || value === undefined ? "" : String(value);
}

function sections(rows: readonly (readonly unknown[])[]): Section[] {
	const out: Section[] = [];
	for (const row of rows) {
		const title = cellText(row[0]);
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
				index > 0 && section.rows.some((row) => cellText(row[index]) !== ""),
		);
	const head = columns
		.map((index) => `<th class="th">${escapeHtml(header[index] ?? "")}</th>`)
		.join("");
	const body = section.rows
		.map(
			(row) =>
				`<tr>${columns
					.map(
						(index) =>
							`<td class="td">${escapeHtml(cellText(row[index]))}</td>`,
					)
					.join("")}</tr>`,
		)
		.join("");
	return `<h2>${escapeHtml(section.title)}</h2><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

export function sectionedReportHtml(
	title: string,
	generatedOn: string,
	header: readonly string[],
	rows: readonly (readonly unknown[])[],
): string {
	const content =
		rows.length === 0
			? '<p class="empty">No data available for this report.</p>'
			: sections(rows)
					.map((section) => sectionHtml(header, section))
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
