/**
 * A report table as a real Office Open XML workbook (.xlsx), built with SheetJS
 * Community Edition 0.20.3, the build the app pins in `package.json` from the
 * SheetJS CDN. It is vendored in `./vendor/` (`xlsx.mjs` and
 * `types/index.d.ts` of that tarball, byte for byte) because Supabase's hosted
 * bundler refuses imports from cdn.sheetjs.com, and SheetJS publishes this
 * version on no registry it fetches from. Bump both files with `package.json`.
 *
 * CELLS ARE TYPED, NEVER FORMULAS. Every cell is written as a cell object with
 * an explicit type: a finite number is a number cell (`t: "n"`), any other
 * value is a string cell (`t: "s"`, the text of `String(value)`), and null or
 * undefined writes no cell. A money cell (`ReportCellFormat` "money") stays a
 * number and carries a currency number format (`z`, `XLSX_MONEY_FORMAT`:
 * `$61,200.00`), so Excel shows dollars and still sums the column; any other
 * number keeps Excel's General format. No cell ever carries `f`, so a text value such as
 * `=HYPERLINK(...)` is stored as text and Excel shows it as text; it is not a
 * formula, so it needs no `'` prefix (the CSV writer adds one because a CSV
 * cell has no type). A non-finite number (NaN, an infinity) would be written as
 * a number Excel cannot read, so it is written as its text, as the CSV writer
 * writes it.
 *
 * Callers: `export-report/index.ts` (the `xlsx` format of every report type).
 * `tests/export-report-test.ts` parses the bytes back with the same build.
 */

// @deno-types="./vendor/xlsx-0.20.3.d.ts"
import * as XLSX from "./vendor/xlsx-0.20.3.mjs";
import type {
	FinancialAnalyticsTable,
	ReportCellFormat,
} from "./financial-analytics-report.ts";
import { XLSX_MONEY_FORMAT } from "./report-format.ts";

export const XLSX_MIME_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Excel's limit on a sheet name, and the characters it forbids in one. */
const SHEET_NAME_MAX = 31;
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;

function sheetName(name: string): string {
	const cleaned = name.replace(SHEET_NAME_FORBIDDEN, " ").trim();
	return (cleaned || "Report").slice(0, SHEET_NAME_MAX);
}

function cellFor(
	value: unknown,
	format: ReportCellFormat,
): XLSX.CellObject | null {
	if (value === null || value === undefined) return null;
	if (typeof value === "number" && Number.isFinite(value)) {
		return format === "money"
			? { t: "n", v: value, z: XLSX_MONEY_FORMAT }
			: { t: "n", v: value };
	}
	return { t: "s", v: String(value) };
}

/** A one-sheet workbook: the header row, then one row per table row. */
export function reportTableToXlsx(
	name: string,
	table: FinancialAnalyticsTable,
): ArrayBuffer {
	const sheet: XLSX.WorkSheet = {};
	const lines: readonly (readonly unknown[])[] = [table.header, ...table.rows];
	let lastColumn = 0;
	for (const [r, line] of lines.entries()) {
		const formats = r === 0 ? [] : (table.formats[r - 1] ?? []);
		for (const [c, value] of line.entries()) {
			const cell = cellFor(value, formats[c] ?? "plain");
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
