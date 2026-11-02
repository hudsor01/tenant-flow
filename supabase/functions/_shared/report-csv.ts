/**
 * The report-export CSV writer, as pure functions: a table (a fixed header and
 * one array of cells per row) as CSV.
 *
 * THIS MODULE IS A DEPENDENCY-FREE LEAF. It has no import statement and no
 * reference to a runtime global (no Deno namespace, no Response, no network),
 * so `__tests__/report-csv.test.ts` imports it from Vitest and runs the real
 * writer, as `rate-limit.test.ts` runs `rate-limit-decision.ts`. Adding an
 * import here demotes those tests to a source-text read. Do not add one.
 *
 * Caller: `export-report/index.ts` (the CSV body of every report type; each
 * report has its own fixed header, `financial-analytics-report.ts` and
 * `tax-year-reports.ts`).
 *
 * CELLS. The same rule as the app's writer (`src/lib/reports/csv.ts`): a text
 * cell that a spreadsheet would read as a formula (a leading `=`, `+`, `-`,
 * `@`, tab or CR) is prefixed with `'` (OWASP CSV injection), and a number
 * cell is written as plain digits and never prefixed, so a negative amount
 * stays a number. A cell holding a comma, a quote, CR or LF is quoted, with
 * embedded quotes doubled. `null` and `undefined` are empty cells; any other
 * value is text (`String(value)`).
 *
 * Rows are joined with LF, as this endpoint always wrote them.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

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

/** The header, then one line per row, joined with LF. */
export function tableToCsv(
	header: readonly string[],
	rows: readonly (readonly unknown[])[],
): string {
	return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
