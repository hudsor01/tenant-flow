'use client'

import { useMemo, useCallback } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '#components/ui/button'
import { PropertyBulkImportDialog } from './bulk-import-dialog'
import {
	useDeletePropertyMutation,
	useUpdatePropertyMutation
} from '#hooks/api/mutations/property-mutations'

import { PropertyCard } from './property-select-card'
import { PropertyTable } from './property-table'
import { PropertyActionBar } from './property-action-bar'
import { PropertyStatsSection } from './property-stats-section'
import { PropertyToolbar } from './property-toolbar'
import { PropertyBulkEditDialog } from './property-bulk-edit-dialog'
import { PropertyEmptyState, PropertyNoResults } from './property-empty-state'

import type { PropertiesProps, PropertyType } from './types'
import {
	usePropertiesStore,
	type PropertyStatusFilter
} from '#stores/properties-store'

const PROPERTY_TYPE_TO_API: Record<PropertyType, string> = {
	single_family: 'SINGLE_FAMILY',
	multi_family: 'MULTI_UNIT',
	apartment: 'APARTMENT',
	condo: 'CONDO',
	townhouse: 'TOWNHOUSE',
	duplex: 'MULTI_UNIT'
}

/**
 * Properties - Main component for managing property portfolio
 *
 * Features:
 * - Grid and Table view modes
 * - Search and filtering
 * - Bulk selection and actions
 * - Summary statistics
 * - Empty state handling
 *
 * Uses Zustand store for state management (usePropertiesStore).
 * See stores/properties-store.ts for state structure.
 */
export function Properties({
	properties,
	summary,
	filter: _filter = 'all',
	isLoading,
	onPropertyClick,
	onPropertyEdit,
	onPropertyDelete,
	onAddProperty,
	onFilterChange
}: PropertiesProps) {
	// Get state and actions from Zustand store
	const {
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		typeFilter,
		setTypeFilter,
		clearFilters,
		selectedRows,
		toggleSelect,
		selectAll,
		clearSelection,
		isBulkEditOpen,
		bulkEditStatus,
		bulkEditType,
		applyBulkStatus,
		applyBulkType,
		isBulkSaving,
		openBulkEdit,
		closeBulkEdit,
		setBulkEditStatus,
		setBulkEditType,
		setApplyBulkStatus,
		setApplyBulkType,
		setIsBulkSaving
	} = usePropertiesStore()

	const deletePropertyMutation = useDeletePropertyMutation()
	const updatePropertyMutation = useUpdatePropertyMutation()

	const handleBulkEditOpen = useCallback(() => {
		if (selectedRows.size === 0) return
		const firstSelected = properties.find(p => selectedRows.has(p.id))
		if (firstSelected) {
			openBulkEdit(firstSelected.status, firstSelected.propertyType)
		}
	}, [properties, selectedRows, openBulkEdit])

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
			updateData.property_type = PROPERTY_TYPE_TO_API[bulkEditType] as string
		}
		setIsBulkSaving(true)
		try {
			await Promise.allSettled(
				ids.map(id =>
					updatePropertyMutation.mutateAsync({ id, data: updateData })
				)
			)
			clearSelection()
			closeBulkEdit()
		} finally {
			setIsBulkSaving(false)
		}
	}, [
		applyBulkStatus,
		applyBulkType,
		bulkEditStatus,
		bulkEditType,
		clearSelection,
		closeBulkEdit,
		selectedRows,
		setIsBulkSaving,
		updatePropertyMutation
	])

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
		selectAll(filteredProperties.map(p => p.id))
	}, [filteredProperties, selectAll])

	const handleStatusFilterChange = useCallback(
		(value: PropertyStatusFilter) => {
			setStatusFilter(value)
			onFilterChange?.(value)
		},
		[onFilterChange, setStatusFilter]
	)

	if (properties.length === 0 && !isLoading) {
		return <PropertyEmptyState onAddProperty={onAddProperty} />
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

			<PropertyStatsSection summary={summary} />

			{/* Portfolio Section */}
			<section className="bg-card border border-border rounded-sm overflow-hidden">
				<PropertyToolbar
					searchQuery={searchQuery}
					statusFilter={statusFilter}
					typeFilter={typeFilter}
					viewMode={viewMode}
					filteredCount={filteredProperties.length}
					onSearchChange={setSearchQuery}
					onStatusFilterChange={handleStatusFilterChange}
					onTypeFilterChange={setTypeFilter}
					onViewModeChange={setViewMode}
				/>

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
					<PropertyNoResults onClearFilters={clearFilters} />
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

			<PropertyBulkEditDialog
				open={isBulkEditOpen}
				selectedCount={selectedRows.size}
				bulkEditStatus={bulkEditStatus}
				bulkEditType={bulkEditType}
				applyBulkStatus={applyBulkStatus}
				applyBulkType={applyBulkType}
				isSaving={isBulkSaving}
				onOpenChange={open => {
				if (!open) closeBulkEdit()
			}}
				onStatusChange={setBulkEditStatus}
				onTypeChange={setBulkEditType}
				onApplyStatusChange={setApplyBulkStatus}
				onApplyTypeChange={setApplyBulkType}
				onSubmit={handleBulkEditSubmit}
			/>
		</div>
	)
}
