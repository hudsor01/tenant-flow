import { describe, expect, it } from "vitest";

import { deriveColumnFilters } from "#hooks/use-client-data-table.helpers";

describe("deriveColumnFilters", () => {
	it("projects a plain (non-faceted) string value as a single filter", () => {
		const result = deriveColumnFilters({ property: "elm" }, new Set());
		expect(result).toEqual([{ id: "property", value: "elm" }]);
	});

	it("wraps a faceted scalar value into an array", () => {
		const result = deriveColumnFilters(
			{ status: "active" },
			new Set(["status"]),
		);
		expect(result).toEqual([{ id: "status", value: ["active"] }]);
	});

	it("passes a faceted array value through unchanged", () => {
		const result = deriveColumnFilters(
			{ status: ["active", "vacant"] },
			new Set(["status"]),
		);
		expect(result).toEqual([{ id: "status", value: ["active", "vacant"] }]);
	});

	it("skips a null value (cleared filter)", () => {
		expect(deriveColumnFilters({ property: null }, new Set())).toEqual([]);
	});

	it("skips an empty-string search value (?property=) so it reads as no-filter", () => {
		// TanStack auto-removes an empty filter, so emitting one here would leave a
		// persistent mirror filter the table never keeps.
		expect(deriveColumnFilters({ property: "" }, new Set())).toEqual([]);
	});

	it("skips an empty faceted array so it reads as no-filter", () => {
		expect(deriveColumnFilters({ status: [] }, new Set(["status"]))).toEqual(
			[],
		);
	});

	it("keeps non-empty filters while dropping empty siblings", () => {
		const result = deriveColumnFilters(
			{ property: "", status: ["active"] },
			new Set(["status"]),
		);
		expect(result).toEqual([{ id: "status", value: ["active"] }]);
	});
});
