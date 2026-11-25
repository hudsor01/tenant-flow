/**
 * The tax tracker's facts (2026-11-24 audit X1-X7), checked 2026-11-25
 * against the 2026 Schedule E, Pub. 527, Pub. 946 and Announcement 2026-11.
 * Each assertion names a statement the page used to make and the rule that
 * replaced it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	deductionCategories,
	scheduleLinesLabel,
} from "#app/resources/landlord-tax-deduction-tracker/tax-deduction-data";

const rows = deductionCategories.flatMap((category) => category.items);
const rowNamed = (name: string) => {
	const row = rows.find((item) => item.deduction === name);
	if (!row) throw new Error(`no row named ${name}`);
	return row;
};
const allText = JSON.stringify(deductionCategories);
const PAGE = readFileSync(
	join(
		process.cwd(),
		"src/app/resources/landlord-tax-deduction-tracker/page.tsx",
	),
	"utf8",
);

describe("tax deduction tracker facts", () => {
	it("puts every row on a real Schedule E line (X3)", () => {
		// Part I expense lines on the 2026 form.
		const lines = ["5", "6", "7", "8", "9", "10", "11", "12", "13a", "13b"];
		lines.push("14", "15", "16", "17", "18", "19");
		for (const row of rows) expect(lines).toContain(row.line);
		expect(rowNamed("Cleaning & Maintenance").line).toBe("7");
		expect(rowNamed("Advertising").line).toBe("5");
		expect(rowNamed("Office Supplies").line).toBe("15");
		expect(rowNamed("Mileage (Standard Rate)").line).toBe("6");
		expect(rowNamed("Other Interest").line).toBe("13b");
		expect(rowNamed("Vehicle Loan Interest").line).toBe("13a");
	});

	it("labels each category with the lines its rows use", () => {
		const property = deductionCategories.find(
			(category) => category.category === "Property Expenses",
		);
		expect(property && scheduleLinesLabel(property)).toBe(
			"Schedule E, Lines 9, 16, 17, 19",
		);
		const depreciation = deductionCategories.find(
			(category) => category.category === "Depreciation",
		);
		expect(depreciation && scheduleLinesLabel(depreciation)).toBe(
			"Schedule E, Line 18",
		);
	});

	it("depreciates HVAC and roofs with the building, not over 5-7 years (X1)", () => {
		expect(rowNamed("Building Improvements").description).toMatch(
			/Roof, HVAC system.*27\.5 years/,
		);
		expect(allText).not.toMatch(/5-7 years/);
		expect(allText).not.toMatch(/HVAC unit/);
	});

	it("drops the Section 179 roof row for the safe harbors (X2)", () => {
		expect(allText).not.toMatch(/Section 179/);
		const depreciation = deductionCategories.find(
			(category) => category.category === "Depreciation",
		);
		expect(depreciation?.note).toMatch(/\$2,500 or less per invoice/);
		expect(depreciation?.note).toMatch(/\$10,000 or 2% of that basis/);
	});

	it("amortizes all rental points, not just refinances (X4)", () => {
		expect(rowNamed("Points & Loan Origination Fees").description).toMatch(
			/purchase or refinance, deducted over the life of the loan/,
		);
		expect(allText).not.toMatch(/for refinances\)/);
	});

	it("states the record-keeping rule for rental property (X5)", () => {
		expect(PAGE).not.toMatch(/7 years if claiming/);
		expect(PAGE).toMatch(/for the year you\s+sell the property/);
	});

	it("gives both 2026 mileage rates (X6)", () => {
		const mileage = rowNamed("Mileage (Standard Rate)");
		expect(mileage.description).toMatch(/72\.5 cents a mile through June 30/);
		expect(mileage.description).toMatch(/76 cents from July 1/);
		expect(mileage.example).toMatch(/July to December 2026 x 76 cents/);
	});

	it("drops the unsourced management-fee range (X7)", () => {
		expect(allText).not.toMatch(/8-12%/);
	});
});
