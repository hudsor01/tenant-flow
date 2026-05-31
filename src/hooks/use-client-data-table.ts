"use client";

import {
	type ColumnFiltersState,
	getCoreRowModel,
	getFacetedMinMaxValues,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type RowSelectionState,
	type SortingState,
	type TableOptions,
	type TableState,
	type Updater,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import {
	parseAsInteger,
	type UseQueryStateOptions,
	useQueryState,
	useQueryStates,
} from "nuqs";
import type { TransitionStartFunction } from "react";
import { useEffect, useRef, useState } from "react";

import {
	buildFilterParsers,
	deriveColumnFilters,
	type FilterValues,
	filtersEqual,
	toFilterUpdates,
} from "#hooks/use-client-data-table.helpers";
import { useDebouncedCallback } from "#hooks/use-debounced-callback";
import { getSortingStateParser } from "#lib/parsers";
import type { ExtendedColumnSort, QueryKeys } from "#types/data-table";

const DEFAULTS = {
	page: "page",
	perPage: "perPage",
	sort: "sort",
	filters: "filters",
	joinOperator: "joinOperator",
} as const;
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

interface UseClientDataTableProps<TData>
	extends Omit<
		TableOptions<TData>,
		| "state"
		| "pageCount"
		| "getCoreRowModel"
		| "manualFiltering"
		| "manualPagination"
		| "manualSorting"
	> {
	initialState?: Omit<Partial<TableState>, "sorting"> & {
		sorting?: ExtendedColumnSort<TData>[];
	};
	queryKeys?: Partial<QueryKeys>;
	history?: "push" | "replace";
	debounceMs?: number;
	throttleMs?: number;
	clearOnDefault?: boolean;
	scroll?: boolean;
	shallow?: boolean;
	startTransition?: TransitionStartFunction;
	/**
	 * Optional controlled column visibility. When supplied (e.g. sourced from the
	 * persisted dashboard-presets-store per Phase-5 decision D-3), the parent owns
	 * visibility and changes flow through `onColumnVisibilityChange`. When absent,
	 * the hook falls back to internal `useState` (uncontrolled default).
	 */
	columnVisibility?: VisibilityState;
	onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

export function useClientDataTable<TData>(
	props: UseClientDataTableProps<TData>,
) {
	const {
		columns,
		initialState,
		queryKeys,
		history = "replace",
		debounceMs = DEBOUNCE_MS,
		throttleMs = THROTTLE_MS,
		clearOnDefault = false,
		scroll = false,
		shallow = true,
		startTransition,
		columnVisibility: controlledColumnVisibility,
		onColumnVisibilityChange: controlledOnColumnVisibilityChange,
		// Default ON to preserve every existing consumer; a table with no selection
		// column (e.g. the dashboard portfolio) passes `false` so the footer can
		// suppress the misleading "N of M row(s) selected" summary.
		enableRowSelection = true,
		...tableProps
	} = props;
	const pageKey = queryKeys?.page ?? DEFAULTS.page;
	const perPageKey = queryKeys?.perPage ?? DEFAULTS.perPage;
	const sortKey = queryKeys?.sort ?? DEFAULTS.sort;
	const filtersKey = queryKeys?.filters ?? DEFAULTS.filters;
	const joinOperatorKey = queryKeys?.joinOperator ?? DEFAULTS.joinOperator;

	const queryStateOptions: Omit<UseQueryStateOptions<string>, "parse"> = {
		history,
		scroll,
		shallow,
		throttleMs,
		clearOnDefault,
		...(startTransition ? { startTransition } : {}),
	};

	const [rowSelection, setRowSelection] = useState<RowSelectionState>(
		initialState?.rowSelection ?? {},
	);
	const [internalColumnVisibility, setInternalColumnVisibility] =
		useState<VisibilityState>(initialState?.columnVisibility ?? {});

	// Resolve the EFFECTIVE visibility + change handler: controlled prop wins,
	// internal useState is the uncontrolled fallback. Exactly one source of truth
	// flows into the table state.
	const columnVisibility =
		controlledColumnVisibility ?? internalColumnVisibility;
	const onColumnVisibilityChange =
		controlledOnColumnVisibilityChange ?? setInternalColumnVisibility;

	const [page, setPage] = useQueryState(
		pageKey,
		parseAsInteger.withOptions(queryStateOptions).withDefault(1),
	);
	const [perPage, setPerPage] = useQueryState(
		perPageKey,
		parseAsInteger
			.withOptions(queryStateOptions)
			.withDefault(initialState?.pagination?.pageSize ?? 10),
	);

	const pagination: PaginationState = {
		pageIndex: page - 1,
		pageSize: perPage,
	};

	const onPaginationChange = (updaterOrValue: Updater<PaginationState>) => {
		const next =
			typeof updaterOrValue === "function"
				? updaterOrValue(pagination)
				: updaterOrValue;
		void setPage(next.pageIndex + 1);
		void setPerPage(next.pageSize);
	};

	const columnIds = new Set(
		columns.map((column) => column.id).filter(Boolean) as string[],
	);

	const [sorting, setSorting] = useQueryState(
		sortKey,
		getSortingStateParser<TData>(columnIds)
			.withOptions(queryStateOptions)
			.withDefault(initialState?.sorting ?? []),
	);

	const onSortingChange = (updaterOrValue: Updater<SortingState>) => {
		const next =
			typeof updaterOrValue === "function"
				? updaterOrValue(sorting)
				: updaterOrValue;
		setSorting(next as ExtendedColumnSort<TData>[]);
	};

	const filterableColumns = columns.filter(
		(column) => column.enableColumnFilter,
	);

	const facetedColumnIds = new Set(
		filterableColumns
			.filter((column) => column.meta?.options)
			.map((column) => column.id)
			.filter(Boolean) as string[],
	);

	const filterParsers = buildFilterParsers(
		filterableColumns,
		facetedColumnIds,
		queryStateOptions,
	);

	const [filterValues, setFilterValues] = useQueryStates(filterParsers);

	// SYNCHRONOUS mirror of the derived filters. The controlled search Input reads
	// table state for its value, so the mirror must update on the SAME render as
	// the keystroke — a pure per-render derivation from the DEBOUNCED nuqs write
	// would snap the input back to the stale value between keystrokes (the freeze
	// regression). nuqs remains the durable source of truth; this is the
	// instant-feedback cache that the debounced URL write reconciles into.
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
		deriveColumnFilters(filterValues, facetedColumnIds),
	);

	const debouncedSetFilterValues = useDebouncedCallback(
		(values: FilterValues) => {
			void setPage(1);
			void setFilterValues(values);
		},
		debounceMs,
	);

	// `onColumnFiltersChange` updates the mirror SYNCHRONOUSLY (instant input
	// feedback) and debounces ONLY the URL write. The next render keeps the mirror
	// it just set; the resync effect below is a no-op because the debounced write
	// lands a `filterValues` already equal to the mirror.
	const onColumnFiltersChange = (
		updaterOrValue: Updater<ColumnFiltersState>,
	) => {
		const next =
			typeof updaterOrValue === "function"
				? updaterOrValue(columnFilters)
				: updaterOrValue;
		setColumnFilters(next);
		debouncedSetFilterValues(
			toFilterUpdates(next, columnFilters, filterableColumns),
		);
	};

	// Resync from EXTERNAL nuqs writes — preset apply, refresh, deep-link,
	// back/forward. This must fire ONLY when the serialized URL filters actually
	// change, NOT on every render: `facetedColumnIds` is a fresh Set each render,
	// so an unguarded effect would re-run constantly and, mid-typing (before the
	// debounced write lands), recompute `derived` from the still-stale empty
	// `filterValues` and clobber the just-typed mirror back to empty (the freeze
	// regression). The ref-gated key makes the effect a no-op until an actual URL
	// change; our own debounced write then lands a value already equal to the
	// mirror, so `filtersEqual` bails (no loop).
	const filterValuesKey = JSON.stringify(filterValues);
	const lastFilterKeyRef = useRef(filterValuesKey);
	useEffect(() => {
		if (lastFilterKeyRef.current === filterValuesKey) return;
		lastFilterKeyRef.current = filterValuesKey;
		const derived = deriveColumnFilters(filterValues, facetedColumnIds);
		setColumnFilters((prev) => (filtersEqual(prev, derived) ? prev : derived));
	}, [filterValuesKey, filterValues, facetedColumnIds]);

	const table = useReactTable({
		...tableProps,
		columns,
		...(initialState ? { initialState } : {}),
		state: {
			pagination,
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
		},
		defaultColumn: { ...tableProps.defaultColumn, enableColumnFilter: false },
		enableRowSelection,
		onRowSelectionChange: setRowSelection,
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		onColumnVisibilityChange,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFacetedMinMaxValues: getFacetedMinMaxValues(),
		manualPagination: false,
		manualSorting: false,
		manualFiltering: false,
		meta: {
			readOnly: false,
			...tableProps.meta,
			queryKeys: {
				page: pageKey,
				perPage: perPageKey,
				sort: sortKey,
				filters: filtersKey,
				joinOperator: joinOperatorKey,
			},
		},
	});

	return { table, shallow, debounceMs, throttleMs };
}
