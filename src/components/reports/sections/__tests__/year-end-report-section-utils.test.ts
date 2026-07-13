import { describe, expect, it } from "vitest";

import {
	type ExpenseCategoryTotal,
	sortExpenseCategoriesDesc,
} from "../year-end-report-section-utils";

describe("sortExpenseCategoriesDesc", () => {
	it("returns categories sorted by amount descending", () => {
		const input: ExpenseCategoryTotal[] = [
			{ category: "utilities", amount: 200 },
			{ category: "maintenance", amount: 900 },
			{ category: "insurance", amount: 500 },
		];
		expect(sortExpenseCategoriesDesc(input).map((c) => c.category)).toEqual([
			"maintenance",
			"insurance",
			"utilities",
		]);
	});

	// COMP-13 regression: the source array is a TanStack Query cache entry; an
	// in-place `.sort()` during render mutated shared cache state. The helper
	// must copy first and leave the input untouched.
	it("does not mutate the input array", () => {
		const input: ExpenseCategoryTotal[] = [
			{ category: "utilities", amount: 200 },
			{ category: "maintenance", amount: 900 },
		];
		const snapshot = input.map((c) => c.category);
		const result = sortExpenseCategoriesDesc(input);

		expect(input.map((c) => c.category)).toEqual(snapshot);
		expect(result).not.toBe(input);
	});
});
