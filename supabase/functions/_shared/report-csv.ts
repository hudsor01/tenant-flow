/**
 * The report-export table writer, as pure functions: the column list of a set
 * of RPC rows, those rows as a table, and a table as CSV.
 *
 * THIS MODULE IS A DEPENDENCY-FREE LEAF. It has no import statement and no
 * reference to a runtime global (no Deno namespace, no Response, no network),
 * so `__tests__/report-csv.test.ts` imports it from Vitest and runs the real
 * writer, as `rate-limit.test.ts` runs `rate-limit-decision.ts`. Adding an
 * import here demotes those tests to a source-text read. Do not add one.
 *
 * Callers: `export-report/index.ts` (every CSV body, the XLSX table of a
 * row report, and the PDF table), `generate-pdf/index.ts` (the Mode 1 report
 * table). A report with its own fixed column list (`financial-analytics`)
 * writes through `tableToCsv` directly.
 *
 * COLUMNS. A report's rows come straight from an RPC (`flattenToRows`), and no
 * report has a fixed column list, so the columns are the union of every row's
 * keys in first-seen order. Reading only the first row's keys dropped a column
 * that the first row lacked from every row.
 *
 * CELLS. The same rule as the app's writer (`src/lib/reports/csv.ts`): a text
 * cell that a spreadsheet would read as a formula (a leading `=`, `+`, `-`,
 * `@`, tab or CR) is prefixed with `'` (OWASP CSV injection), and a number
 * cell is written as plain digits and never prefixed, so a negative amount
 * stays a number. A cell holding a comma, a quote, CR or LF is quoted, with
 * embedded quotes doubled. `null` and `undefined` are empty cells; any other
 * value is text (`String(value)`).
 *
 * Rows are joined with LF, as this endpoint always wrote them, and an empty
 * report is the single line `No data available`.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

export const EMPTY_REPORT_CSV = "No data available\n";

/** Every key of every row, in first-seen order. */
export function reportColumns(
	rows: readonly Record<string, unknown>[],
): string[] {
	const seen = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) seen.add(key);
	}
	return [...seen];
}

/** Neutralize a formula trigger in a text cell (never applied to numbers). */
export function neutralizeCsvFormula(text: string): string {
	return FORMULA_TRIGGER.test(text) ? `'${text}` : text;
}

function quoteCsvField(text: string): string {
	return NEEDS_QUOTES.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One cell: a number as plain digits, anything else as neutralized text. */
export function csvCell(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "number") return String(value);
	return quoteCsvField(neutralizeCsvFormula(String(value)));
}

export interface ReportRowsTable {
	readonly header: readonly string[];
	readonly rows: readonly (readonly unknown[])[];
}

/** RPC rows as a header of every column and one array of cells per row. */
export function rowsToTable(
	rows: readonly Record<string, unknown>[],
): ReportRowsTable {
	const header = reportColumns(rows);
	return {
		header,
		rows: rows.map((row) => header.map((column) => row[column])),
	};
}

/** The header, then one line per row, joined with LF. */
export function tableToCsv(
	header: readonly string[],
	rows: readonly (readonly unknown[])[],
): string {
	return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

/** A header row of every column, then one line per row, joined with LF. */
export function rowsToCsv(rows: readonly Record<string, unknown>[]): string {
	if (rows.length === 0) return EMPTY_REPORT_CSV;
	const table = rowsToTable(rows);
	return tableToCsv(table.header, table.rows);
}
