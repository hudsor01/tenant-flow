/**
 * The report PDFs and XLSX files print each figure as the pages print it.
 *
 * WHAT WENT WRONG. The year-end, tax-documents and financial analytics PDFs
 * printed every amount as a bare number (`61200`, `-250.5`) where the pages
 * show `$61,200.00` and `-$250.50`, and the XLSX money cells
 * had Excel's General format.
 *
 * WHAT THIS FILE PROVES BY EXECUTION. `_shared/report-format` (the PDF cell
 * text and the XLSX money format) against the app's own formatters, never a
 * hand-copied literal:
 *   - money is `formatCurrency`'s text, the formatter of every amount on the
 *     year-end and tax-documents pages and on the financial
 *     analytics page's payment summary and expense breakdown;
 *   - a share is the tax-documents page's `${toFixed(1)}%`, and Scheduled Margin
 *     is the margin card's `NumberTicker` text (rendered here) and `%`;
 *   - Excel renders the money format (SheetJS, the build the app and the
 *     edge function pin) as `formatCurrency` does, negatives included.
 * The specifier carries no `.ts` extension (TS5097, see report-csv.test.ts).
 */

import { render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { NumberTicker } from "#components/ui/number-ticker";
import { formatCurrency } from "#lib/utils/currency";
import { formatReportCell, XLSX_MONEY_FORMAT } from "../_shared/report-format";

// As the exports write them: dollars rounded to cents.
const AMOUNTS = [
	61200, 42849.25, 0, -250, -250.5, 0.3, 9000.5, 1234567.89, 18350.75, -0.01,
];

/** The margin card's text for `value`: its NumberTicker, under reduced motion. */
function roiCardText(value: number): string {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
	const { container, unmount } = render(
		createElement(NumberTicker, { value, decimalPlaces: 1, duration: 1500 }),
	);
	const text = container.textContent ?? "";
	unmount();
	return `${text}%`;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("PDF cell text", () => {
	it("prints money as formatCurrency does", () => {
		for (const amount of AMOUNTS) {
			expect(formatReportCell(amount, "money"), String(amount)).toBe(
				formatCurrency(amount),
			);
		}
		expect(formatReportCell(61200, "money")).toBe("$61,200.00");
	});

	it("prints a share as the tax-documents page does", () => {
		for (let tenths = 0; tenths <= 1000; tenths += 5) {
			const share = Number((tenths / 10).toFixed(1));
			expect(formatReportCell(share, "percent")).toBe(`${share.toFixed(1)}%`);
		}
	});

	it("prints Scheduled Margin as its card does", () => {
		// As the export writes it: rounded to one decimal (the rounding itself is
		// pinned against the card in financial-analytics-report.test.ts).
		for (const roi of [70, 0.2, -124.8, 12.3, 1234.6, -24.9, 100]) {
			expect(formatReportCell(roi, "percent"), String(roi)).toBe(
				roiCardText(roi),
			);
		}
	});

	it("prints text and counts as they are, and an empty cell as nothing", () => {
		expect(formatReportCell(7, "plain")).toBe("7");
		expect(formatReportCell("Maple Court", "plain")).toBe("Maple Court");
		expect(formatReportCell("No vendor recorded", "money")).toBe(
			"No vendor recorded",
		);
		expect(formatReportCell(null, "money")).toBe("");
	});
});

describe("XLSX money format", () => {
	it("renders in Excel as formatCurrency's text, negatives included", () => {
		for (const amount of AMOUNTS) {
			expect(XLSX.SSF.format(XLSX_MONEY_FORMAT, amount), String(amount)).toBe(
				formatCurrency(amount),
			);
		}
	});
});
