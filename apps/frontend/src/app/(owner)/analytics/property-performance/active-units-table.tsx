'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '#components/ui/badge'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import type { PropertyUnitDetail } from '@repo/shared/types/analytics'

export function ActiveUnitsTable({ units }: { units: PropertyUnitDetail[] }) {
	const columns: ColumnDef<PropertyUnitDetail>[] = useMemo(
		() => [
			{
				accessorKey: 'unit_number',
				header: 'Unit',
				meta: {
					label: 'Unit Number',
					variant: 'text',
					placeholder: 'Search unit...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="flex flex-col">
						<span className="font-medium">{row.original.unit_number}</span>
						<span className="text-caption">{row.original.property_id}</span>
					</div>
				)
			},
			{
				accessorKey: 'status',
				header: 'Status',
				meta: {
					label: 'Status',
					variant: 'text',
					placeholder: 'Search status...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<Badge variant="outline">{row.original.status}</Badge>
				)
			},
			{
				accessorKey: 'bedrooms',
				header: 'Bedrooms',
				meta: {
					label: 'Bedrooms',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.bedrooms !== null &&
						row.original.bedrooms !== undefined
							? formatNumber(row.original.bedrooms)
							: '-'}
					</div>
				)
			},
			{
				accessorKey: 'bathrooms',
				header: 'Bathrooms',
				meta: {
					label: 'Bathrooms',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.bathrooms !== null &&
						row.original.bathrooms !== undefined
							? formatNumber(row.original.bathrooms)
							: '-'}
					</div>
				)
			},
			{
				accessorKey: 'rent',
				header: 'Rent',
				meta: {
					label: 'Monthly Rent',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.rent !== null && row.original.rent !== undefined
							? formatCurrency(row.original.rent)
							: '-'}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: units,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 8
			}
		}
	})

	if (!units.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No unit data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}
