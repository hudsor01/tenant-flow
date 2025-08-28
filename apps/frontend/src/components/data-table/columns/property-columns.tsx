'use client'

import type { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Property, Unit } from '@repo/shared'

// Define local interface for component needs
interface Property_WithUnits extends Property {
	units?: Unit[]
}
import { formatCurrency as sharedFormatCurrency } from '@repo/shared'

// Use the Unit type that comes with Property_WithUnits to avoid conflicts
type Property_Unit = NonNullable<Property_WithUnits['units']>[0]
import { createSelectColumn, createActionsColumn } from '../dense-table'
import { cn } from '@/lib/utils'
import { createPropertyDeletionHandler } from '@/lib/utils/property-deletion'

// UI Helper functions - pure display formatting only
function formatCurrency(amount: number | undefined | null): string {
	if (!amount) {
		return '$0'
	}
	return sharedFormatCurrency(amount, { maximumFractionDigits: 0 })
}

function getStatusBadgeVariant(
	occupancyRate: number
): 'default' | 'secondary' | 'destructive' | 'outline' {
	if (occupancyRate === 100) {
		return 'default'
	}
	if (occupancyRate >= 80) {
		return 'secondary'
	}
	if (occupancyRate >= 50) {
		return 'outline'
	}
	return 'destructive'
}

function getStatusLabel(occupancyRate: number): string {
	if (occupancyRate === 100) {
		return 'Full'
	}
	if (occupancyRate >= 80) {
		return 'High'
	}
	if (occupancyRate >= 50) {
		return 'Moderate'
	}
	if (occupancyRate > 0) {
		return 'Low'
	}
	return 'Vacant'
}

// REMOVED: Client-side calculations replaced by backend server actions
// Use property.stats which comes from backend calculations in property-actions.ts
// This ensures data consistency and prevents duplication of business logic

// Column definitions - Property_WithUnits includes units array for calculating stats
export const propertyColumns: ColumnDef<Property_WithUnits>[] = [
	createSelectColumn<Property_WithUnits>(),

	{
		accessorKey: 'name',
		header: 'Property_',
		size: 200,
		cell: ({ row }) => {
			const property = row.original
			return (
				<div className="flex min-w-0 items-center gap-2">
					<div className="bg-primary/10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded">
						<i className="i-lucide-building-2 inline-block text-primary h-3 w-3"  />
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
					<i className="i-lucide-map-pin inline-block text-muted-foreground h-3 w-3 flex-shrink-0"  />
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
			const property = row.original
			// Calculate stats from units if available
			const totalUnits = property.units?.length ?? 0
			const occupiedUnits = property.units?.filter((u: Property_Unit) => u.status === 'OCCUPIED').length ?? 0

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
			const property = row.original
			// Calculate occupancy rate from units
			const totalUnits = property.units?.length ?? 0
			const occupiedUnits = property.units?.filter((u: Property_Unit) => u.status === 'OCCUPIED').length ?? 0
			const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

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
			const property = row.original
			// Calculate revenue from units
			const totalRevenue = property.units?.reduce((sum: number, u: Property_Unit) => {
				return u.status === 'OCCUPIED' ? sum + (u.rent || 0) : sum
			}, 0) ?? 0

			return (
				<div className="flex items-center gap-1">
					<i className="i-lucide-dollar-sign inline-block text-muted-foreground h-3 w-3"  />
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
			const property = row.original
			// Calculate occupancy rate from units
			const totalUnits = property.units?.length ?? 0
			const occupiedUnits = property.units?.filter((u: Property_Unit) => u.status === 'OCCUPIED').length ?? 0
			const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
			const statusLabel = getStatusLabel(occupancyRate)
			const variant = getStatusBadgeVariant(occupancyRate)

			return (
				<Badge variant={variant} className="text-xs">
					{statusLabel}
				</Badge>
			)
		}
	},

	// Property_ type column removed - not in base Property_ interface
	// Following KISS principle - only show data that exists

	createActionsColumn<Property_WithUnits>([
		{
			label: 'View',
			onClick: property => {
				window.location.href = `/properties/${property.id}`
			},
			icon: <i className="i-lucide-eye inline-block h-3 w-3"  />
		},
		{
			label: 'Edit',
			onClick: property => {
				window.location.href = `/properties/${property.id}/edit`
			},
			icon: <i className="i-lucide-edit inline-block h-3 w-3"  />
		},
		{
			label: 'Delete',
			onClick: createPropertyDeletionHandler(),
			icon: <i className="i-lucide-trash inline-block h-3 w-3"  />,
			variant: 'destructive' as const
		}
	])
]

// Alternative simplified columns for mobile/compact views
export const compactPropertyColumns: ColumnDef<Property_WithUnits>[] = [
	createSelectColumn<Property_WithUnits>(),

	{
		accessorKey: 'name',
		header: 'Property_',
		cell: ({ row }) => {
			const property = row.original
			// Calculate stats from units
			const totalUnits = property.units?.length ?? 0
			const occupiedUnits = property.units?.filter((u: Property_Unit) => u.status === 'OCCUPIED').length ?? 0
			const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0
			const revenue = property.units?.reduce((sum: number, u: Property_Unit) => {
				return u.status === 'OCCUPIED' ? sum + (u.rent || 0) : sum
			}, 0) ?? 0

			return (
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<i className="i-lucide-building-2 inline-block text-primary h-3 w-3 flex-shrink-0"  />
						<Link
							href={`/properties/${property.id}`}
							className="text-foreground hover:text-primary truncate text-sm font-medium"
						>
							{property.name}
						</Link>
					</div>
					<div className="text-muted-foreground flex items-center gap-4 text-xs">
						<span>{totalUnits} units</span>
						<span>{occupancyRate}% occupied</span>
						<span>{formatCurrency(revenue)}/mo</span>
					</div>
				</div>
			)
		}
	},

	createActionsColumn<Property_WithUnits>([
		{
			label: 'View',
			onClick: property => {
				window.location.href = `/properties/${property.id}`
			},
			icon: <i className="i-lucide-eye inline-block h-3 w-3"  />
		},
		{
			label: 'Edit',
			onClick: property => {
				window.location.href = `/properties/${property.id}/edit`
			},
			icon: <i className="i-lucide-edit inline-block h-3 w-3"  />
		}
	])
]
