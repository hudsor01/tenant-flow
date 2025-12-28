'use client'

import { useState } from 'react'
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
	Wrench
} from 'lucide-react'
import type {
	PropertiesListProps,
	Property,
	PropertySummary
} from '@/../product/sections/properties-and-units/types'

// High quality property images from Unsplash
const PROPERTY_IMAGES = [
	'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
	'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
	'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
	'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
	'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
	'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&q=80',
	'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
	'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80'
]

function getPropertyImage(index: number): string {
	return PROPERTY_IMAGES[index % PROPERTY_IMAGES.length]
}

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

function formatAddress(property: Property): string {
	const parts = [property.addressLine1]
	if (property.addressLine2) parts.push(property.addressLine2)
	parts.push(`${property.city}, ${property.state} ${property.postalCode}`)
	return parts.join(', ')
}

// ============================================================================
// PROPERTY CARD (Grid View)
// ============================================================================

function PropertyCard({
	property,
	imageUrl,
	isSelected,
	onSelect,
	onView,
	onEdit,
	onDelete
}: {
	property: Property
	imageUrl: string
	isSelected?: boolean
	onSelect?: (id: string) => void
	onView?: () => void
	onEdit?: () => void
	onDelete?: () => void
}) {
	return (
		<div
			className={`bg-card border rounded-sm overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
		>
			{/* Property Image */}
			<div className="h-44 relative overflow-hidden">
				<img
					src={imageUrl}
					alt={property.name}
					className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
				/>
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
							{property.occupancyRate}%
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
					className="w-full mt-4 py-2.5 text-sm font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-sm transition-all duration-200 flex items-center justify-center gap-2 group/btn"
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

function PropertyTable({
	properties,
	onView,
	onEdit,
	onDelete
}: {
	properties: (Property & { imageUrl: string })[]
	onView?: (id: string) => void
	onEdit?: (id: string) => void
	onDelete?: (id: string) => void
}) {
	const [sortField, setSortField] = useState<SortField>('name')
	const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
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

	const sortedProperties = [...properties].sort((a, b) => {
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

	const toggleSelectAll = () => {
		if (selectedRows.size === properties.length) {
			setSelectedRows(new Set())
		} else {
			setSelectedRows(new Set(properties.map(p => p.id)))
		}
	}

	const toggleSelect = (id: string) => {
		const newSelected = new Set(selectedRows)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		setSelectedRows(newSelected)
	}

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
				className={`w-3.5 h-3.5 transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`}
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
					<button
						onClick={() => setShowColumnMenu(!showColumnMenu)}
						className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors"
					>
						<Settings2 className="w-4 h-4" />
						Columns
						<ChevronDown
							className={`w-3.5 h-3.5 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`}
						/>
					</button>

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
										className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors ${
											column.alwaysVisible
												? 'opacity-50 cursor-not-allowed'
												: ''
										}`}
									>
										<div
											className={`w-4 h-4 rounded border flex items-center justify-center ${
												isColumnVisible(column.id)
													? 'bg-primary border-primary'
													: 'border-border'
											}`}
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
								<input
									type="checkbox"
									checked={
										selectedRows.size === properties.length &&
										properties.length > 0
									}
									onChange={toggleSelectAll}
									className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
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
								className={`hover:bg-muted/30 transition-colors ${selectedRows.has(property.id) ? 'bg-primary/5' : ''}`}
							>
								<td className="px-4 py-3">
									<input
										type="checkbox"
										checked={selectedRows.has(property.id)}
										onChange={() => toggleSelect(property.id)}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
									/>
								</td>
								{isColumnVisible('property') && (
									<td className="px-4 py-3">
										<div className="flex items-center gap-3">
											<img
												src={property.imageUrl}
												alt={property.name}
												className="w-10 h-10 rounded-sm object-cover"
											/>
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
													className={`h-full rounded-full ${
														property.occupancyRate === 100
															? 'bg-emerald-500'
															: property.occupancyRate >= 80
																? 'bg-blue-500'
																: 'bg-amber-500'
													}`}
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
												<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
													{property.availableUnits} available
												</span>
											)}
											{property.maintenanceUnits > 0 && (
												<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
													<Wrench className="w-3 h-3" />
													{property.maintenanceUnits}
												</span>
											)}
											{property.availableUnits === 0 &&
												property.maintenanceUnits === 0 && (
													<span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
														Full
													</span>
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
										<button
											onClick={() => onView?.(property.id)}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="View"
										>
											<Eye className="w-4 h-4" />
										</button>
										<button
											onClick={() => onEdit?.(property.id)}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="Edit"
										>
											<Pencil className="w-4 h-4" />
										</button>
										<button
											onClick={() => onDelete?.(property.id)}
											className="p-2 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
											title="Delete"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Table Footer */}
			{selectedRows.size > 0 && (
				<div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						{selectedRows.size} of {properties.length} selected
					</span>
					<div className="flex gap-2">
						<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
							Bulk Edit
						</button>
						<button className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-sm transition-colors">
							Delete Selected
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

// ============================================================================
// MAIN PROPERTY LIST
// ============================================================================

export function PropertyList({
	properties,
	summary,
	filter = 'all',
	isLoading,
	onPropertyClick,
	onPropertyEdit,
	onPropertyDelete,
	onAddProperty,
	onFilterChange
}: PropertiesListProps) {
	const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState(filter)
	const [typeFilter, setTypeFilter] = useState('all')
	const [gridSelectedRows, setGridSelectedRows] = useState<Set<string>>(
		new Set()
	)

	// Grid selection handlers
	const toggleGridSelect = (id: string) => {
		const newSelected = new Set(gridSelectedRows)
		if (newSelected.has(id)) {
			newSelected.delete(id)
		} else {
			newSelected.add(id)
		}
		setGridSelectedRows(newSelected)
	}

	const clearGridSelection = () => {
		setGridSelectedRows(new Set())
	}

	// Add images to properties
	const propertiesWithImages = properties.map((p, i) => ({
		...p,
		imageUrl: p.images[0]?.url || getPropertyImage(i)
	}))

	// Filter properties
	const filteredProperties = propertiesWithImages.filter(p => {
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
		if (statusFilter === 'maintenance' && p.maintenanceUnits === 0) return false
		if (typeFilter !== 'all' && p.propertyType !== typeFilter) return false
		return true
	})

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
					<button
						onClick={onAddProperty}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-sm transition-colors"
					>
						<Plus className="w-5 h-5" />
						Add Your First Property
					</button>
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
					<button className="inline-flex items-center gap-2 px-4 py-2.5 border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium rounded-sm transition-colors">
						<Upload className="w-4 h-4" />
						Bulk Import
					</button>
					<button
						onClick={onAddProperty}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-sm transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add Property
					</button>
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

					{/* Available */}
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
								<p className="text-xs text-muted-foreground">
									{formatCurrency(
										Math.round(summary.totalMonthlyRevenue / summary.totalUnits)
									)}
									/unit avg
								</p>
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
				{/* Standardized Toolbar: Search LEFT, View Toggle RIGHT */}
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					{/* LEFT: Search + Filters */}
					<div className="relative w-64">
						<input
							type="text"
							placeholder="Search properties..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="w-full pl-3 pr-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
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

						<div className="flex items-center gap-1 p-1 bg-muted">
							<button
								onClick={() => setViewMode('table')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
									viewMode === 'table'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<List className="w-4 h-4" />
								Table
							</button>
							<button
								onClick={() => setViewMode('grid')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
									viewMode === 'grid'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
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
						{/* Grid Bulk Actions Bar */}
						{gridSelectedRows.size > 0 && (
							<div className="mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
								<div className="flex items-center gap-3">
									<input
										type="checkbox"
										checked={
											gridSelectedRows.size === filteredProperties.length &&
											filteredProperties.length > 0
										}
										onChange={() => {
											if (gridSelectedRows.size === filteredProperties.length) {
												clearGridSelection()
											} else {
												setGridSelectedRows(
													new Set(filteredProperties.map(p => p.id))
												)
											}
										}}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
									/>
									<span className="text-sm font-medium text-foreground">
										{gridSelectedRows.size} of {filteredProperties.length}{' '}
										selected
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
										Bulk Edit
									</button>
									<button className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-sm transition-colors">
										Delete Selected
									</button>
									<button
										onClick={clearGridSelection}
										className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
									>
										Clear
									</button>
								</div>
							</div>
						)}

						<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredProperties.map(property => (
								<PropertyCard
									key={property.id}
									property={property}
									imageUrl={property.imageUrl}
									isSelected={gridSelectedRows.has(property.id)}
									onSelect={toggleGridSelect}
									onView={() => onPropertyClick?.(property.id)}
									onEdit={() => onPropertyEdit?.(property.id)}
									onDelete={() => onPropertyDelete?.(property.id)}
								/>
							))}
						</div>
					</div>
				)}

				{/* Table View */}
				{viewMode === 'table' && (
					<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div className="border-t border-border">
							<PropertyTable
								properties={filteredProperties}
								onView={onPropertyClick}
								onEdit={onPropertyEdit}
								onDelete={onPropertyDelete}
							/>
						</div>
					</div>
				)}

				{/* No results */}
				{filteredProperties.length === 0 && properties.length > 0 && (
					<div className="text-center py-12">
						<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground">
							No properties match your filters
						</p>
						<button
							onClick={() => {
								setSearchQuery('')
								setStatusFilter('all')
								setTypeFilter('all')
							}}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}
			</section>
		</div>
	)
}
