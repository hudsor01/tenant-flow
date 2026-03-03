'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Building2, Eye, MapPin, Pencil, Trash2, Wrench } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import { Checkbox } from '#components/ui/checkbox'
import { cn } from '#lib/utils'
import type { PropertyItem } from './types'
import type { ColumnId } from './property-table-types'
import { formatCurrency, formatPropertyType } from './property-table-types'

interface PropertyTableRowProps {
	property: PropertyItem
	isSelected: boolean
	visibleColumns: Set<ColumnId>
	onSelectRow: (id: string) => void
	onView: ((id: string) => void) | undefined
	onEdit: ((id: string) => void) | undefined
	onDelete: ((id: string) => void) | undefined
}

export const PropertyTableRow = memo(function PropertyTableRow({
	property,
	isSelected,
	visibleColumns,
	onSelectRow,
	onView,
	onEdit,
	onDelete
}: PropertyTableRowProps) {
	const isColumnVisible = (columnId: ColumnId) => visibleColumns.has(columnId)

	return (
		<tr
			className={cn(
				'hover:bg-muted/30 transition-colors',
				isSelected && 'bg-primary/5'
			)}
		>
			<td className="px-4 py-3">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onSelectRow(property.id)}
				/>
			</td>
			{isColumnVisible('property') && (
				<td className="px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-sm overflow-hidden bg-muted shrink-0">
							{property.imageUrl ? (
								<Image
									src={property.imageUrl}
									alt={property.name}
									width={40}
									height={40}
									className="object-cover w-full h-full"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<Building2 className="w-5 h-5 text-muted-foreground" />
								</div>
							)}
						</div>
						<div>
							<p className="font-medium text-foreground">{property.name}</p>
							<p className="text-xs text-muted-foreground">
								{formatPropertyType(property.propertyType)}
							</p>
						</div>
					</div>
				</td>
			)}
			{isColumnVisible('address') && (
				<td className="px-4 py-3 hidden md:table-cell">
					<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
						<MapPin className="w-3.5 h-3.5 shrink-0" />
						<span className="truncate max-w-[200px]">
							{property.addressLine1}, {property.city}
						</span>
					</div>
				</td>
			)}
			{isColumnVisible('units') && (
				<td className="px-4 py-3">
					<span className="text-sm font-medium text-foreground">
						{property.occupiedUnits}/{property.totalUnits}
					</span>
				</td>
			)}
			{isColumnVisible('occupancy') && (
				<td className="px-4 py-3">
					<div className="flex items-center gap-2">
						<div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
							<div
								className={cn(
									'h-full rounded-full',
									property.occupancyRate === 100
										? 'bg-emerald-500'
										: property.occupancyRate >= 80
											? 'bg-blue-500'
											: 'bg-amber-500'
								)}
								style={{ width: `${property.occupancyRate}%` }}
							/>
						</div>
						<span className="text-sm font-medium text-foreground">
							{property.occupancyRate}%
						</span>
					</div>
				</td>
			)}
			{isColumnVisible('status') && (
				<td className="px-4 py-3">
					<div className="flex items-center gap-1">
						{property.availableUnits > 0 && (
							<Badge
								variant="outline"
								className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-0"
							>
								{property.availableUnits} available
							</Badge>
						)}
						{property.maintenanceUnits > 0 && (
							<Badge
								variant="outline"
								className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0"
							>
								<Wrench className="w-3 h-3 mr-1" />
								{property.maintenanceUnits}
							</Badge>
						)}
						{property.availableUnits === 0 &&
							property.maintenanceUnits === 0 && (
								<Badge
									variant="outline"
									className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-0"
								>
									Full
								</Badge>
							)}
					</div>
				</td>
			)}
			{isColumnVisible('revenue') && (
				<td className="px-4 py-3 hidden lg:table-cell">
					<span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
						{formatCurrency(property.monthlyRevenue)}
					</span>
				</td>
			)}
			<td className="px-4 py-3">
				<div className="flex items-center justify-end gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onView?.(property.id)}
								className="size-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
								aria-label={`View ${property.name}`}
							>
								<Eye className="w-4 h-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>View</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onEdit?.(property.id)}
								className="size-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
								aria-label={`Edit ${property.name}`}
							>
								<Pencil className="w-4 h-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Edit</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDelete?.(property.id)}
								className="size-8 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
								aria-label={`Delete ${property.name}`}
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete</TooltipContent>
					</Tooltip>
				</div>
			</td>
		</tr>
	)
})
