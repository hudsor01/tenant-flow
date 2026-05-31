import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import type { UseQueryStateOptions } from "nuqs";
import { describe, expect, it } from "vitest";

import {
	buildFilterParsers,
	deriveColumnFilters,
	filtersEqual,
	toFilterUpdates,
} from "#hooks/use-client-data-table.helpers";

interface FacetRow {
	property: string;
	status: string;
}

// Minimal filterable column defs: `status` is faceted (carries meta.options),
// `property` is a plain search column. Only `id` is read by the helpers.
const FILTERABLE_COLUMNS: ColumnDef<FacetRow>[] = [
	{ id: "property" },
	{ id: "status", meta: { options: [{ label: "Active", value: "active" }] } },
];

// The withOptions argument buildFilterParsers forwards; shape is irrelevant to
// the parse behavior asserted below, so an empty options object suffices.
const QUERY_STATE_OPTIONS = {} as Omit<UseQueryStateOptions<string>, "parse">;

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

describe("buildFilterParsers", () => {
	it("returns an ARRAY parser for faceted columns and a STRING parser otherwise", () => {
		const parsers = buildFilterParsers(
			FILTERABLE_COLUMNS,
			new Set(["status"]),
			QUERY_STATE_OPTIONS,
		);

		// Behavioral probe: the faceted `status` parser splits on the ARRAY_SEPARATOR
		// into an array; the plain `property` parser keeps the raw string intact (so a
		// multi-word search like "elm street" stays one string, never split).
		expect(parsers.status?.parse("active,vacant")).toEqual([
			"active",
			"vacant",
		]);
		expect(parsers.property?.parse("elm street")).toBe("elm street");
	});

	it("builds a parser keyed by every filterable column id", () => {
		const parsers = buildFilterParsers(
			FILTERABLE_COLUMNS,
			new Set(["status"]),
			QUERY_STATE_OPTIONS,
		);
		expect(Object.keys(parsers).sort()).toEqual(["property", "status"]);
	});
});

describe("toFilterUpdates", () => {
	it("emits the new/changed filter values for known columns", () => {
		const next: ColumnFiltersState = [
			{ id: "property", value: "elm" },
			{ id: "status", value: ["active"] },
		];
		const updates = toFilterUpdates(next, [], FILTERABLE_COLUMNS);
		expect(updates).toEqual({ property: "elm", status: ["active"] });
	});

	it("emits a null removal branch for a filter dropped since prev (cleared key)", () => {
		// `prev` had a property filter; `next` no longer does, so the URL key must be
		// cleared to null (the removal branch). status carries forward unchanged.
		const prev: ColumnFiltersState = [
			{ id: "property", value: "elm" },
			{ id: "status", value: ["active"] },
		];
		const next: ColumnFiltersState = [{ id: "status", value: ["active"] }];
		const updates = toFilterUpdates(next, prev, FILTERABLE_COLUMNS);
		expect(updates.property).toBeNull();
		expect(updates.status).toEqual(["active"]);
	});

	it("ignores next filters whose column id is not filterable", () => {
		const next: ColumnFiltersState = [{ id: "unknown", value: "x" }];
		const updates = toFilterUpdates(next, [], FILTERABLE_COLUMNS);
		expect(updates).toEqual({});
	});
});

describe("filtersEqual", () => {
	it("returns true for structurally identical snapshots", () => {
		const a: ColumnFiltersState = [{ id: "status", value: ["active"] }];
		const b: ColumnFiltersState = [{ id: "status", value: ["active"] }];
		expect(filtersEqual(a, b)).toBe(true);
	});

	it("returns false when a value differs", () => {
		const a: ColumnFiltersState = [{ id: "status", value: ["active"] }];
		const b: ColumnFiltersState = [{ id: "status", value: ["vacant"] }];
		expect(filtersEqual(a, b)).toBe(false);
	});

	it("returns false when the filter set differs (added/removed key)", () => {
		const a: ColumnFiltersState = [{ id: "status", value: ["active"] }];
		const b: ColumnFiltersState = [
			{ id: "status", value: ["active"] },
			{ id: "property", value: "elm" },
		];
		expect(filtersEqual(a, b)).toBe(false);
	});
});
