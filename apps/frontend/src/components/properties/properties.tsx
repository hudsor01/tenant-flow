'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
	Building2,
	Plus,
	MapPin,
	Users,
	DollarSign,
	Search,
	Upload,
	LayoutGrid,
	List,
	Home,
	ChevronDown,
	Pencil,
	Trash2,
	Eye,
	ArrowUpDown,
	Settings2,
	Check,
	Wrench,
	X
} from 'lucide-react'
import Image from 'next/image'

import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '#components/ui/tooltip'
import { Input } from '#components/ui/input'
import { Checkbox } from '#components/ui/checkbox'
import { cn } from '#lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export type PropertyType =
	| 'single_family'
	| 'multi_family'
	| 'apartment'
	| 'condo'
	| 'townhouse'
	| 'duplex'

export type PropertyStatus = 'active' | 'inactive' | 'sold'
export type UnitStatus = 'occupied' | 'available' | 'maintenance'

export interface PropertyItem {
	id: string
	name: string
	addressLine1: string
	addressLine2: string | null
	city: string
	state: string
	postalCode: string
	propertyType: PropertyType
	status: PropertyStatus
	imageUrl: string | undefined
	totalUnits: number
	occupiedUnits: number
	availableUnits: number
	maintenanceUnits: number
	occupancyRate: number
	monthlyRevenue: number
}

export interface PropertySummary {
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	availableUnits: number
	maintenanceUnits: number
	overallOccupancyRate: number
	totalMonthlyRevenue: number
}

export interface PropertiesProps {
	properties: PropertyItem[]
	summary: PropertySummary
	filter?: 'all' | 'occupied' | 'available' | 'maintenance'
	isLoading?: boolean
	onPropertyClick?: (id: string) => void
	onPropertyEdit?: (id: string) => void
	onPropertyDelete?: (id: string) => void
	onAddProperty?: () => void
	onFilterChange?: (
		filter: 'all' | 'occupied' | 'available' | 'maintenance'
	) => void
	onBulkImport?: () => void
}

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

function formatCurrencyCompact(amountInCents: number): string {
	const amount = amountInCents / 100
	if (amount >= 1000) {
		return `$${Math.round(amount / 1000)}K`
	}
	return formatCurrency(amountInCents)
}

function formatPropertyType(type: string): string {
	return type
		.split('_')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

// ============================================================================
// PROPERTY CARD (Grid View)
// ============================================================================

interface PropertyCardProps {
	property: PropertyItem
	isSelected?: boolean
	onSelect?: (id: string) => void
	onView?: () => void
}

function PropertyCard({
	property,
	isSelected,
	onSelect,
	onView
}: PropertyCardProps) {
	return (
		<div
			className={cn(
				'bg-card border rounded-sm overflow-hidden',
				'hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1',
				'transition-all duration-300 group',
				isSelected && 'border-primary ring-2 ring-primary/20'
			)}
		>
			{/* Property Image */}
			<div className="h-44 relative overflow-hidden">
				{property.imageUrl ? (
					<Image
						src={property.imageUrl}
						alt={property.name}
						fill
						className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
					/>
				) : (
					<div className="flex items-center justify-center h-full bg-muted">
						<Building2 className="w-16 h-16 text-muted-foreground" />
					</div>
				)}
				{/* Selection checkbox */}
				{onSelect && (
					<div className="absolute top-2 right-2">
						<Checkbox
							checked={isSelected ?? false}
							onCheckedChange={() => onSelect(property.id)}
							className="bg-background/80 border-border"
							aria-label={`Select ${property.name}`}
						/>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-4">
				<h3 className="font-semibold text-foreground mb-1 truncate">
					{property.name}
				</h3>
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
					<MapPin className="w-3.5 h-3.5 shrink-0" />
					<span className="truncate">
						{property.addressLine1}, {property.city}
					</span>
				</div>

				{/* Stats Row */}
				<div className="flex items-center justify-between text-xs border-t border-border pt-4">
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Units</p>
						<div className="flex items-center justify-center gap-1">
							<Home className="w-3.5 h-3.5 text-primary" />
							<span className="font-semibold text-foreground">
								{property.occupiedUnits}/{property.totalUnits}
							</span>
						</div>
					</div>
					<div className="w-px h-8 bg-border" />
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Occupancy</p>
						<span className="font-semibold text-foreground">
							{property.occupancyRate.toFixed(0)}%
						</span>
					</div>
					<div className="w-px h-8 bg-border" />
					<div className="text-center">
						<p className="text-muted-foreground mb-1">Revenue</p>
						<div className="flex items-center justify-center gap-1">
							<DollarSign className="w-3.5 h-3.5 text-emerald-600" />
							<span className="font-semibold text-foreground">
								{formatCurrencyCompact(property.monthlyRevenue)}
							</span>
						</div>
					</div>
				</div>

				{/* View Button */}
				<button
					onClick={onView}
					className="w-full mt-4 py-2.5 text-sm font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-sm transition-all duration-200 flex items-center justify-center gap-2 group/btn min-h-11"
					aria-label={`View details for ${property.name}`}
				>
					<Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
					View Details
				</button>
			</div>
		</div>
	)
}

// ============================================================================
// PROPERTY TABLE (Table View)
// ============================================================================

type SortField = 'name' | 'address' | 'units' | 'occupancy' | 'revenue'
type SortDirection = 'asc' | 'desc'
type ColumnId =
	| 'property'
	| 'address'
	| 'units'
	| 'occupancy'
	| 'revenue'
	| 'status'

interface ColumnConfig {
	id: ColumnId
	label: string
	alwaysVisible?: boolean
	defaultVisible?: boolean
}

const TABLE_COLUMNS: ColumnConfig[] = [
	{ id: 'property', label: 'Property', alwaysVisible: true },
	{ id: 'address', label: 'Address', defaultVisible: true },
	{ id: 'units', label: 'Units', defaultVisible: true },
	{ id: 'occupancy', label: 'Occupancy', defaultVisible: true },
	{ id: 'status', label: 'Status', defaultVisible: true },
	{ id: 'revenue', label: 'Monthly Revenue', defaultVisible: true }
]

interface PropertyTableProps {
	properties: PropertyItem[]
	selectedRows: Set<string>
	onSelectRow: (id: string) => void
	onSelectAll: () => void
	onView: ((id: string) => void) | undefined
	onEdit: ((id: string) => void) | undefined
	onDelete: ((id: string) => void) | undefined
}

function PropertyTable({
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
											<div className="w-10 h-10 rounded-sm overflow-hidden bg-muted flex-shrink-0">
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

// ============================================================================
// FLOATING ACTION BAR
// ============================================================================

interface PropertyActionBarProps {
	selectedCount: number
	totalCount: number
	onClear: () => void
	onBulkEdit?: () => void
	onBulkDelete?: () => void
}

function PropertyActionBar({
	selectedCount,
	totalCount,
	onClear,
	onBulkEdit,
	onBulkDelete
}: PropertyActionBarProps) {
	if (selectedCount === 0) return null

	const portalRoot = typeof document !== 'undefined' ? document.body : null
	if (!portalRoot) return null

	return createPortal(
		<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
			<div className="flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-sm border border-border rounded-full shadow-lg">
				<span className="text-sm font-medium text-foreground tabular-nums">
					{selectedCount} of {totalCount} selected
				</span>
				<div className="w-px h-4 bg-border" />
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={onBulkEdit}
						className="gap-2 min-h-9"
						aria-label="Edit selected properties"
					>
						<Pencil className="w-4 h-4" />
						Edit
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onBulkDelete}
						className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-9"
						aria-label="Delete selected properties"
					>
						<Trash2 className="w-4 h-4" />
						Delete
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={onClear}
						className="size-8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
						aria-label="Clear selection"
					>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>,
		portalRoot
	)
}

// ============================================================================
// MAIN PROPERTIES COMPONENT
// ============================================================================

export function Properties({
	properties,
	summary,
	filter = 'all',
	isLoading,
	onPropertyClick,
	onPropertyEdit,
	onPropertyDelete,
	onAddProperty,
	onFilterChange,
	onBulkImport
}: PropertiesProps) {
	const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState(filter)
	const [typeFilter, setTypeFilter] = useState('all')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

	// Selection handlers
	const toggleSelect = useCallback((id: string) => {
		setSelectedRows(prev => {
			const newSelected = new Set(prev)
			if (newSelected.has(id)) {
				newSelected.delete(id)
			} else {
				newSelected.add(id)
			}
			return newSelected
		})
	}, [])

	const clearSelection = useCallback(() => {
		setSelectedRows(new Set())
	}, [])

	// Filter properties
	const filteredProperties = useMemo(() => {
		return properties.filter(p => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (
					!p.name.toLowerCase().includes(query) &&
					!p.addressLine1.toLowerCase().includes(query) &&
					!p.city.toLowerCase().includes(query)
				) {
					return false
				}
			}
			if (statusFilter === 'occupied' && p.availableUnits > 0) return false
			if (statusFilter === 'available' && p.availableUnits === 0) return false
			if (statusFilter === 'maintenance' && p.maintenanceUnits === 0)
				return false
			if (typeFilter !== 'all' && p.propertyType !== typeFilter) return false
			return true
		})
	}, [properties, searchQuery, statusFilter, typeFilter])

	const handleSelectAll = useCallback(() => {
		if (selectedRows.size === filteredProperties.length) {
			setSelectedRows(new Set())
		} else {
			setSelectedRows(new Set(filteredProperties.map(p => p.id)))
		}
	}, [filteredProperties, selectedRows.size])

	// Empty state
	if (properties.length === 0 && !isLoading) {
		return (
			<div className="p-6 lg:p-8 min-h-full bg-background">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-sm bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<Building2 className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No properties yet
					</h2>
					<p className="text-muted-foreground mb-6">
						Add your first property to start managing your portfolio.
					</p>
					<Button
						onClick={onAddProperty}
						className="gap-2 min-h-11"
						aria-label="Add your first property to the portfolio"
					>
						<Plus className="w-5 h-5" />
						Add Your First Property
					</Button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 min-h-full bg-background">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Properties</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage your property portfolio
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={onBulkImport}
						className="gap-2 min-h-11"
						aria-label="Import multiple properties from file"
					>
						<Upload className="w-4 h-4" />
						Bulk Import
					</Button>
					<Button
						onClick={onAddProperty}
						className="gap-2 min-h-11"
						aria-label="Add a new property"
					>
						<Plus className="w-4 h-4" />
						Add Property
					</Button>
				</div>
			</div>

			{/* Stats Section */}
			<section className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Overview
					</h2>
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{/* Total Properties */}
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Properties</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{summary.totalProperties}
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Building2 className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>

					{/* Occupancy Rate */}
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Occupancy</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{summary.overallOccupancyRate}%
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Users className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>

					{/* Available Units */}
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Available</p>
						</div>
						<div className="flex items-end justify-between">
							<p className="text-2xl font-bold text-foreground">
								{summary.availableUnits}
							</p>
							<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<Home className="w-4 h-4 text-primary" />
							</div>
						</div>
					</div>

					{/* Monthly Revenue */}
					<div className="bg-card border border-border rounded-sm p-4 hover:border-primary/30 hover:shadow-md transition-all group">
						<div className="flex items-center justify-between mb-2">
							<p className="text-sm text-muted-foreground">Monthly Revenue</p>
						</div>
						<div className="flex items-end justify-between">
							<div>
								<p className="text-2xl font-bold text-foreground">
									{formatCurrency(summary.totalMonthlyRevenue)}
								</p>
								{summary.totalUnits > 0 && (
									<p className="text-xs text-muted-foreground">
										{formatCurrency(
											Math.round(
												summary.totalMonthlyRevenue / summary.totalUnits
											)
										)}
										/unit avg
									</p>
								)}
							</div>
							<div className="w-9 h-9 rounded-sm bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
								<DollarSign className="w-4 h-4 text-emerald-600" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Portfolio Section */}
			<section className="bg-card border border-border rounded-sm overflow-hidden">
				{/* Toolbar: Search LEFT, View Toggle RIGHT */}
				<div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
					{/* LEFT: Search + Filters */}
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<Input
							type="search"
							placeholder="Search properties..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="pl-9 h-10 focus:shadow-sm transition-shadow"
							aria-label="Search properties by name, address, or city"
						/>
					</div>

					<select
						value={statusFilter}
						onChange={e => {
							const value = e.target.value as typeof statusFilter
							setStatusFilter(value)
							onFilterChange?.(value)
						}}
						className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
						aria-label="Filter by status"
					>
						<option value="all">All Statuses</option>
						<option value="occupied">Fully Occupied</option>
						<option value="available">Has Available</option>
						<option value="maintenance">Has Maintenance</option>
					</select>

					<select
						value={typeFilter}
						onChange={e => setTypeFilter(e.target.value)}
						className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
						aria-label="Filter by property type"
					>
						<option value="all">All Types</option>
						<option value="single_family">Single Family</option>
						<option value="multi_family">Multi Family</option>
						<option value="apartment">Apartment</option>
						<option value="condo">Condo</option>
						<option value="townhouse">Townhouse</option>
						<option value="duplex">Duplex</option>
					</select>

					{/* RIGHT: Count + View Toggle */}
					<div className="flex items-center gap-3 ml-auto">
						<span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
							{filteredProperties.length}{' '}
							{filteredProperties.length === 1 ? 'property' : 'properties'}
						</span>

						<div
							className="flex items-center gap-1 p-1 bg-muted"
							role="tablist"
							aria-label="View mode"
						>
							<button
								onClick={() => setViewMode('table')}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors min-h-9',
									viewMode === 'table'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								)}
								role="tab"
								aria-selected={viewMode === 'table'}
								aria-label="Switch to table view"
							>
								<List className="w-4 h-4" />
								Table
							</button>
							<button
								onClick={() => setViewMode('grid')}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors min-h-9',
									viewMode === 'grid'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								)}
								role="tab"
								aria-selected={viewMode === 'grid'}
								aria-label="Switch to grid view"
							>
								<LayoutGrid className="w-4 h-4" />
								Grid
							</button>
						</div>
					</div>
				</div>

				{/* Grid View */}
				{viewMode === 'grid' && (
					<div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredProperties.map(property => (
								<PropertyCard
									key={property.id}
									property={property}
									isSelected={selectedRows.has(property.id)}
									onSelect={toggleSelect}
									onView={() => onPropertyClick?.(property.id)}
								/>
							))}
						</div>
					</div>
				)}

				{/* Table View */}
				{viewMode === 'table' && (
					<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
						<PropertyTable
							properties={filteredProperties}
							selectedRows={selectedRows}
							onSelectRow={toggleSelect}
							onSelectAll={handleSelectAll}
							onView={onPropertyClick}
							onEdit={onPropertyEdit}
							onDelete={onPropertyDelete}
						/>
					</div>
				)}

				{/* No results */}
				{filteredProperties.length === 0 && properties.length > 0 && (
					<div className="text-center py-12">
						<Search
							className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3"
							aria-hidden="true"
						/>
						<p className="text-muted-foreground">
							No properties match your filters
						</p>
						<Button
							variant="link"
							onClick={() => {
								setSearchQuery('')
								setStatusFilter('all')
								setTypeFilter('all')
							}}
							className="mt-3 min-h-11"
							aria-label="Clear all filters"
						>
							Clear filters
						</Button>
					</div>
				)}
			</section>

			{/* Floating Action Bar */}
			<PropertyActionBar
				selectedCount={selectedRows.size}
				totalCount={filteredProperties.length}
				onClear={clearSelection}
				onBulkEdit={() => {
					// TODO: Implement bulk edit
				}}
				onBulkDelete={() => {
					// TODO: Implement bulk delete
				}}
			/>
		</div>
	)
}
