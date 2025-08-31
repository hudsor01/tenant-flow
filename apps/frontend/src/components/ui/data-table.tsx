'use client'

import * as React from 'react'
import { createActionColumn } from '@/components/data-table/data-table-action-factory'
import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import { Filter, ChevronDown, Download, Plus, ArrowUpDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface EnhancedDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	searchKey?: string
	searchPlaceholder?: string
	title?: string
	description?: string
	onAdd?: () => void
	onExport?: () => void
	enableExport?: boolean
	enableAdd?: boolean
	className?: string
}

export function EnhancedDataTable<TData, TValue>({
	columns,
	data,
	searchKey,
	searchPlaceholder = 'Search...',
	title,
	description,
	onAdd,
	onExport,
	enableExport = false,
	enableAdd = false,
	className
}: EnhancedDataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnFilters, setColumnFilters] =
		React.useState<ColumnFiltersState>([])
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = React.useState({})

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection
		}
	})

	const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length
	const totalRowsCount = table.getFilteredRowModel().rows.length

	return (
		<div className={cn('w-full space-y-4', className)}>
			{/* Header Section */}
			{(title || description) && (
				<div className="space-y-2">
					{title && (
						<h2 className="font-heading text-foreground text-2xl font-bold tracking-tight">
							{title}
						</h2>
					)}
					{description && (
						<p className="text-muted-foreground font-medium">
							{description}
						</p>
					)}
				</div>
			)}

			{/* Toolbar */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 items-center space-x-2">
					{searchKey && (
						<div className="relative">
							<Input
								placeholder={searchPlaceholder}
								value={
									(table
										.getColumn(searchKey)
										?.getFilterValue() as string) ?? ''
								}
								onChange={(
									event: React.ChangeEvent<HTMLInputElement>
								) =>
									table
										.getColumn(searchKey)
										?.setFilterValue(event.target.value)
								}
								className="input-modern h-10 w-[250px] lg:w-[350px]"
							/>
						</div>
					)}

					{/* Column visibility */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="sm"
								className="h-10"
							>
								<Filter className="mr-2 h-4 w-4" />
								Columns
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-[200px]">
							<DropdownMenuLabel>
								Toggle columns
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{table
								.getAllColumns()
								.filter(column => column.getCanHide())
								.map(column => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value: boolean) =>
												column.toggleVisibility(!!value)
											}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									)
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Actions */}
				<div className="flex items-center space-x-2">
					{enableExport && (
						<Button
							variant="outline"
							size="sm"
							onClick={onExport}
							className="h-10"
						>
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
					)}
					{enableAdd && (
						<Button onClick={onAdd} size="sm" className="h-10">
							<Plus className="mr-2 h-4 w-4" />
							Add New
						</Button>
					)}
				</div>
			</div>

			{/* Selection Info */}
			{selectedRowsCount > 0 && (
				<div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
					<div className="flex items-center space-x-2">
						<Badge variant="secondary" className="font-medium">
							{selectedRowsCount} selected
						</Badge>
						<span className="text-muted-foreground text-sm">
							out of {totalRowsCount} row(s)
						</span>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setRowSelection({})}
						>
							Clear selection
						</Button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="card-modern overflow-hidden">
				<Table>
					<TableHeader className="bg-gradient-subtle">
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow
								key={headerGroup.id}
								className="border-border/50 hover:bg-transparent"
							>
								{headerGroup.headers.map(header => (
									<TableHead
										key={header.id}
										className="font-heading text-foreground/90 h-12 font-semibold tracking-tight"
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef
														.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={
										row.getIsSelected() && 'selected'
									}
									className="border-border/30 hover:bg-gradient-subtle/50 transition-all duration-200"
								>
									{row.getVisibleCells().map(cell => (
										<TableCell
											key={cell.id}
											className="font-body font-medium"
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
									colSpan={columns.length}
									className="font-heading text-muted-foreground h-32 text-center"
								>
									<div className="flex flex-col items-center gap-3">
										<div className="text-6xl op-50">
											📭
										</div>
										<div className="space-y-1">
											<p className="text-lg font-semibold">
												No _results found
											</p>
											<p className="text-sm">
												Try adjusting your search or
												filters to find what you're
												looking for.
											</p>
										</div>
									</div>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-muted-foreground text-sm font-medium">
					{selectedRowsCount > 0 && (
						<>
							<span className="text-foreground font-semibold">
								{selectedRowsCount}
							</span>{' '}
							of{' '}
						</>
					)}
					<span className="text-foreground font-semibold">
						{totalRowsCount}
					</span>{' '}
					row(s) {selectedRowsCount > 0 ? 'selected' : 'total'}
				</div>

				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="font-medium"
					>
						Previous
					</Button>
					<div className="flex items-center space-x-1">
						<span className="text-muted-foreground text-sm">
							Page {table.getState().pagination.pageIndex + 1} of{' '}
							{table.getPageCount()}
						</span>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="font-medium"
					>
						Next
					</Button>
				</div>
			</div>
		</div>
	)
}

// Enhanced helper functions following shadcn patterns
export function createSortableHeader<_T>(
	column: {
		toggleSortingAction: (desc?: boolean) => void
		getIsSortedAction: () => string | false
	},
	title: string,
	className?: string
) {
	return (
		<Button
			variant="ghost"
			onClick={() =>
				column.toggleSortingAction(column.getIsSortedAction() === 'asc')
			}
			className={cn(
				'-ml-4 h-auto p-0 font-semibold hover:bg-transparent',
				className
			)}
		>
			{title}
			<ArrowUpDown className="ml-2 h-4 w-4" />
		</Button>
	)
}

export function createActionsColumn<T extends { id: string }>(
    onView?: (_item: T) => void,
    onEdit?: (_item: T) => void,
    onDelete?: (_item: T) => void,
    customActions?: {
        label: string
        onClick: (_item: T) => void
        icon?: React.ReactNode
        variant?: 'default' | 'destructive'
    }[]
) {
    // Delegate action cell rendering to consolidated factory (dropdown variant)
    // to avoid duplicating menu markup  
    // Map provided handlers into TableAction format
    const actions: Array<{ label: string; onClick: (_item: T) => void; icon?: React.ReactNode; variant?: 'default' | 'destructive' }> = []
    if (onView) actions.push({ label: 'View details', onClick: onView })
    if (onEdit) actions.push({ label: 'Edit', onClick: onEdit })
    if (customActions) actions.push(...customActions)
    if (onDelete) actions.push({ label: 'Delete', onClick: onDelete, variant: 'destructive' })

    const Actions = createActionColumn<T>({
        entity: 'item',
        basePath: '',
        actions: actions.map(a => ({
            type: 'custom',
            icon: '',
            label: a.label,
            onClick: (item: T) => a.onClick(item),
            variant: a.variant === 'destructive' ? 'destructive' : 'ghost'
        })),
        variant: 'dropdown'
    })

    return {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }: { row: { original: T } }) => <Actions item={row.original} />
    }
}

// Property_ management specific select column
export function createSelectColumn<_T>() {
	return {
		id: 'select',
		header: ({
			table
		}: {
			table: {
				getIsAllPageRowsSelected: () => boolean
				getIsSomePageRowsSelected: () => boolean
				toggleAllPageRowsSelected: (_value: boolean) => void
			}
		}) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && 'indeterminate')
				}
				onCheckedChange={value =>
					table.toggleAllPageRowsSelected(!!value)
				}
				aria-label="Select all"
				className="translate-y-[2px]"
			/>
		),
		cell: ({
			row
		}: {
			row: {
				getIsSelected: () => boolean
				toggleSelected: (_value: boolean) => void
			}
		}) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-[2px]"
			/>
		),
		enableSorting: false,
		enableHiding: false
	}
}
