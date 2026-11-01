/**
 * Client-side CSV for report exports (RFC 4180: CRLF rows, a cell quoted when
 * it holds a comma, a quote, CR or LF, embedded quotes doubled). No BOM: no
 * export in the app writes one. Download the result with `downloadBlob`
 * (`#lib/reports/download-blob`) as a `CSV_MIME_TYPE` Blob.
 *
 * A cell is text or a number. Text that a spreadsheet would read as a formula
 * (a leading `=`, `+`, `-`, `@`, tab or CR) is prefixed with `'` (OWASP CSV
 * injection). A number cell is written as plain digits and never prefixed, so
 * a negative amount stays a number a spreadsheet can sum.
 */

export const CSV_MIME_TYPE = "text/csv;charset=utf-8";

export interface CsvNumberCell {
	readonly kind: "number";
	readonly text: string;
}

export type CsvCell = string | CsvNumberCell;

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * A number cell with a fixed number of decimals (money: 2), no currency
 * symbol and no grouping separators. Throws on NaN or an infinity rather than
 * writing them into a statement.
 */
export function csvNumber(
	value: number,
	fractionDigits: number,
): CsvNumberCell {
	if (!Number.isFinite(value)) {
		throw new RangeError("CSV number cell must be finite");
	}
	const text = value.toFixed(fractionDigits);
	return {
		kind: "number",
		text: text.startsWith("-") && Number(text) === 0 ? text.slice(1) : text,
	};
}

/** Neutralize a formula trigger in a text cell (never applied to numbers). */
export function neutralizeCsvFormula(value: string): string {
	return FORMULA_TRIGGER.test(value) ? `'${value}` : value;
}

function quoteCsvField(value: string): string {
	return NEEDS_QUOTES.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function serializeCell(cell: CsvCell): string {
	if (typeof cell === "string") {
		return quoteCsvField(neutralizeCsvFormula(cell));
	}
	return cell.text;
}

/** A header row then one line per row, joined with CRLF. */
export function toCsv(
	header: readonly string[],
	rows: readonly (readonly CsvCell[])[],
): string {
	return [header, ...rows]
		.map((row) => row.map(serializeCell).join(","))
		.join("\r\n");
}
