import { describe, expect, it } from "vitest";
import { PRICING_PLANS } from "#config/pricing";
import { expandPlanComparison } from "#lib/blog/plan-comparison";

/** What a post writes, in `blogs.content`, where the plan table goes. */
const PLAN_COMPARISON_MARKER = "{{plan-comparison}}";

/** The table a marker line expands to. */
const planComparisonTable = () => expandPlanComparison(PLAN_COMPARISON_MARKER);

describe("planComparisonTable", () => {
	const rows = planComparisonTable().split("\n");

	it("has a header, a divider and one row per paid plan", () => {
		expect(rows[0]).toBe(
			"| Plan | Price | Properties | Units | Lease e-sign | Document storage |",
		);
		expect(rows[1]).toBe("| --- | --- | --- | --- | --- | --- |");
		expect(rows.slice(2).map((row) => row.split(" | ")[0])).toEqual([
			"| Starter",
			"| Growth",
			"| Max",
		]);
	});

	it("states each plan's price and limits as PRICING_PLANS holds them", () => {
		expect(rows[2]).toBe(
			"| Starter | $19 a month or $190 a year | 5 | 25 | Not included | 10 GB |",
		);
		expect(rows[3]).toBe(
			"| Growth | $49 a month or $490 a year | 20 | 100 | 25 a month | 50 GB |",
		);
		expect(rows[4]).toBe(
			"| Max | $149 a month or $1,490 a year | Unlimited | Unlimited | Unlimited | Unlimited |",
		);
	});

	it("leaves out the trial", () => {
		expect(planComparisonTable()).not.toContain(
			PRICING_PLANS["FREETRIAL"]?.name ?? "Free Trial",
		);
	});

	it("matches the e-sign volume the plans' feature lists state", () => {
		const growth = PRICING_PLANS["GROWTH"];
		expect(growth?.features).toContain(
			`${growth?.limits.leaseESignsPerMonth} lease e-signs per month`,
		);
		expect(PRICING_PLANS["TENANTFLOW_MAX"]?.features).toContain(
			"Unlimited properties, units, and lease e-signs",
		);
	});
});

describe("expandPlanComparison", () => {
	it("replaces a marker line with the table", () => {
		const content = `Intro.\n\n${PLAN_COMPARISON_MARKER}\n\nAfter.`;
		expect(expandPlanComparison(content)).toBe(
			`Intro.\n\n${planComparisonTable()}\n\nAfter.`,
		);
	});

	it("expands a marker line to a table, not to the marker", () => {
		expect(planComparisonTable()).not.toContain(PLAN_COMPARISON_MARKER);
		expect(planComparisonTable().split("\n")).toHaveLength(5);
	});

	it("takes a marker line with surrounding spaces", () => {
		expect(expandPlanComparison(`  ${PLAN_COMPARISON_MARKER} `)).toBe(
			planComparisonTable(),
		);
	});

	it("leaves a marker inside a sentence, and content without one, alone", () => {
		const inline = `Write ${PLAN_COMPARISON_MARKER} on its own line.`;
		expect(expandPlanComparison(inline)).toBe(inline);
		expect(expandPlanComparison("No table here.")).toBe("No table here.");
	});
});
