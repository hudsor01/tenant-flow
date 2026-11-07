/**
 * The statements' basis of presentation in the generated reports, and every
 * note's text inside the PDF's margins (66.2-39 fix round 1, part Q).
 *
 * WHAT WENT WRONG. statement-basis.ts said the two generated reports built on
 * the income statement and the cash flow carry STATEMENT_BASIS_NOTE; neither
 * did. And the PDF wrote each section note as ONE line (doc.text(note, x, y)),
 * so a note longer than the page ran past the right margin and off the page
 * (the executive and financial performance Summary's, with the ledger totals
 * unavailable and a failed occupancy read, is one).
 */
import jsPDF from "jspdf";
import { afterEach, describe, expect, it, vi } from "vitest";

const { textCalls } = vi.hoisted(() => ({
	textCalls: [] as Array<{ text: string; x: number; width: number }>,
}));

// Every document generatePdfBlob makes records each string it writes, where,
// and how wide jsPDF measures it in the font it is set in.
vi.mock("jspdf", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jspdf")>();
	const Real = actual.default;
	class RecordingPdf extends Real {
		constructor(...args: ConstructorParameters<typeof Real>) {
			super(...args);
			const write = this.text.bind(this);
			this.text = ((...call: Parameters<jsPDF["text"]>) => {
				const [text, x] = call;
				if (typeof text === "string" && typeof x === "number") {
					textCalls.push({ text, x, width: this.getTextWidth(text) });
				}
				return write(...call);
			}) as jsPDF["text"];
		}
	}
	return { ...actual, default: RecordingPdf, jsPDF: RecordingPdf };
});

import { buildSectionSheetData } from "../generate-excel";
import { generatePdfBlob, renderWrappedText } from "../generate-pdf";
import type { ReportData } from "../report-data";
import {
	STATEMENT_BASIS_HEADING,
	STATEMENT_BASIS_NOTE,
} from "../statement-basis";

/**
 * The longest note a builder writes: the Summary's ledger note and its
 * failed-occupancy note together (report-data.ts `notes()`), 887pt at 8pt.
 */
const LONG_NOTE =
	"The income statement and the cash flow are built on your rent ledger, whose totals aren't available yet, so none of their figures is shown. Some figures couldn't be loaded and show as 0 here, which may not be their value. Try generating the report again.";

function report(): ReportData {
	return {
		title: "Financial Performance Report",
		subtitle: "Revenue · expenses · net income · cash flow",
		generatedAt: "2026-11-02T12:00:00.000Z",
		periodStart: "2026-01-01",
		periodEnd: "2026-10-31",
		sections: [
			{
				heading: "Summary",
				rows: [
					{ label: "Total Revenue", value: "Unavailable" },
					{ label: "Occupancy Rate (today)", value: "0.0%" },
				],
				note: LONG_NOTE,
			},
			{
				heading: "Expenses by Vendor",
				table: {
					headers: ["Vendor", "Amount", "% of Expenses"],
					rows: [["Acme", "$10.00", "100.0%"]],
					emptyText: "No expenses in the period.",
				},
			},
			{ heading: STATEMENT_BASIS_HEADING, paragraphs: STATEMENT_BASIS_NOTE },
		],
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("the PDF keeps every note and paragraph inside its margins", () => {
	it("wraps a note to the width between the margins, every word kept", () => {
		const doc = new jsPDF({ unit: "pt", format: "letter" });
		const lines: string[] = [];
		vi.spyOn(doc, "text").mockImplementation(((text: string) => {
			lines.push(text);
			return doc;
		}) as typeof doc.text);
		doc.setFontSize(8);
		const end = renderWrappedText(doc, LONG_NOTE, 36, 100, 540, 10, 36, 700);
		expect(lines.length).toBeGreaterThan(1);
		for (const line of lines) {
			expect(doc.getTextWidth(line)).toBeLessThanOrEqual(540);
		}
		expect(lines.join(" ").split(/\s+/)).toEqual(LONG_NOTE.split(/\s+/));
		expect(end).toBe(100 + lines.length * 10);
	});

	it("writes no line of the report past the right margin", () => {
		textCalls.length = 0;
		generatePdfBlob(report());
		const calls = textCalls;
		const right = 612 - 36;
		const prose = calls.filter((c) => c.text.split(" ").length > 3);
		for (const call of prose) {
			expect(call.x + call.width, call.text).toBeLessThanOrEqual(right);
		}
		expect(prose.length).toBeGreaterThan(4);
		const written = calls.map((c) => c.text).join(" ");
		for (const entry of STATEMENT_BASIS_NOTE) {
			for (const word of entry.split(" ")) {
				expect(written).toContain(word);
			}
		}
		expect(written).toContain("Try generating the report again.");
	});
});

describe("the PDF writes an empty table's own words (cycle 2, F122)", () => {
	it("prints the builder's text, and nothing when the section's note says why", () => {
		textCalls.length = 0;
		generatePdfBlob({
			...report(),
			sections: [
				{
					heading: "By Status (to date)",
					table: {
						headers: ["Status", "Count"],
						rows: [],
						emptyText: "No requests to date.",
					},
				},
				{
					heading: "Vendor Spend to Date",
					table: {
						headers: ["Vendor", "Jobs", "Total Spend"],
						rows: [],
						emptyText: null,
					},
					note: "This table couldn't be loaded, so it lists nothing here. Try generating the report again.",
				},
			],
		});
		const written = textCalls.map((c) => c.text);
		expect(written).toContain("No requests to date.");
		expect(written.join(" ")).not.toContain("No data for the selected period");
		expect(written.join(" ")).toContain("This table couldn't be loaded");
	});
});

describe("the XLSX writes the basis one paragraph a row", () => {
	it("lists each entry under the heading", () => {
		expect(
			buildSectionSheetData({
				heading: STATEMENT_BASIS_HEADING,
				paragraphs: STATEMENT_BASIS_NOTE,
			}),
		).toEqual([
			[STATEMENT_BASIS_HEADING],
			[],
			...STATEMENT_BASIS_NOTE.map((entry) => [entry]),
		]);
	});
});
