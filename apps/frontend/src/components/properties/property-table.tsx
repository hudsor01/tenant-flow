'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
	Building2,
	MapPin,
	ChevronDown,
	Pencil,
	Trash2,
	Eye,
	ArrowUpDown,
	Settings2,
	Check,
	Wrench
} from 'lucide-react'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import { Checkbox } from '#components/ui/checkbox'
import { cn } from '#lib/utils'
import type { PropertyItem } from './types'

// ============================================================================
// TYPES
// ============================================================================

export type SortField = 'name' | 'address' | 'units' | 'occupancy' | 'revenue'
export type SortDirection = 'asc' | 'desc'
export type ColumnId =
	| 'property'
	| 'address'
	| 'units'
	| 'occupancy'
	| 'revenue'
	| 'status'

export interface ColumnConfig {
	id: ColumnId
	label: string
	alwaysVisible?: boolean
	defaultVisible?: boolean
}

export const TABLE_COLUMNS: ColumnConfig[] = [
	{ id: 'property', label: 'Property', alwaysVisible: true },
	{ id: 'address', label: 'Address', defaultVisible: true },
	{ id: 'units', label: 'Units', defaultVisible: true },
	{ id: 'occupancy', label: 'Occupancy', defaultVisible: true },
	{ id: 'status', label: 'Status', defaultVisible: true },
	{ id: 'revenue', label: 'Monthly Revenue', defaultVisible: true }
]

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(amountInCents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amountInCents / 100)
}

function formatPropertyType(type: string): string {
	return type
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

// ============================================================================
// PROPERTY TABLE COMPONENT
// ============================================================================

export interface PropertyTableProps {
	properties: PropertyItem[]
	selectedRows: Set<string>
	onSelectRow: (id: string) => void
	onSelectAll: () => void
	onView: ((id: string) => void) | undefined
	onEdit: ((id: string) => void) | undefined
	onDelete: ((id: string) => void) | undefined
}

/**
 * PropertyTable - Table view for displaying properties with sorting and column visibility
 *
 * Features:
 * - Sortable columns (name, address, units, occupancy, revenue)
 * - Column visibility toggles
 * - Row selection for bulk actions
 * - Responsive column hiding on mobile
 * - Action buttons for view/edit/delete
 */
export function PropertyTable({
	properties,
	selectedRows,
	onSelectRow,
	onSelectAll,
	onView,
	onEdit,
	onDelete
}: PropertyTableProps) {
	const [sortField, setSortField] = useState<SortField>('name')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
		new Set(
			TABLE_COLUMNS.filter(c => c.alwaysVisible || c.defaultVisible).map(
				c => c.id
			)
		)
	)
	const [showColumnMenu, setShowColumnMenu] = useState(false)

	const toggleColumn = (columnId: ColumnId) => {
		const column = TABLE_COLUMNS.find(c => c.id === columnId)
		if (column?.alwaysVisible) return

		const newVisible = new Set(visibleColumns)
		if (newVisible.has(columnId)) {
			newVisible.delete(columnId)
		} else {
			newVisible.add(columnId)
		}
		setVisibleColumns(newVisible)
	}

	const isColumnVisible = (columnId: ColumnId) => visibleColumns.has(columnId)

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const sortedProperties = useMemo(() => {
		return [...properties].sort((a, b) => {
			let comparison = 0
			switch (sortField) {
				case 'name':
					comparison = a.name.localeCompare(b.name)
					break
				case 'address':
					comparison = a.addressLine1.localeCompare(b.addressLine1)
					break
				case 'units':
					comparison = a.totalUnits - b.totalUnits
					break
				case 'occupancy':
					comparison = a.occupancyRate - b.occupancyRate
					break
				case 'revenue':
					comparison = a.monthlyRevenue - b.monthlyRevenue
					break
			}
			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [properties, sortField, sortDirection])

	const SortHeader = ({
		field,
		children
	}: {
		field: SortField
		children: React.ReactNode
	}) => (
		<button
			onClick={() => handleSort(field)}
			className="flex items-center gap-1 hover:text-foreground transition-colors group"
		>
			{children}
			<ArrowUpDown
				className={cn(
					'w-3.5 h-3.5 transition-colors',
					sortField === field
						? 'text-primary'
						: 'text-muted-foreground/50 group-hover:text-muted-foreground'
				)}
			/>
		</button>
	)

	return (
		<div className="bg-card border border-border rounded-sm overflow-hidden">
			{/* Table Toolbar */}
			<div className="px-4 py-2 border-b border-border flex items-center justify-between">
				<span className="text-sm text-muted-foreground">
					{properties.length}{' '}
					{properties.length === 1 ? 'property' : 'properties'}
				</span>

				{/* Column Visibility Toggle */}
				<div className="relative">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowColumnMenu(!showColumnMenu)}
						className="gap-2"
					>
						<Settings2 className="w-4 h-4" />
						Columns
						<ChevronDown
							className={cn(
								'w-3.5 h-3.5 transition-transform',
								showColumnMenu && 'rotate-180'
							)}
						/>
					</Button>

					{showColumnMenu && (
						<>
							<div
								className="fixed inset-0 z-10"
								onClick={() => setShowColumnMenu(false)}
							/>
							<div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-sm shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
								<div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
									Toggle Columns
								</div>
								{TABLE_COLUMNS.map(column => (
									<button
										key={column.id}
										onClick={() => toggleColumn(column.id)}
										disabled={column.alwaysVisible}
										className={cn(
											'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors',
											column.alwaysVisible && 'opacity-50 cursor-not-allowed'
										)}
									>
										<div
											className={cn(
												'w-4 h-4 rounded border flex items-center justify-center',
												isColumnVisible(column.id)
													? 'bg-primary border-primary'
													: 'border-border'
											)}
										>
											{isColumnVisible(column.id) && (
												<Check className="w-3 h-3 text-primary-foreground" />
											)}
										</div>
										<span className="text-foreground">{column.label}</span>
										{column.alwaysVisible && (
											<span className="ml-auto text-xs text-muted-foreground">
												Required
											</span>
										)}
									</button>
								))}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border bg-muted/30">
							<th className="w-12 px-4 py-3">
								<Checkbox
									checked={
										selectedRows.size === properties.length &&
										properties.length > 0
									}
									onCheckedChange={onSelectAll}
								/>
							</th>
							{isColumnVisible('property') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									<SortHeader field="name">Property</SortHeader>
								</th>
							)}
							{isColumnVisible('address') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
									<SortHeader field="address">Address</SortHeader>
								</th>
							)}
							{isColumnVisible('units') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									<SortHeader field="units">Units</SortHeader>
								</th>
							)}
							{isColumnVisible('occupancy') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									<SortHeader field="occupancy">Occupancy</SortHeader>
								</th>
							)}
							{isColumnVisible('status') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Status
								</th>
							)}
							{isColumnVisible('revenue') && (
								<th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
									<SortHeader field="revenue">Monthly Revenue</SortHeader>
								</th>
							)}
							<th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{sortedProperties.map(property => (
							<tr
								key={property.id}
								className={cn(
									'hover:bg-muted/30 transition-colors',
									selectedRows.has(property.id) && 'bg-primary/5'
								)}
							>
								<td className="px-4 py-3">
									<Checkbox
										checked={selectedRows.has(property.id)}
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
												<p className="font-medium text-foreground">
													{property.name}
												</p>
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
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
