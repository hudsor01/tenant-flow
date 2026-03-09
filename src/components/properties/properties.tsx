'use client'


import {
	useDeletePropertyMutation,
	useUpdatePropertyMutation
} from '#hooks/api/use-property-mutations'
import { PropertyCard } from './property-select-card'
import { PropertyTable } from './property-table'
import { PropertyActionBar } from './property-action-bar'
import { PropertyStatsSection } from './property-stats-section'
import { PropertyToolbar } from './property-toolbar'
import { PropertyBulkEditDialog } from './property-bulk-edit-dialog'
import type { PropertiesProps, PropertyType } from './types'
import {
	usePropertiesStore,
	type PropertyStatusFilter
} from '#stores/properties-store'
import {
	EmptyProperties,
	PropertiesHeader,
	NoResultsFilter,
	useBulkHandlers
} from './properties-filters'

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
 * Uses Zustand store for state management (usePropertiesStore).
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
	const {
		viewMode, setViewMode, searchQuery, setSearchQuery,
		statusFilter, setStatusFilter, typeFilter, setTypeFilter,
		clearFilters, selectedRows, toggleSelect, selectAll, clearSelection,
		isBulkEditOpen, bulkEditStatus, bulkEditType,
		applyBulkStatus, applyBulkType, isBulkSaving,
		openBulkEdit, closeBulkEdit, setBulkEditStatus, setBulkEditType,
		setApplyBulkStatus, setApplyBulkType, setIsBulkSaving
	} = usePropertiesStore()

	const deletePropertyMutation = useDeletePropertyMutation()
	const updatePropertyMutation = useUpdatePropertyMutation()

	const { handleBulkEditOpen, handleBulkDelete } = useBulkHandlers(
		selectedRows, properties, openBulkEdit, deletePropertyMutation, clearSelection
	)

	const handleBulkEditSubmit = async () => {
		if (selectedRows.size === 0) return
		if (!applyBulkStatus && !applyBulkType) return
		const ids = Array.from(selectedRows)
		const updateData: Record<string, string> = {}
		if (applyBulkStatus) updateData.status = bulkEditStatus
		if (applyBulkType) updateData.property_type = PROPERTY_TYPE_TO_API[bulkEditType] as string
		setIsBulkSaving(true)
		try {
			await Promise.allSettled(
				ids.map(id => updatePropertyMutation.mutateAsync({ id, data: updateData }))
			)
			clearSelection()
			closeBulkEdit()
		} finally {
			setIsBulkSaving(false)
		}
	}

	const filteredProperties = (() => {
		return properties.filter(p => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (
					!(p.name ?? '').toLowerCase().includes(query) &&
					!(p.addressLine1 ?? '').toLowerCase().includes(query) &&
					!(p.city ?? '').toLowerCase().includes(query)
				) return false
			}
			if (statusFilter === 'occupied' && p.availableUnits > 0) return false
			if (statusFilter === 'available' && p.availableUnits === 0) return false
			if (statusFilter === 'maintenance' && p.maintenanceUnits === 0) return false
			if (typeFilter !== 'all' && p.propertyType !== typeFilter) return false
			return true
		})
	})()

	const handleSelectAll = () => {
		selectAll(filteredProperties.map(p => p.id))
	}

	const handleStatusFilterChange = (value: PropertyStatusFilter) => {
			setStatusFilter(value)
			onFilterChange?.(value)
		}

	if (properties.length === 0 && !isLoading) {
		return <EmptyProperties onAddProperty={onAddProperty} />
	}

	return (
		<div className="p-6 lg:p-8 min-h-full bg-background">
			<PropertiesHeader onAddProperty={onAddProperty} />
			<PropertyStatsSection summary={summary} />
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
				{viewMode === 'grid' && (
					<div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-auto max-h-[calc(100vh-340px)]">
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
				{filteredProperties.length === 0 && properties.length > 0 && (
					<NoResultsFilter onClearFilters={clearFilters} />
				)}
			</section>
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
				onOpenChange={open => { if (!open) closeBulkEdit() }}
				onStatusChange={setBulkEditStatus}
				onTypeChange={setBulkEditType}
				onApplyStatusChange={setApplyBulkStatus}
				onApplyTypeChange={setApplyBulkType}
				onSubmit={handleBulkEditSubmit}
			/>
		</div>
	)
}
