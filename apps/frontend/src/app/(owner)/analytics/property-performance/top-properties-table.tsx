'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import {
	formatCurrency,
	formatNumber,
	formatPercentage
} from '#lib/formatters/currency'
import type { PropertyPerformanceEntry } from '@repo/shared/types/analytics'

export function TopPropertiesTable({
	properties
}: {
	properties: PropertyPerformanceEntry[]
}) {
	const columns: ColumnDef<PropertyPerformanceEntry>[] = useMemo(
		() => [
			{
				accessorKey: 'propertyName',
				header: 'Property',
				meta: {
					label: 'Property Name',
					variant: 'text',
					placeholder: 'Search property...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'occupancyRate',
				header: 'Occupancy',
				meta: {
					label: 'Occupancy Rate',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatPercentage(row.original.occupancyRate)}
					</div>
				)
			},
			{
				id: 'units',
				header: 'Units',
				cell: ({ row }) => (
					<div className="text-right">
						{formatNumber(row.original.occupiedUnits)}/
						{formatNumber(row.original.totalUnits)}
					</div>
				)
			},
			{
				accessorKey: 'monthlyRevenue',
				header: 'Monthly revenue',
				meta: {
					label: 'Monthly Revenue',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.monthlyRevenue)}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: properties,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 6
			}
		}
	})

	if (!properties.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No property data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}
