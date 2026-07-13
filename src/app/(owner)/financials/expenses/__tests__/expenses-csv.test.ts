import { describe, expect, it } from "vitest";

import type { ExpenseRow } from "#hooks/api/query-keys/expense-keys";
import { buildExpensesCsv, escapeCsvCell } from "../expenses-csv";

const row = (overrides: Partial<ExpenseRow> = {}): ExpenseRow => ({
	id: "exp-1",
	amount: 1500,
	description: "Plumbing repair",
	expense_date: "2026-07-11",
	vendor_name: "Acme Plumbing",
	maintenance_request_id: "mr-1",
	status: "paid",
	created_at: "2026-07-11T00:00:00Z",
	property_name: "Maple Court",
	...overrides,
});

describe("escapeCsvCell", () => {
	it("leaves plain values untouched", () => {
		expect(escapeCsvCell("Maple Court")).toBe("Maple Court");
	});

	it("quotes values containing a comma", () => {
		expect(escapeCsvCell("Repair, urgent")).toBe('"Repair, urgent"');
	});

	it("quotes and doubles embedded double-quotes", () => {
		expect(escapeCsvCell('12" pipe')).toBe('"12"" pipe"');
	});

	it("quotes values containing a newline", () => {
		expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
	});
});

describe("buildExpensesCsv", () => {
	it("emits a header row", () => {
		const csv = buildExpensesCsv([row()]);
		expect(csv.split("\n")[0]).toBe("Date,Description,Vendor,Property,Amount");
	});

	// COMP-07 + money class: amount is INTEGER dollars, emitted verbatim (never
	// /100). expense_date is emitted raw, never round-tripped through new Date().
	it("emits the amount verbatim and the date raw", () => {
		const csv = buildExpensesCsv([row({ amount: 1500 })]);
		const dataLine = csv.split("\n")[1];
		expect(dataLine).toBe(
			"2026-07-11,Plumbing repair,Acme Plumbing,Maple Court,1500",
		);
	});

	it("escapes commas and quotes in text fields", () => {
		const csv = buildExpensesCsv([
			row({ description: 'HVAC, "emergency"', vendor_name: "Bob, Inc" }),
		]);
		const dataLine = csv.split("\n")[1];
		expect(dataLine).toContain('"HVAC, ""emergency"""');
		expect(dataLine).toContain('"Bob, Inc"');
	});

	it("renders null text fields as empty cells", () => {
		const csv = buildExpensesCsv([
			row({ description: null, vendor_name: null, property_name: null }),
		]);
		expect(csv.split("\n")[1]).toBe("2026-07-11,,,,1500");
	});

	it("emits one line per row plus the header", () => {
		const csv = buildExpensesCsv([row(), row({ id: "exp-2" })]);
		expect(csv.split("\n")).toHaveLength(3);
	});
});
