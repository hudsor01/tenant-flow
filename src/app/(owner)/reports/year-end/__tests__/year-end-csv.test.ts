import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import type { Year1099Summary, YearEndSummary } from "#types/reports";
import {
	build1099Csv,
	buildYearEndCsv,
	REPORT_1099_CSV_HEADER,
	YEAR_END_CSV_HEADER,
} from "../year-end-csv";

function parse(csv: string): string[][] {
	const result = Papa.parse<string[]>(csv, { newline: "\r\n", delimiter: "," });
	expect(result.errors).toEqual([]);
	return result.data;
}

const yearEnd: YearEndSummary = {
	year: 2025,
	grossRentalIncome: 54000,
	operatingExpenses: 12500.5,
	netIncome: 41499.5,
	byProperty: [
		{
			propertyId: "p1",
			propertyName: "=Maple Court",
			income: 30000,
			expenses: 8000,
			netIncome: 22000,
		},
		{
			propertyId: "p2",
			propertyName: "Oak, Unit 2",
			income: 24000,
			expenses: 24500.5,
			netIncome: -500.5,
		},
	],
	expenseByCategory: [{ category: "-Repairs", amount: 12500.5 }],
};

describe("buildYearEndCsv", () => {
	it("keeps every section's figures under one fixed header", () => {
		expect(parse(buildYearEndCsv(yearEnd))).toEqual([
			[...YEAR_END_CSV_HEADER],
			["Overview", "Tax Year", "2025", "", "", ""],
			["Overview", "Gross Rental Income", "54000.00", "", "", ""],
			["Overview", "Operating Expenses", "12500.50", "", "", ""],
			["Overview", "Net Income", "41499.50", "", "", ""],
			["By Property", "'=Maple Court", "", "30000.00", "8000.00", "22000.00"],
			["By Property", "Oak, Unit 2", "", "24000.00", "24500.50", "-500.50"],
			["Expense Categories", "'-Repairs", "12500.50", "", "", ""],
		]);
	});
});

describe("build1099Csv", () => {
	const summary: Year1099Summary = {
		year: 2025,
		threshold: 600,
		totalReported: 2100,
		recipients: [
			{ vendorName: "@Acme Plumbing", totalPaid: 1500, jobCount: 3 },
			{ vendorName: "Bob's HVAC", totalPaid: 600, jobCount: 1 },
		],
	};

	it("writes one line per recipient with plain numbers", () => {
		expect(parse(build1099Csv(summary, 2025))).toEqual([
			[...REPORT_1099_CSV_HEADER],
			["'@Acme Plumbing", "1500.00", "3", "2025", "600.00", "Yes"],
			["Bob's HVAC", "600.00", "1", "2025", "600.00", "Yes"],
		]);
	});

	it("writes the threshold message when no vendor qualifies", () => {
		expect(parse(build1099Csv({ ...summary, recipients: [] }, 2024))).toEqual([
			["message"],
			["No vendors met the $600 1099-NEC threshold for 2024"],
		]);
	});
});
