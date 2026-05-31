import type { ColumnDef, FilterFn } from "@tanstack/react-table";
import { act, renderHook } from "@testing-library/react";
import {
	NuqsTestingAdapter,
	type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClientDataTable } from "#hooks/use-client-data-table";
import { getSortingStateParser } from "#lib/parsers";

// The global unit-setup.ts mocks nuqs so `useQueryState`/`useQueryStates` return
// null and swallow writes (to avoid the Next.js app-router dependency elsewhere).
// This hook's entire contract IS the nuqs round-trip, so we restore the real
// implementation here and drive it through nuqs's own NuqsTestingAdapter.
vi.unmock("nuqs");

interface TestRow {
	id: string;
	n: number;
	address: string;
}

// Faceted (array) filter: keep a row when its stringified value is one of the
// selected option values. The TanStack default filterFn does string `includes`,
// which would not match a numeric cell against a selected string array; an
// explicit fn makes the client-side faceted filter (DT-04) behave like the real
// portfolio status filter.
const inSelectedValues: FilterFn<TestRow> = (row, columnId, filterValue) => {
	if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
	return (filterValue as string[]).includes(String(row.getValue(columnId)));
};

// Plain-string search filter: case-insensitive substring against the address.
// Mirrors the portfolio "property" search column (a single string, NOT faceted),
// so a multi-word query must survive as one string rather than being split.
const addressIncludes: FilterFn<TestRow> = (row, columnId, filterValue) => {
	const query = String(filterValue).toLowerCase();
	return String(row.getValue(columnId)).toLowerCase().includes(query);
};

const columns: ColumnDef<TestRow>[] = [
	{ id: "id", accessorKey: "id" },
	{
		id: "n",
		accessorKey: "n",
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: inSelectedValues,
		meta: { options: [{ label: "Five", value: "5" }] },
	},
	{
		// Plain (non-faceted) search column: no meta.options.
		id: "address",
		accessorKey: "address",
		enableColumnFilter: true,
		filterFn: addressIncludes,
	},
];

function makeRows(count: number): TestRow[] {
	return Array.from({ length: count }, (_, index) => ({
		id: String(index),
		n: index,
		address: `${index} Main St`,
	}));
}

function makeWrapper(options?: {
	searchParams?: string | Record<string, string>;
	onUrlUpdate?: OnUrlUpdateFunction;
}) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<NuqsTestingAdapter
				hasMemory
				{...(options?.searchParams !== undefined
					? { searchParams: options.searchParams }
					: {})}
				{...(options?.onUrlUpdate ? { onUrlUpdate: options.onUrlUpdate } : {})}
			>
				{children}
			</NuqsTestingAdapter>
		);
	};
}

// renderHook + flush nuqs's mount effects (the testing adapter resolves
// searchParams/defaults inside a useEffect, so a synchronous render leaves the
// state pending for one cycle).
async function renderClientHook(
	props: Parameters<typeof useClientDataTable<TestRow>>[0],
	wrapperOptions?: Parameters<typeof makeWrapper>[0],
) {
	let result!: ReturnType<
		typeof renderHook<ReturnType<typeof useClientDataTable<TestRow>>, void>
	>["result"];
	await act(async () => {
		result = renderHook(() => useClientDataTable<TestRow>(props), {
			wrapper: makeWrapper(wrapperOptions),
		}).result;
	});
	return result;
}

// Flush nuqs's URL-write queue, which resolves on a real macrotask
// (setTimeout-based throttle). 400ms covers the hook's 300ms filter debounce
// plus the nuqs throttle window.
async function flushUrlWrites(ms = 400) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

beforeEach(() => {
	vi.useRealTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useClientDataTable", () => {
	it("sets all three manual flags to false (TanStack owns row math)", async () => {
		const result = await renderClientHook({ data: makeRows(3), columns });

		expect(result.current.table.options.manualPagination).toBe(false);
		expect(result.current.table.options.manualSorting).toBe(false);
		expect(result.current.table.options.manualFiltering).toBe(false);
	});

	it("computes page count from the in-memory array and recomputes after a filter", async () => {
		const result = await renderClientHook({ data: makeRows(25), columns });

		// 25 rows / 10 per page = 3 pages, TanStack-computed (not a frozen prop).
		expect(result.current.table.getPageCount()).toBe(3);

		// Narrow to a single matching row -> page count recomputes to 1 (proves the
		// count is NOT frozen by a pageCount prop). Filters now flow through nuqs as
		// the single source of truth (debounced), so flush the write before asserting.
		await act(async () => {
			result.current.table.getColumn("n")?.setFilterValue(["5"]);
		});
		await flushUrlWrites();

		expect(result.current.table.getFilteredRowModel().rows).toHaveLength(1);
		expect(result.current.table.getPageCount()).toBe(1);
	});

	it("mirrors sort to the URL in getSortingStateParser wire format", async () => {
		const onUrlUpdate = vi.fn();
		const result = await renderClientHook(
			{ data: makeRows(5), columns },
			{ onUrlUpdate },
		);

		await act(async () => {
			result.current.table.getColumn("n")?.toggleSorting(true);
		});
		await flushUrlWrites();

		const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0];
		expect(lastCall).toBeDefined();
		const sortParam = lastCall?.searchParams.get("sort");
		expect(sortParam).not.toBeNull();
		const deserialized = getSortingStateParser<TestRow>(["id", "n"]).parse(
			sortParam ?? "",
		);
		expect(deserialized).toEqual([{ id: "n", desc: true }]);
	});

	it("writes a comma-joined array filter param and resets page to 1 (debounced)", async () => {
		const onUrlUpdate = vi.fn();
		const result = await renderClientHook(
			{ data: makeRows(25), columns },
			{ searchParams: { page: "2" }, onUrlUpdate },
		);

		// Starts on page 2 from the URL (source of truth on mount).
		expect(result.current.table.getState().pagination.pageIndex).toBe(1);

		await act(async () => {
			result.current.table.getColumn("n")?.setFilterValue(["active", "vacant"]);
		});
		// Past the 300ms debounce -> setPage(1) then setFilterValues, then flush
		// the nuqs throttle so the write lands on the URL.
		await flushUrlWrites();

		const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0];
		expect(lastCall).toBeDefined();
		expect(lastCall?.searchParams.get("n")).toBe("active,vacant");
		expect(lastCall?.searchParams.get("page")).toBe("1");
	});

	it("hydrates table state from the URL on mount (URL is source of truth)", async () => {
		const result = await renderClientHook(
			{ data: makeRows(25), columns },
			{
				searchParams: {
					page: "2",
					sort: '[{"id":"n","desc":true}]',
				},
			},
		);

		expect(result.current.table.getState().pagination.pageIndex).toBe(1);
		expect(result.current.table.getState().sorting).toEqual([
			{ id: "n", desc: true },
		]);
	});

	it("re-filters when an EXTERNAL nuqs write changes property+status (URL is the single source of truth)", async () => {
		const data: TestRow[] = [
			{ id: "0", n: 0, address: "1 Elm Street" },
			{ id: "1", n: 5, address: "2 Oak Avenue" },
			{ id: "2", n: 5, address: "3 Elm Street" },
		];
		// Render under a controllable URL: an external setUrlState write (preset
		// apply / back-forward / shared URL) must re-flow into columnFilters.
		let setUrl!: (params: Record<string, string>) => void;
		function Adapter({ children }: { children: ReactNode }) {
			const [params, setParams] = useState<Record<string, string>>({});
			setUrl = setParams;
			return (
				<NuqsTestingAdapter hasMemory searchParams={params}>
					{children}
				</NuqsTestingAdapter>
			);
		}

		let result!: ReturnType<
			typeof renderHook<ReturnType<typeof useClientDataTable<TestRow>>, void>
		>["result"];
		await act(async () => {
			result = renderHook(
				() => useClientDataTable<TestRow>({ data, columns }),
				{
					wrapper: Adapter,
				},
			).result;
		});

		// No filters yet -> all rows present.
		expect(result.current.table.getFilteredRowModel().rows).toHaveLength(3);

		// EXTERNAL write to the URL (NOT through the table API): faceted status `n`
		// + plain search `address`. This is the preset-apply path the old useState
		// seed silently dropped.
		await act(async () => {
			setUrl({ n: "5", address: "elm" });
		});

		// Both filters apply: n===5 AND address contains "elm" -> only row "2".
		const filtered = result.current.table.getFilteredRowModel().rows;
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.id).toBe("2");
	});

	it("hydrates a multi-word search from the URL as a single string (no array split)", async () => {
		const data: TestRow[] = [
			{ id: "0", n: 0, address: "42 Elm Street" },
			{ id: "1", n: 1, address: "7 Oak Avenue" },
		];
		const result = await renderClientHook(
			{ data, columns },
			// "elm street" is two words. The old reduce split on non-alphanumerics
			// into ["elm","street"] (an array), which a single-string filterFn could
			// not match. Faceted-keyed array logic keeps it a single string.
			{ searchParams: { address: "elm street" } },
		);

		const addressFilter = result.current.table
			.getState()
			.columnFilters.find((filter) => filter.id === "address");
		expect(addressFilter?.value).toBe("elm street");

		const filtered = result.current.table.getFilteredRowModel().rows;
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.id).toBe("0");
	});

	it("round-trips controlled columnVisibility and falls back to internal state when uncontrolled", async () => {
		const onColumnVisibilityChange = vi.fn();
		const controlled = await renderClientHook({
			data: makeRows(3),
			columns,
			columnVisibility: { n: false },
			onColumnVisibilityChange,
		});

		// Parent-supplied visibility is reflected in table state.
		expect(controlled.current.table.getState().columnVisibility).toEqual({
			n: false,
		});

		// Toggling fires the PARENT handler (parent owns the change, not internal
		// state).
		await act(async () => {
			controlled.current.table.getColumn("n")?.toggleVisibility();
		});
		expect(onColumnVisibilityChange).toHaveBeenCalledTimes(1);

		// Uncontrolled fallback: no props -> internal useState drives visibility,
		// and the parent spy is never called.
		const uncontrolled = await renderClientHook({
			data: makeRows(3),
			columns,
		});

		expect(uncontrolled.current.table.getColumn("n")?.getIsVisible()).toBe(
			true,
		);
		await act(async () => {
			uncontrolled.current.table.getColumn("n")?.toggleVisibility();
		});
		expect(uncontrolled.current.table.getColumn("n")?.getIsVisible()).toBe(
			false,
		);
		expect(onColumnVisibilityChange).toHaveBeenCalledTimes(1);
	});
});
