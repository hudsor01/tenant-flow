import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import {
	parseAsArrayOf,
	parseAsString,
	type SingleParser,
	type UseQueryStateOptions,
} from "nuqs";

export const ARRAY_SEPARATOR = ",";

export type FilterValues = Record<string, string | string[] | null>;
export type FilterParsers = Record<
	string,
	SingleParser<string> | SingleParser<string[]>
>;

/**
 * Build the per-column nuqs parser map. FACETED columns (those carrying
 * `meta.options`, e.g. the multi-select `status` filter) round-trip as
 * `parseAsArrayOf(string)`; plain search columns (e.g. `property`) round-trip
 * as a single string. The same faceted set gates the array-vs-string decision
 * in {@link deriveColumnFilters}, so a multi-word search ("elm street") on a
 * plain column stays one string instead of being split into an array that
 * matches nothing.
 */
export function buildFilterParsers<TData>(
	filterableColumns: ColumnDef<TData>[],
	facetedColumnIds: Set<string>,
	queryStateOptions: Omit<UseQueryStateOptions<string>, "parse">,
): FilterParsers {
	return filterableColumns.reduce<FilterParsers>((acc, column) => {
		const id = column.id ?? "";
		if (facetedColumnIds.has(id)) {
			acc[id] = parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withOptions(
				queryStateOptions,
			);
		} else {
			acc[id] = parseAsString.withOptions(queryStateOptions);
		}
		return acc;
	}, {});
}

/**
 * Project the live nuqs `filterValues` into TanStack `ColumnFiltersState`.
 * Array-ness is keyed off whether the column is FACETED, never off the value's
 * characters, so a multi-word search stays a single string.
 */
export function deriveColumnFilters(
	filterValues: FilterValues,
	facetedColumnIds: Set<string>,
): ColumnFiltersState {
	return Object.entries(filterValues).reduce<ColumnFiltersState>(
		(filters, [key, value]) => {
			if (value !== null) {
				const processedValue =
					facetedColumnIds.has(key) && !Array.isArray(value) ? [value] : value;
				filters.push({ id: key, value: processedValue });
			}
			return filters;
		},
		[],
	);
}

/**
 * Translate a `ColumnFiltersState` into the nuqs update payload. Filters dropped
 * since `prev` are set to `null` so their URL key is cleared.
 */
export function toFilterUpdates<TData>(
	next: ColumnFiltersState,
	prev: ColumnFiltersState,
	filterableColumns: ColumnDef<TData>[],
): FilterValues {
	const updates = next.reduce<FilterValues>((acc, filter) => {
		if (filterableColumns.find((column) => column.id === filter.id)) {
			acc[filter.id] = filter.value as string | string[];
		}
		return acc;
	}, {});
	for (const prevFilter of prev) {
		if (!next.some((filter) => filter.id === prevFilter.id)) {
			updates[prevFilter.id] = null;
		}
	}
	return updates;
}

/**
 * Structural equality for two `ColumnFiltersState` snapshots (order-sensitive,
 * which is fine since both sides are derived from the same `filterValues`).
 */
export function filtersEqual(
	a: ColumnFiltersState,
	b: ColumnFiltersState,
): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}
