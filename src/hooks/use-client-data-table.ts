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
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	type SingleParser,
	type UseQueryStateOptions,
	useQueryState,
	useQueryStates,
} from "nuqs";
import type { TransitionStartFunction } from "react";
import { useState } from "react";

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
const ARRAY_SEPARATOR = ",";
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

	const filterParsers = filterableColumns.reduce<
		Record<string, SingleParser<string> | SingleParser<string[]>>
	>((acc, column) => {
		if (column.meta?.options) {
			acc[column.id ?? ""] = parseAsArrayOf(
				parseAsString,
				ARRAY_SEPARATOR,
			).withOptions(queryStateOptions);
		} else {
			acc[column.id ?? ""] = parseAsString.withOptions(queryStateOptions);
		}
		return acc;
	}, {});

	const [filterValues, setFilterValues] = useQueryStates(filterParsers);

	const debouncedSetFilterValues = useDebouncedCallback(
		(values: typeof filterValues) => {
			void setPage(1);
			void setFilterValues(values);
		},
		debounceMs,
	);

	const initialColumnFilters: ColumnFiltersState = Object.entries(
		filterValues,
	).reduce<ColumnFiltersState>((filters, [key, value]) => {
		if (value !== null) {
			const processedValue = Array.isArray(value)
				? value
				: typeof value === "string" && /[^a-zA-Z0-9]/.test(value)
					? value.split(/[^a-zA-Z0-9]+/).filter(Boolean)
					: [value];
			filters.push({ id: key, value: processedValue });
		}
		return filters;
	}, []);

	const [columnFilters, setColumnFilters] =
		useState<ColumnFiltersState>(initialColumnFilters);

	const onColumnFiltersChange = (
		updaterOrValue: Updater<ColumnFiltersState>,
	) => {
		setColumnFilters((prev) => {
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(prev)
					: updaterOrValue;
			const filterUpdates = next.reduce<
				Record<string, string | string[] | null>
			>((acc, filter) => {
				if (filterableColumns.find((column) => column.id === filter.id)) {
					acc[filter.id] = filter.value as string | string[];
				}
				return acc;
			}, {});
			for (const prevFilter of prev) {
				if (!next.some((filter) => filter.id === prevFilter.id)) {
					filterUpdates[prevFilter.id] = null;
				}
			}
			debouncedSetFilterValues(filterUpdates);
			return next;
		});
	};

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
		enableRowSelection: true,
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
