/**
 * A report table as a real Office Open XML workbook (.xlsx), built with SheetJS
 * Community Edition 0.20.3 from the SheetJS CDN, the same build the app pins in
 * `package.json`. The `xlsx` specifier resolves through
 * `supabase/functions/deno.json`; the `@deno-types` URL below must name the
 * same version.
 *
 * CELLS ARE TYPED, NEVER FORMULAS. Every cell is written as a cell object with
 * an explicit type: a finite number is a number cell (`t: "n"`), any other
 * value is a string cell (`t: "s"`, the text of `String(value)`), and null or
 * undefined writes no cell. No cell ever carries `f`, so a text value such as
 * `=HYPERLINK(...)` is stored as text and Excel shows it as text; it is not a
 * formula, so it needs no `'` prefix (the CSV writer adds one because a CSV
 * cell has no type). A non-finite number (NaN, an infinity) would be written as
 * a number Excel cannot read, so it is written as its text, as the CSV writer
 * writes it.
 *
 * Callers: `export-report/index.ts` (the `xlsx` format of every report type).
 * `tests/export-report-test.ts` parses the bytes back with the same build.
 */

// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from "xlsx";

export const XLSX_MIME_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Excel's limit on a sheet name, and the characters it forbids in one. */
const SHEET_NAME_MAX = 31;
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;

function sheetName(name: string): string {
	const cleaned = name.replace(SHEET_NAME_FORBIDDEN, " ").trim();
	return (cleaned || "Report").slice(0, SHEET_NAME_MAX);
}

function cellFor(value: unknown): XLSX.CellObject | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return { t: "n", v: value };
	}
	return { t: "s", v: String(value) };
}

/** A one-sheet workbook: the header row, then one row per table row. */
export function reportTableToXlsx(
	name: string,
	header: readonly string[],
	rows: readonly (readonly unknown[])[],
): ArrayBuffer {
	const sheet: XLSX.WorkSheet = {};
	const lines: readonly (readonly unknown[])[] = [header, ...rows];
	let lastColumn = 0;
	for (const [r, line] of lines.entries()) {
		for (const [c, value] of line.entries()) {
			const cell = cellFor(value);
			if (cell === null) continue;
			sheet[XLSX.utils.encode_cell({ r, c })] = cell;
			lastColumn = Math.max(lastColumn, c);
		}
	}
	sheet["!ref"] = XLSX.utils.encode_range({
		s: { r: 0, c: 0 },
		e: { r: Math.max(lines.length - 1, 0), c: lastColumn },
	});

	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, sheetName(name));
	// `type: "array"` returns an ArrayBuffer, which a Response body takes as is.
	const bytes: ArrayBuffer = XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		compression: true,
	});
	return bytes;
}
