/**
 * The deposit card's rows (2026-11-24 audit D1-D3), each checked against
 * the cited statute on 2026-11-25. The pinned rows are the ones the page got
 * wrong or that recent amendments changed.
 */

import { describe, expect, it } from "vitest";
import {
	type StateDeposit,
	stateData,
} from "#app/resources/security-deposit-reference-card/deposit-data";

const row = (abbr: string): StateDeposit => {
	const found = stateData.find((state) => state.abbr === abbr);
	if (!found) throw new Error(`no row for ${abbr}`);
	return found;
};

describe("security deposit reference card", () => {
	it("covers the 50 states and DC once each, in order", () => {
		expect(stateData).toHaveLength(51);
		expect(new Set(stateData.map((state) => state.abbr)).size).toBe(51);
		const names = stateData.map((state) => state.state);
		expect(names).toEqual(
			[...names].sort((a, b) =>
				a
					.replace("DC", "District of Columbia")
					.localeCompare(b.replace("DC", "District of Columbia")),
			),
		);
	});

	it("cites a statute on every row (D3)", () => {
		for (const state of stateData) {
			// A code name and a section number, e.g. "La. R.S. 9:3251".
			expect(state.citation, state.abbr).toMatch(/[A-Za-z]/);
			expect(state.citation, state.abbr).toMatch(/\d/);
			if (state.citationUrl)
				expect(state.citationUrl, state.abbr).toMatch(/^https:\/\//);
		}
	});

	it("caps Alabama at one month (D1)", () => {
		expect(row("AL").maxDeposit).toBe("1 month");
		expect(row("AL").citation).toBe("Ala. Code § 35-9A-201");
	});

	it("carries the amended Maryland, Connecticut, Maine and Colorado rules (D2)", () => {
		expect(row("MD").maxDeposit).toBe("1 month");
		expect(row("CT").returnDeadline).toMatch(/^21 days/);
		expect(row("ME").returnDeadline).toBe("30 days (lease), 21 days (at will)");
		expect(row("CO").maxDeposit).toBe("2 months");
		expect(row("CO").returnDeadline).toMatch(/^30 days/);
	});

	it("marks interest wherever a statute can require it", () => {
		for (const abbr of [
			"CT",
			"DC",
			"IL",
			"MD",
			"MA",
			"MN",
			"NH",
			"NJ",
			"NM",
			"NY",
			"ND",
			"OH",
			"PA",
		])
			expect(row(abbr).interestRequired, abbr).toBe(true);
	});

	it("keeps cells short and free of em or en dashes", () => {
		for (const state of stateData) {
			for (const cell of [
				state.maxDeposit,
				state.returnDeadline,
				state.notes,
			]) {
				expect(cell, state.abbr).not.toMatch(/[–—]/);
			}
			expect(state.notes.length, state.abbr).toBeLessThanOrEqual(110);
		}
	});
});
