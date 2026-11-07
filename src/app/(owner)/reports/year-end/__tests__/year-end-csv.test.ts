import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import type { YearEndSummary } from "#types/reports";
import { buildYearEndCsv, YEAR_END_CSV_HEADER } from "../year-end-csv";

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n", delimiter: "," });
	expect(result.errors).toEqual([]);
	return result.data;
}

const yearEnd: YearEndSummary = {
	year: 2025,
	rentReceived: 54000,
	operatingExpenses: 12500.5,
	netIncome: 41499.5,
	byProperty: [
		{
			propertyId: "p1",
			propertyName: "=Maple Court",
			rentReceived: 30000,
			expenses: 8000,
			netIncome: 22000,
		},
		{
			propertyId: "p2",
			propertyName: "Oak, Unit 2",
			rentReceived: 24000,
			expenses: 24500.5,
			netIncome: -500.5,
		},
	],
	expenseByCategory: [{ category: "-Repairs", amount: 12500.5 }],
};

describe("buildYearEndCsv", () => {
	it("heads each property's receipts Rent Received, not Income", () => {
		expect([...YEAR_END_CSV_HEADER]).toEqual([
			"Section",
			"Item",
			"Value",
			"Rent Received",
			"Expenses",
			"Net",
		]);
	});

	it("keeps every section's figures under one fixed header", () => {
		expect(parse(buildYearEndCsv(yearEnd))).toEqual([
			[...YEAR_END_CSV_HEADER],
			["Overview", "Tax Year", "2025", "", "", ""],
			["Overview", "Rent Received", "54000.00", "", "", ""],
			["Overview", "Operating Expenses", "12500.50", "", "", ""],
			["Overview", "Net Income", "41499.50", "", "", ""],
			["By Property", "'=Maple Court", "", "30000.00", "8000.00", "22000.00"],
			["By Property", "Oak, Unit 2", "", "24000.00", "24500.50", "-500.50"],
			["Expenses by Vendor", "'-Repairs", "12500.50", "", "", ""],
		]);
	});
});
