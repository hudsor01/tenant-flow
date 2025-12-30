'use client'

/**
 * @todo SIZE-001: Split this component (1285 lines) into smaller sub-components.
 *       CLAUDE.md limit is 300 lines per component.
 *       Suggested split: PropertyList, PropertyFilters, PropertyActions, PropertyDialogs.
 *       See TODO.md for details.
 */

import { useState, useMemo, useCallback } from 'react'
import {
	Building2,
	Plus,
	Users,
	DollarSign,
	Search,
	LayoutGrid,
	List,
	Home
} from 'lucide-react'

import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Checkbox } from '#components/ui/checkbox'
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { cn } from '#lib/utils'
import { PropertyBulkImportDialog } from './bulk-import-dialog'
import {
	useDeletePropertyMutation,
	useUpdatePropertyMutation
} from '#hooks/api/mutations/property-mutations'

// Import extracted components
import { PropertyCard } from './property-card'
import { PropertyTable } from './property-table'
import { PropertyActionBar } from './property-action-bar'

// Import types from centralized types file
import type { PropertyType, PropertyStatus, PropertiesProps } from './types'

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

const PROPERTY_TYPE_TO_API: Record<PropertyType, string> = {
	single_family: 'SINGLE_FAMILY',
	multi_family: 'MULTI_UNIT',
	apartment: 'APARTMENT',
	condo: 'CONDO',
	townhouse: 'TOWNHOUSE',
	duplex: 'MULTI_UNIT'
}

// ============================================================================
// MAIN PROPERTIES COMPONENT
// ============================================================================

/**
 * Properties - Main component for managing property portfolio
 *
 * Features:
 * - Grid and Table view modes
 * - Search and filtering
 * - Bulk selection and actions
 * - Summary statistics
 * - Empty state handling
 */
export function Properties({
	properties,
	summary,
	filter = 'all',
	isLoading,
	onPropertyClick,
	onPropertyEdit,
	onPropertyDelete,
	onAddProperty,
	onFilterChange
}: PropertiesProps) {
	const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState(filter)
	const [typeFilter, setTypeFilter] = useState('all')
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
	const [isBulkEditOpen, setIsBulkEditOpen] = useState(false)
	const [bulkEditStatus, setBulkEditStatus] =
		useState<PropertyStatus>('active')
	const [bulkEditType, setBulkEditType] =
		useState<PropertyType>('single_family')
	const [applyBulkStatus, setApplyBulkStatus] = useState(false)
	const [applyBulkType, setApplyBulkType] = useState(false)
	const [isBulkSaving, setIsBulkSaving] = useState(false)
	const deletePropertyMutation = useDeletePropertyMutation()
	const updatePropertyMutation = useUpdatePropertyMutation()

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

	const handleBulkEditOpen = useCallback(() => {
		if (selectedRows.size === 0) return
		const firstSelected = properties.find(p => selectedRows.has(p.id))
		if (firstSelected) {
			setBulkEditStatus(firstSelected.status)
			setBulkEditType(firstSelected.propertyType)
		}
		setApplyBulkStatus(false)
		setApplyBulkType(false)
		setIsBulkEditOpen(true)
	}, [properties, selectedRows])

	const handleBulkDelete = useCallback(async () => {
		if (selectedRows.size === 0) return
		const ids = Array.from(selectedRows)
		const label = ids.length === 1 ? 'property' : 'properties'
		const confirmed =
			typeof window === 'undefined'
				? true
				: window.confirm(
						`Delete ${ids.length} ${label}? This will mark the ${label} as inactive.`
					)
		if (!confirmed) return
		clearSelection()
		await Promise.allSettled(
			ids.map(id => deletePropertyMutation.mutateAsync(id))
		)
	}, [selectedRows, deletePropertyMutation, clearSelection])

	const handleBulkEditSubmit = useCallback(async () => {
		if (selectedRows.size === 0) return
		if (!applyBulkStatus && !applyBulkType) return
		const ids = Array.from(selectedRows)
		const updateData: Record<string, string> = {}
		if (applyBulkStatus) {
			updateData.status = bulkEditStatus
		}
		if (applyBulkType) {
			updateData.property_type = PROPERTY_TYPE_TO_API[bulkEditType]
		}
		setIsBulkSaving(true)
		try {
			await Promise.allSettled(
				ids.map(id =>
					updatePropertyMutation.mutateAsync({ id, data: updateData })
				)
			)
			clearSelection()
			setIsBulkEditOpen(false)
		} finally {
			setIsBulkSaving(false)
		}
	}, [
		applyBulkStatus,
		applyBulkType,
		bulkEditStatus,
		bulkEditType,
		clearSelection,
		selectedRows,
		updatePropertyMutation
	])

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
					<PropertyBulkImportDialog />
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
				onBulkEdit={handleBulkEditOpen}
				onBulkDelete={handleBulkDelete}
			/>

			<Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
				<DialogContent intent="edit">
					<DialogHeader>
						<DialogTitle>Bulk edit properties</DialogTitle>
						<DialogDescription>
							Apply changes to {selectedRows.size}{' '}
							{selectedRows.size === 1 ? 'property' : 'properties'}.
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<Checkbox
									checked={applyBulkStatus}
									onCheckedChange={checked =>
										setApplyBulkStatus(Boolean(checked))
									}
									aria-label="Apply status"
								/>
								<div className="flex-1 space-y-2">
									<label
										htmlFor="bulk-status"
										className="text-sm font-medium text-foreground"
									>
										Status
									</label>
									<select
										id="bulk-status"
										disabled={!applyBulkStatus}
										value={bulkEditStatus}
										onChange={e =>
											setBulkEditStatus(e.target.value as PropertyStatus)
										}
										className="w-full appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<option value="active">Active</option>
										<option value="inactive">Inactive</option>
										<option value="sold">Sold</option>
									</select>
								</div>
							</div>

							<div className="flex items-start gap-3">
								<Checkbox
									checked={applyBulkType}
									onCheckedChange={checked =>
										setApplyBulkType(Boolean(checked))
									}
									aria-label="Apply property type"
								/>
								<div className="flex-1 space-y-2">
									<label
										htmlFor="bulk-type"
										className="text-sm font-medium text-foreground"
									>
										Property type
									</label>
									<select
										id="bulk-type"
										disabled={!applyBulkType}
										value={bulkEditType}
										onChange={e =>
											setBulkEditType(e.target.value as PropertyType)
										}
										className="w-full appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9 disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<option value="single_family">Single Family</option>
										<option value="multi_family">Multi Family</option>
										<option value="apartment">Apartment</option>
										<option value="condo">Condo</option>
										<option value="townhouse">Townhouse</option>
										<option value="duplex">Duplex</option>
									</select>
								</div>
							</div>
						</div>
					</DialogBody>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsBulkEditOpen(false)}
							disabled={isBulkSaving}
						>
							Cancel
						</Button>
						<Button
							onClick={handleBulkEditSubmit}
							disabled={
								isBulkSaving || (!applyBulkStatus && !applyBulkType)
							}
						>
							{isBulkSaving
								? 'Applying...'
								: `Apply to ${selectedRows.size}`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
