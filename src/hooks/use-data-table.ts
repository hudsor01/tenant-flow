'use client'

import {
	type ColumnFiltersState, getCoreRowModel, getFacetedMinMaxValues,
	getFacetedRowModel, getFacetedUniqueValues, getFilteredRowModel,
	getPaginationRowModel, getSortedRowModel,
	type PaginationState, type RowSelectionState, type SortingState,
	type TableOptions, type TableState, type Updater,
	useReactTable, type VisibilityState
} from '@tanstack/react-table'
import {
	parseAsArrayOf, parseAsInteger, parseAsString,
	type SingleParser, type UseQueryStateOptions,
	useQueryState, useQueryStates
} from 'nuqs'
import { useState } from 'react'
import type { TransitionStartFunction } from 'react'

import { useDebouncedCallback } from '#hooks/use-debounced-callback'
import { getSortingStateParser } from '#lib/parsers'
import type { ExtendedColumnSort, QueryKeys } from '#types/data-table.js'

const DEFAULTS = { page: 'page', perPage: 'perPage', sort: 'sort', filters: 'filters', joinOperator: 'joinOperator' } as const
const ARRAY_SEPARATOR = ','
const DEBOUNCE_MS = 300
const THROTTLE_MS = 50

interface UseDataTableProps<TData>
	extends
		Omit<TableOptions<TData>, 'state' | 'pageCount' | 'getCoreRowModel' | 'manualFiltering' | 'manualPagination' | 'manualSorting'>,
		Required<Pick<TableOptions<TData>, 'pageCount'>> {
	initialState?: Omit<Partial<TableState>, 'sorting'> & { sorting?: ExtendedColumnSort<TData>[] }
	queryKeys?: Partial<QueryKeys>
	history?: 'push' | 'replace'
	debounceMs?: number
	throttleMs?: number
	clearOnDefault?: boolean
	enableAdvancedFilter?: boolean
	scroll?: boolean
	shallow?: boolean
	startTransition?: TransitionStartFunction
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
	const {
		columns, pageCount = -1, initialState, queryKeys,
		history = 'replace', debounceMs = DEBOUNCE_MS, throttleMs = THROTTLE_MS,
		clearOnDefault = false, enableAdvancedFilter = false,
		scroll = false, shallow = true, startTransition, ...tableProps
	} = props
	const pageKey = queryKeys?.page ?? DEFAULTS.page
	const perPageKey = queryKeys?.perPage ?? DEFAULTS.perPage
	const sortKey = queryKeys?.sort ?? DEFAULTS.sort
	const filtersKey = queryKeys?.filters ?? DEFAULTS.filters
	const joinOperatorKey = queryKeys?.joinOperator ?? DEFAULTS.joinOperator

	const queryStateOptions: Omit<UseQueryStateOptions<string>, 'parse'> = { history, scroll, shallow, throttleMs, clearOnDefault, ...(startTransition ? { startTransition } : {}) }

	const [rowSelection, setRowSelection] = useState<RowSelectionState>(initialState?.rowSelection ?? {})
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialState?.columnVisibility ?? {})

	const [page, setPage] = useQueryState(pageKey, parseAsInteger.withOptions(queryStateOptions).withDefault(1))
	const [perPage, setPerPage] = useQueryState(
		perPageKey, parseAsInteger.withOptions(queryStateOptions).withDefault(initialState?.pagination?.pageSize ?? 10)
	)

	const pagination: PaginationState = ({ pageIndex: page - 1, pageSize: perPage })

	const onPaginationChange = (updaterOrValue: Updater<PaginationState>) => {
			const next = typeof updaterOrValue === 'function' ? updaterOrValue(pagination) : updaterOrValue
			void setPage(next.pageIndex + 1)
			void setPerPage(next.pageSize)
		}

	const columnIds = new Set(columns.map(column => column.id).filter(Boolean) as string[])

	const [sorting, setSorting] = useQueryState(
		sortKey,
		getSortingStateParser<TData>(columnIds).withOptions(queryStateOptions).withDefault(initialState?.sorting ?? [])
	)

	const onSortingChange = (updaterOrValue: Updater<SortingState>) => {
			const next = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue
			setSorting(next as ExtendedColumnSort<TData>[])
		}

	const filterableColumns = (() => {
		if (enableAdvancedFilter) return []
		return columns.filter(column => column.enableColumnFilter)
	})()

	const filterParsers = (() => {
		if (enableAdvancedFilter) return {}
		return filterableColumns.reduce<Record<string, SingleParser<string> | SingleParser<string[]>>>((acc, column) => {
			if (column.meta?.options) {
				acc[column.id ?? ''] = parseAsArrayOf(parseAsString, ARRAY_SEPARATOR).withOptions(queryStateOptions)
			} else {
				acc[column.id ?? ''] = parseAsString.withOptions(queryStateOptions)
			}
			return acc
		}, {})
	})()

	const [filterValues, setFilterValues] = useQueryStates(filterParsers)

	const debouncedSetFilterValues = useDebouncedCallback(
		(values: typeof filterValues) => { void setPage(1); void setFilterValues(values) },
		debounceMs
	)

	const initialColumnFilters: ColumnFiltersState = (() => {
		if (enableAdvancedFilter) return []
		return Object.entries(filterValues).reduce<ColumnFiltersState>((filters, [key, value]) => {
			if (value !== null) {
				const processedValue = Array.isArray(value) ? value
					: typeof value === 'string' && /[^a-zA-Z0-9]/.test(value) ? value.split(/[^a-zA-Z0-9]+/).filter(Boolean) : [value]
				filters.push({ id: key, value: processedValue })
			}
			return filters
		}, [])
	})()

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialColumnFilters)

	const onColumnFiltersChange = (updaterOrValue: Updater<ColumnFiltersState>) => {
			if (enableAdvancedFilter) return
			setColumnFilters(prev => {
				const next = typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue
				const filterUpdates = next.reduce<Record<string, string | string[] | null>>((acc, filter) => {
					if (filterableColumns.find(column => column.id === filter.id)) {
						acc[filter.id] = filter.value as string | string[]
					}
					return acc
				}, {})
				for (const prevFilter of prev) {
					if (!next.some(filter => filter.id === prevFilter.id)) {
						filterUpdates[prevFilter.id] = null
					}
				}
				debouncedSetFilterValues(filterUpdates)
				return next
			})
		}

	const table = useReactTable({
		...tableProps,
		columns,
		...(initialState ? { initialState } : {}),
		pageCount,
		state: { pagination, sorting, columnVisibility, rowSelection, columnFilters },
		defaultColumn: { ...tableProps.defaultColumn, enableColumnFilter: false },
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFacetedMinMaxValues: getFacetedMinMaxValues(),
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		meta: {
			readOnly: false,
			...tableProps.meta,
			queryKeys: { page: pageKey, perPage: perPageKey, sort: sortKey, filters: filtersKey, joinOperator: joinOperatorKey }
		}
	})

	return { table, shallow, debounceMs, throttleMs }
}
