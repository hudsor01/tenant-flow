import { describe, expect, it } from "vitest";

import type { ExpenseRow } from "#hooks/api/query-keys/expense-keys";
import { buildExpensesCsv } from "../expenses-csv";

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

describe("buildExpensesCsv", () => {
	it("emits a header row", () => {
		const csv = buildExpensesCsv([row()]);
		expect(csv.split("\r\n")[0]).toBe(
			"Date,Description,Vendor,Property,Amount",
		);
	});

	// COMP-07 + money class: amount is dollars, written with 2 decimals (never
	// /100). expense_date is emitted raw, never round-tripped through new Date().
	it("emits the amount in dollars and the date raw", () => {
		const csv = buildExpensesCsv([row({ amount: 1500 })]);
		const dataLine = csv.split("\r\n")[1];
		expect(dataLine).toBe(
			"2026-07-11,Plumbing repair,Acme Plumbing,Maple Court,1500.00",
		);
		expect(buildExpensesCsv([row({ amount: 89.5 })]).split("\r\n")[1]).toBe(
			"2026-07-11,Plumbing repair,Acme Plumbing,Maple Court,89.50",
		);
	});

	// 66.2-39: a user-entered description, vendor or property name that starts
	// like a formula is neutralized; the amount, a number cell, never is.
	it("neutralizes formula-shaped text cells but not the amount", () => {
		const csv = buildExpensesCsv([
			row({
				description: '=HYPERLINK("http://x")',
				vendor_name: "@vendor",
				property_name: "+1 Main",
				amount: -25,
			}),
		]);
		expect(csv.split("\r\n")[1]).toBe(
			'2026-07-11,"\'=HYPERLINK(""http://x"")",\'@vendor,\'+1 Main,-25.00',
		);
	});

	it("escapes commas and quotes in text fields", () => {
		const csv = buildExpensesCsv([
			row({ description: 'HVAC, "emergency"', vendor_name: "Bob, Inc" }),
		]);
		const dataLine = csv.split("\r\n")[1];
		expect(dataLine).toContain('"HVAC, ""emergency"""');
		expect(dataLine).toContain('"Bob, Inc"');
	});

	it("renders null text fields as empty cells", () => {
		const csv = buildExpensesCsv([
			row({ description: null, vendor_name: null, property_name: null }),
		]);
		expect(csv.split("\r\n")[1]).toBe("2026-07-11,,,,1500.00");
	});

	it("emits one line per row plus the header", () => {
		const csv = buildExpensesCsv([row(), row({ id: "exp-2" })]);
		expect(csv.split("\r\n")).toHaveLength(3);
	});
});
