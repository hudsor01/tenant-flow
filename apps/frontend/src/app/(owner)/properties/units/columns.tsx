/**
 * Unit Columns - Data Table Column Definitions
 * 
 * This file defines the column structure for the units data table.
 * Component implementations are extracted into ./components/ for maintainability.
 */

import { DataTableColumnHeader } from '#components/data-table/data-table-column-header'
import type {
	UnitRowWithRelations,
	UnitStatus
} from '@repo/shared/types/core'

export type UnitRow = UnitRowWithRelations
import type { ColumnDef } from '@tanstack/react-table'
import {
	Bath,
	Bed,
	MapPin,
	Maximize2
} from 'lucide-react'

// Import extracted components
import { UnitStatusBadge, statusConfig } from './components/unit-status-badge'
import { UnitActions } from './components/unit-actions'

/**
 * Column definitions for the units data table
 * Uses TanStack Table with DiceUI DataTable enhancements
 */
export const unitColumns: ColumnDef<UnitRowWithRelations>[] = [
	{
		accessorKey: 'unit_number',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Unit Details" />
		),
		meta: {
			label: 'Unit',
			variant: 'text',
			placeholder: 'Search units...'
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			return (
				<div className="flex flex-col gap-1 py-2">
					<div className="font-bold text-foreground">
						Unit {row.getValue('unit_number')}
					</div>
					{unit.property && (
						<div className="text-muted-foreground text-xs">
							<MapPin className="size-3 inline mr-1" />
							{unit.property.name}
						</div>
					)}
				</div>
			)
		},
		size: 160,
		enableHiding: false
	},
	{
		accessorKey: 'bedrooms',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bedrooms" />
		),
		meta: {
			label: 'Bedrooms',
			variant: 'range',
			range: [0, 10]
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bedrooms = row.getValue('bedrooms') as number
			return (
				<div className="flex items-center gap-1">
					<Bed className="size-3 text-muted-foreground" />
					<span className="font-medium">{bedrooms}</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'bathrooms',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Bathrooms" />
		),
		meta: {
			label: 'Bathrooms',
			variant: 'range',
			range: [0, 10]
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const bathrooms = row.getValue('bathrooms') as number
			return (
				<div className="flex items-center gap-1">
					<Bath className="size-3 text-muted-foreground" />
					<span className="font-medium">{bathrooms}</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'square_feet',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Size" />
		),
		cell: ({ row }) => {
			const sqft = row.getValue('square_feet') as number | null
			if (!sqft) return <span className="text-muted-foreground">-</span>
			return (
				<div className="flex items-center gap-1">
					<Maximize2 className="size-3 text-muted-foreground" />
					<span className="text-xs">{sqft.toLocaleString()} ft²</span>
				</div>
			)
		},
		size: 100
	},
	{
		accessorKey: 'rent_amount',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Rent" />
		),
		meta: {
			label: 'Rent',
			variant: 'range',
			range: [0, 10000],
			unit: '$'
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const rent = parseFloat(row.getValue('rent_amount'))
			const rentFormatted = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 0
			}).format(rent)

			return (
				<div className="text-right space-y-1 py-2">
					<div className="font-bold text-foreground">{rentFormatted}</div>
					<div className="text-muted-foreground text-xs">per month</div>
				</div>
			)
		},
		size: 120
	},
	{
		accessorKey: 'status',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} label="Status" />
		),
		meta: {
			label: 'Status',
			variant: 'select',
			options: [
				{ label: 'Occupied', value: 'occupied' },
				{ label: 'Vacant', value: 'available' },
				{ label: 'Maintenance', value: 'maintenance' },
				{ label: 'Reserved', value: 'reserved' }
			]
		},
		enableColumnFilter: true,
		cell: ({ row }) => {
			const unit: UnitRow = row.original
			const status = row.getValue('status') as UnitStatus

			return (
				<div className="space-y-2 py-2">
					<UnitStatusBadge status={status} />
					{unit.tenant && status === 'occupied' && (
						<div className="space-y-1">
							<div className="font-medium text-foreground text-sm">
								{unit.tenant.name}
							</div>
							<div className="text-muted-foreground text-xs">
								{unit.tenant.email}
							</div>
						</div>
					)}
				</div>
			)
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		sortingFn: (rowA, rowB) => {
			const statusA = rowA.getValue('status') as UnitStatus
			const statusB = rowB.getValue('status') as UnitStatus
			return statusConfig[statusA].priority - statusConfig[statusB].priority
		},
		size: 200
	},
	{
		id: 'actions',
		header: () => (
			<div className="text-center font-semibold text-muted-foreground">
				Actions
			</div>
		),
		cell: ({ row }) => <UnitActions unit={row.original} />,
		enableSorting: false,
		enableHiding: false,
		size: 80
	}
]
