'use client'

import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
// import { Button } from "@/components/ui/button"
import { Building2, Eye, Edit, Trash, MapPin, DollarSign } from 'lucide-react'
import type { Property, PropertyType } from '@repo/shared'
import {
	getPropertyTypeLabel,
	formatCurrency as sharedFormatCurrency
} from '@repo/shared'
import { createSelectColumn, createActionsColumn } from '../dense-table'
import { cn } from '@/lib/utils'

// Helper functions - unified with shared implementation
function formatCurrency(amount: number | undefined | null): string {
	if (!amount) return '$0'
	return sharedFormatCurrency(amount, { maximumFractionDigits: 0 })
}

function calculateOccupancyRate(units?: Array<{ status: string }>): number {
	if (!units || units.length === 0) return 0
	const occupiedUnits = units.filter(
		unit => unit.status === 'OCCUPIED'
	).length
	return Math.round((occupiedUnits / units.length) * 100)
}

function calculateTotalRevenue(
	units?: Array<{ monthlyRent?: number; rent?: number; status: string }>
): number {
	if (!units) return 0
	return units.reduce((total, unit) => {
		if (unit.status === 'OCCUPIED') {
			const rent = unit.monthlyRent || unit.rent || 0
			return total + rent
		}
		return total
	}, 0)
}

function getStatusBadgeVariant(
	occupancyRate: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (occupancyRate === 100) return 'default'
	if (occupancyRate >= 80) return 'secondary'
	if (occupancyRate >= 50) return 'outline'
	return 'destructive'
}

function getStatusLabel(occupancyRate: number): string {
	if (occupancyRate === 100) return 'Full'
	if (occupancyRate >= 80) return 'High'
	if (occupancyRate >= 50) return 'Moderate'
	if (occupancyRate > 0) return 'Low'
	return 'Vacant'
}

// Column definitions
export const propertyColumns: ColumnDef<Property>[] = [
	createSelectColumn<Property>(),

	{
		accessorKey: 'name',
		header: 'Property',
		size: 200,
		cell: ({ row }) => {
			const property = row.original
			return (
				<div className="flex min-w-0 items-center gap-2">
					<div className="bg-primary/10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded">
						<Building2 className="text-primary h-3 w-3" />
					</div>
					<div className="min-w-0 flex-1">
						<Link
							href={`/properties/${property.id}`}
							className="text-foreground hover:text-primary block truncate text-sm font-medium"
						>
							{property.name}
						</Link>
					</div>
				</div>
			)
		}
	},

	{
		accessorKey: 'address',
		header: 'Address',
		size: 220,
		cell: ({ row }) => {
			const property = row.original
			const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`

			return (
				<div className="flex min-w-0 items-center gap-2">
					<MapPin className="text-muted-foreground h-3 w-3 flex-shrink-0" />
					<span
						className="text-muted-foreground truncate text-xs"
						title={fullAddress}
					>
						{property.address}
					</span>
				</div>
			)
		}
	},

	{
		accessorKey: 'units',
		header: 'Units',
		size: 80,
		cell: ({ row }) => {
			const units = row.original.units || []
			const totalUnits = units.length
			const occupiedUnits = units.filter(
				unit => unit.status === 'OCCUPIED'
			).length

			return (
				<div className="text-center">
					<div className="text-xs font-medium">
						{occupiedUnits}/{totalUnits}
					</div>
				</div>
			)
		}
	},

	{
		id: 'occupancy',
		header: 'Occupancy',
		size: 100,
		cell: ({ row }) => {
			const units = row.original.units || []
			const occupancyRate = calculateOccupancyRate(units)

			return (
				<div className="flex items-center gap-2">
					<div className="flex-1">
						<div className="bg-muted h-1.5 overflow-hidden rounded-full">
							<div
								className={cn(
									'h-full transition-all duration-300',
									occupancyRate === 100 && 'bg-green-500',
									occupancyRate >= 80 &&
										occupancyRate < 100 &&
										'bg-primary',
									occupancyRate >= 50 &&
										occupancyRate < 80 &&
										'bg-yellow-500',
									occupancyRate < 50 && 'bg-red-500'
								)}
								style={{ width: `${occupancyRate}%` }}
							/>
						</div>
					</div>
					<span className="min-w-[2.5rem] text-right text-xs font-medium">
						{occupancyRate}%
					</span>
				</div>
			)
		}
	},

	{
		id: 'revenue',
		header: 'Revenue',
		size: 100,
		cell: ({ row }) => {
			const units = row.original.units || []
			const totalRevenue = calculateTotalRevenue(units)

			return (
				<div className="flex items-center gap-1">
					<DollarSign className="text-muted-foreground h-3 w-3" />
					<span className="text-xs font-medium">
						{formatCurrency(totalRevenue)}
					</span>
				</div>
			)
		}
	},

	{
		id: 'status',
		header: 'Status',
		size: 90,
		cell: ({ row }) => {
			const units = row.original.units || []
			const occupancyRate = calculateOccupancyRate(units)
			const statusLabel = getStatusLabel(occupancyRate)
			const variant = getStatusBadgeVariant(occupancyRate)

			return (
				<Badge variant={variant} className="text-xs">
					{statusLabel}
				</Badge>
			)
		}
	},

	{
		accessorKey: 'propertyType',
		header: 'Type',
		size: 100,
		cell: ({ row }) => {
			const type = row.original.propertyType as PropertyType
			return (
				<span className="text-muted-foreground text-xs">
					{getPropertyTypeLabel(type)}
				</span>
			)
		}
	},

	createActionsColumn<Property>([
		{
			label: 'View',
			onClick: property => {
				window.location.href = `/properties/${property.id}`
			},
			icon: <Eye className="h-3 w-3" />
		},
		{
			label: 'Edit',
			onClick: property => {
				window.location.href = `/properties/${property.id}/edit`
			},
			icon: <Edit className="h-3 w-3" />
		},
		{
			label: 'Delete',
			onClick: _property => {
				// TODO: Open a confirmation dialog for property deletion
				// Property deletion functionality not yet implemented
			},
			icon: <Trash className="h-3 w-3" />,
			variant: 'destructive' as const
		}
	])
]

// Alternative simplified columns for mobile/compact views
export const compactPropertyColumns: ColumnDef<Property>[] = [
	createSelectColumn<Property>(),

	{
		accessorKey: 'name',
		header: 'Property',
		cell: ({ row }) => {
			const property = row.original
			const units = property.units || []
			const occupancyRate = calculateOccupancyRate(units)
			const revenue = calculateTotalRevenue(units)

			return (
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<Building2 className="text-primary h-3 w-3 flex-shrink-0" />
						<Link
							href={`/properties/${property.id}`}
							className="text-foreground hover:text-primary truncate text-sm font-medium"
						>
							{property.name}
						</Link>
					</div>
					<div className="text-muted-foreground flex items-center gap-4 text-xs">
						<span>{units.length} units</span>
						<span>{occupancyRate}% occupied</span>
						<span>{formatCurrency(revenue)}/mo</span>
					</div>
				</div>
			)
		}
	},

	createActionsColumn<Property>([
		{
			label: 'View',
			onClick: property => {
				window.location.href = `/properties/${property.id}`
			},
			icon: <Eye className="h-3 w-3" />
		},
		{
			label: 'Edit',
			onClick: property => {
				window.location.href = `/properties/${property.id}/edit`
			},
			icon: <Edit className="h-3 w-3" />
		}
	])
]
