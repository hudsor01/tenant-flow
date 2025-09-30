import * as React from 'react'

import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState
} from '@tanstack/react-table'
import {
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'

import type { DataTableProps } from '@repo/shared/types/frontend'

export function useDataTableInstance<TData, TValue>({
	data,
	columns,
	enableRowSelection = true,
	defaultPageIndex,
	defaultPageSize,
	getRowId
}: DataTableProps<TData> & { columns: ColumnDef<TData, TValue>[] }) {
	const [rowSelection, setRowSelection] = React.useState({})
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	)
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [pagination, setPagination] = React.useState({
		pageIndex: defaultPageIndex ?? 0,
		pageSize: defaultPageSize ?? 10
	})

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
			pagination
		},
		enableRowSelection,
		getRowId:
			getRowId ?? (row => (row as { id: string | number }).id.toString()),
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
	})

	return table
}
