'use client'

import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState
} from '@tanstack/react-table'
import {
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import {
	ChevronDown,
	Columns3,
	Download,
	Plus,
	Search,
	Trash2
} from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/design-system'
import { LoadingSpinner } from '@/components/magicui/loading-spinner'

// Generic DataTable props that work with any data type
export interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	isLoading?: boolean
	error?: string | null
	searchPlaceholder?: string
	onAdd?: () => void
	onExport?: (data: TData[]) => void
	onDeleteSelected?: (data: TData[]) => void
	addButtonText?: string
	emptyStateTitle?: string
	emptyStateDescription?: string
	emptyIcon?: React.ComponentType<{ className?: string }>
	filters?: React.ReactNode
	pageSize?: number
	enableRowSelection?: boolean
	getRowId?: (row: TData) => string
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading = false,
	error,
	searchPlaceholder = 'Search...',
	onAdd,
	onExport,
	onDeleteSelected,
	addButtonText = 'Add New',
	emptyStateTitle = 'No data found',
	emptyStateDescription = 'Get started by adding your first item',
	emptyIcon: EmptyIcon,
	filters,
	pageSize = 15,
	enableRowSelection = true,
	getRowId
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = React.useState({})
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})
	const [columnFilters, setColumnFilters] =
		React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [pagination, setPagination] = React.useState({
		pageIndex: 0,
		pageSize
	})

	// Add selection column if enabled
	const tableColumns = React.useMemo(() => {
		if (!enableRowSelection) return columns

		const selectColumn: ColumnDef<TData, TValue> = {
			id: 'select',
			header: ({ table }) => (
				<div className="flex items-center justify-center px-2">
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && 'indeterminate')
						}
						onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
						aria-label="Select all"
						className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
					/>
				</div>
			),
			cell: ({ row }) => (
				<div className="flex items-center justify-center px-2">
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={value => row.toggleSelected(!!value)}
						aria-label="Select row"
						className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
					/>
				</div>
			),
			enableSorting: false,
			enableHiding: false,
			size: 50
		}

		return [selectColumn, ...columns] as ColumnDef<TData, TValue>[]
	}, [columns, enableRowSelection])

	const table = useReactTable({
		data,
		columns: tableColumns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters,
			pagination,
			globalFilter
		},
		getRowId,
		enableRowSelection,
		enableGlobalFilter: true,
		globalFilterFn: 'includesString',
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
	})

	const selectedRows = table.getFilteredSelectedRowModel().rows

	// Handle error state
	if (error) {
		return (
			<div className="rounded-lg border bg-card p-8 text-center">
				<div className="flex flex-col items-center gap-4">
					<div className="rounded-full bg-destructive/10 p-3">
						<Trash2 className="h-6 w-6 text-destructive" />
					</div>
					<div>
						<h3 className="font-semibold text-destructive mb-2">
							Error Loading Data
						</h3>
						<p className="text-muted-foreground">{error}</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full space-y-4">
			{/* Search and Filters */}
			<div className="rounded-lg border bg-card p-4">
				<div className="flex flex-col gap-4">
					{/* Search Bar */}
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder={searchPlaceholder}
								value={globalFilter ?? ''}
								onChange={event =>
									setGlobalFilter(String(event.target.value))
								}
								className="pl-10 h-10"
							/>
						</div>
					</div>

					{/* Filter Controls */}
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							{filters}

							{/* Clear All Filters */}
							{(columnFilters.length > 0 || globalFilter) && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setColumnFilters([])
										setGlobalFilter('')
									}}
									className="h-8 px-2 lg:px-3 text-xs"
								>
									Reset
								</Button>
							)}
						</div>

						<div className="flex items-center gap-2">
							{/* Column Visibility */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-8 gap-1"
									>
										<Columns3 className="h-4 w-4" />
										Columns
										<ChevronDown className="h-3 w-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									{table
										.getAllColumns()
										.filter(
											column =>
												typeof column.accessorFn !== 'undefined' &&
												column.getCanHide()
										)
										.map(column => {
											return (
												<DropdownMenuCheckboxItem
													key={column.id}
													className="capitalize"
													checked={column.getIsVisible()}
													onCheckedChange={value =>
														column.toggleVisibility(!!value)
													}
												>
													{column.id}
												</DropdownMenuCheckboxItem>
											)
										})}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Export */}
							{onExport && (
								<Button
									variant="outline"
									size="sm"
									className="h-8 gap-1"
									onClick={() => onExport(data)}
								>
									<Download className="h-4 w-4" />
									Export
								</Button>
							)}

							{/* Add Button */}
							{onAdd && (
								<Button
									size="sm"
									onClick={onAdd}
									className="h-8 gap-1"
								>
									<Plus className="h-4 w-4" />
									{addButtonText}
								</Button>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="rounded-lg border bg-card overflow-hidden">
				<Table>
					<TableHeader className="bg-muted/50">
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow
								key={headerGroup.id}
								className="hover:bg-transparent border-b"
							>
								{headerGroup.headers.map(header => {
									return (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
											className="font-semibold h-12"
											style={{
												width:
													header.getSize() !== 150
														? header.getSize()
														: undefined
											}}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext()
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							// Loading state
							<TableRow>
								<TableCell
									colSpan={tableColumns.length}
									className="h-32 text-center"
								>
									<LoadingSpinner size="lg" />
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className={cn(
										'hover:bg-muted/50 transition-colors',
										row.getIsSelected() && 'bg-muted'
									)}
								>
									{row.getVisibleCells().map(cell => (
										<TableCell
											key={cell.id}
											className="px-4 py-3"
											style={{
												width:
													cell.column.getSize() !== 150
														? cell.column.getSize()
														: undefined
											}}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={tableColumns.length}
									className="h-32 text-center"
								>
									<div className="flex flex-col items-center justify-center gap-3">
										{EmptyIcon && <EmptyIcon className="h-8 w-8 text-muted-foreground" />}
										<div>
											<p className="font-semibold text-foreground mb-1">
												{emptyStateTitle}
											</p>
											<p className="text-sm text-muted-foreground">
												{globalFilter || columnFilters.length > 0
													? 'Try adjusting your search or filters'
													: emptyStateDescription}
											</p>
										</div>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination and Selection */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					{selectedRows.length > 0 && (
						<>
							<div className="text-sm text-muted-foreground">
								{selectedRows.length} of{' '}
								{table.getFilteredRowModel().rows.length} row(s) selected
							</div>

							<div className="flex items-center gap-2">
								{onExport && (
									<Button
										variant="outline"
										size="sm"
										className="h-8"
										onClick={() => onExport(selectedRows.map(row => row.original))}
									>
										<Download className="h-4 w-4 mr-1" />
										Export Selected
									</Button>
								)}
								{onDeleteSelected && (
									<Button
										variant="outline"
										size="sm"
										className="h-8 text-destructive hover:text-destructive"
										onClick={() => onDeleteSelected(selectedRows.map(row => row.original))}
									>
										<Trash2 className="h-4 w-4 mr-1" />
										Delete Selected
									</Button>
								)}
							</div>
						</>
					)}
				</div>

				<div className="flex items-center gap-6">
					<div className="text-sm text-muted-foreground">
						Showing{' '}
						{table.getState().pagination.pageIndex *
							table.getState().pagination.pageSize +
							1}{' '}
						to{' '}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) *
								table.getState().pagination.pageSize,
							table.getFilteredRowModel().rows.length
						)}{' '}
						of {table.getFilteredRowModel().rows.length} results
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="h-8"
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="h-8"
						>
							Next
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}