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
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight
} from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	title?: string
	description?: string
}

export function DataTable<TData, TValue>({
	columns,
	data,
	title,
	description
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[]
	)
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})
	const [rowSelection, setRowSelection] = React.useState({})
	const [pagination, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: 10
	})

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			pagination
		}
	})

	return (
		<div className="dashboard-widget">
			{title && (
				<div style={{ marginBottom: 'var(--spacing-4)' }}>
					<h3
						className="widget-title"
						style={{
							fontSize: 'var(--font-title-2)',
							lineHeight: 'var(--line-height-title-2)',
							color: 'var(--color-label-primary)',
							fontWeight: 600
						}}
					>
						{title}
					</h3>
					{description && (
						<p
							className="widget-subtitle"
							style={{
								fontSize: 'var(--font-caption-1)',
								lineHeight: 'var(--line-height-caption)',
								color: 'var(--color-label-secondary)',
								marginTop: 'var(--spacing-1)'
							}}
						>
							{description}
						</p>
					)}
				</div>
			)}

			<div className="dashboard-table">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map(header => (
									<TableHead
										key={header.id}
										style={{
											fontSize: 'var(--font-subheadline)',
											color: 'var(--color-label-secondary)',
											fontWeight: 600
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
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
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map(cell => (
										<TableCell
											key={cell.id}
											style={{
												fontSize: 'var(--font-body)',
												color: 'var(--color-label-primary)'
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
									colSpan={columns.length}
									style={{
										textAlign: 'center',
										padding: 'var(--spacing-8)',
										fontSize: 'var(--font-body)',
										color: 'var(--color-label-tertiary)'
									}}
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginTop: 'var(--spacing-4)',
					padding: '0 var(--spacing-2)'
				}}
			>
				<div
					style={{
						fontSize: 'var(--font-caption-1)',
						color: 'var(--color-label-secondary)'
					}}
				>
					{table.getFilteredSelectedRowModel().rows.length} of{' '}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--spacing-2)'
					}}
				>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
						style={{
							width: '32px',
							height: '32px',
							padding: 0,
							background: 'var(--color-card)',
							border: '1px solid var(--color-border)'
						}}
					>
						<ChevronsLeft
							style={{
								width: '16px',
								height: '16px',
								color: 'var(--color-label-tertiary)'
							}}
						/>
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						style={{
							width: '32px',
							height: '32px',
							padding: 0,
							background: 'var(--color-card)',
							border: '1px solid var(--color-border)'
						}}
					>
						<ChevronLeft
							style={{
								width: '16px',
								height: '16px',
								color: 'var(--color-label-tertiary)'
							}}
						/>
					</Button>
					<span
						style={{
							fontSize: 'var(--font-caption-1)',
							color: 'var(--color-label-secondary)',
							padding: '0 var(--spacing-2)'
						}}
					>
						Page {table.getState().pagination.pageIndex + 1} of{' '}
						{table.getPageCount()}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						style={{
							width: '32px',
							height: '32px',
							padding: 0,
							background: 'var(--color-card)',
							border: '1px solid var(--color-border)'
						}}
					>
						<ChevronRight
							style={{
								width: '16px',
								height: '16px',
								color: 'var(--color-label-tertiary)'
							}}
						/>
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
						style={{
							width: '32px',
							height: '32px',
							padding: 0,
							background: 'var(--color-card)',
							border: '1px solid var(--color-border)'
						}}
					>
						<ChevronsRight
							style={{
								width: '16px',
								height: '16px',
								color: 'var(--color-label-tertiary)'
							}}
						/>
					</Button>
				</div>
			</div>
		</div>
	)
}
