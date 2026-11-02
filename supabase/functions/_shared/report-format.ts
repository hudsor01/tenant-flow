/**
 * How a report cell prints, as pure functions: the text the PDF shows for a
 * figure, and the Excel number format a money cell carries.
 *
 * THIS MODULE HAS NO RUNTIME DEPENDENCY. Its only import is type-only (erased)
 * and it references no runtime global beyond `Intl`, so
 * `__tests__/report-format.test.ts` imports it from Vitest and compares its
 * text with the app's own formatters. Do not add a value import.
 *
 * Callers: `report-html.ts` (every PDF cell) and `report-xlsx.ts` (the number
 * format of a money cell).
 *
 * THE PAGES ARE THE SPEC. Money is `formatCurrency`'s default
 * (`src/lib/utils/currency.ts`: en-US, USD, two decimals, `-$250.00` for a
 * negative amount), the formatter the year-end, 1099-NEC and tax-documents
 * pages and the financial analytics page's payment summary and expense
 * breakdown print with. A percentage is one decimal and a `%` (the margin card's
 * `NumberTicker` with `decimalPlaces={1}`, the tax-documents page's
 * `toFixed(1)`; the two agree below 1,000). Text and counts print as they are.
 */

import type {
	ReportCell,
	ReportCellFormat,
} from "./financial-analytics-report.ts";

const MONEY = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const PERCENT = new Intl.NumberFormat("en-US", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

/**
 * Excel's number format for a money cell: a dollar sign, thousands separators
 * and cents. One section, so Excel and SheetJS print a negative amount with a
 * leading minus (`-$250.00`), as `formatCurrency` does.
 */
export const XLSX_MONEY_FORMAT = '"$"#,##0.00';

/** The text a cell prints as: `""` for an empty cell. */
export function formatReportCell(
	value: ReportCell,
	format: ReportCellFormat,
): string {
	if (value === null) return "";
	if (typeof value === "number" && Number.isFinite(value)) {
		if (format === "money") return MONEY.format(value);
		if (format === "percent") return `${PERCENT.format(value)}%`;
	}
	return String(value);
}
