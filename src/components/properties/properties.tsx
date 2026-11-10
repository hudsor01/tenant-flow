"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import {
	useDeletePropertyMutation,
	useUpdatePropertyMutation,
} from "#hooks/api/use-property-mutations";
import { toPropertyType } from "#lib/constants/status-types";
import { formatCount } from "#lib/formatters/count";
import { intersectSelection } from "#lib/intersect-selection";
import {
	type PropertyStatusFilter,
	usePropertiesStore,
} from "#stores/properties-store";
import {
	EmptyProperties,
	NoResultsFilter,
	PropertiesHeader,
	useBulkHandlers,
} from "./properties-filters";
import { PropertyActionBar } from "./property-action-bar";
import { PropertyBulkEditDialog } from "./property-bulk-edit-dialog";
import { PropertyCard } from "./property-select-card";
import { PropertyStatsSection } from "./property-stats-section";
import { PropertyTable } from "./property-table";
import { PropertyToolbar } from "./property-toolbar";
import type { PropertiesProps } from "./types";

/**
 * Properties - Main component for managing property portfolio
 *
 * Uses Zustand store for state management (usePropertiesStore).
 */
export function Properties({
	properties,
	summary,
	filter: _filter = "all",
	isLoading,
	onPropertyClick,
	onPropertyEdit,
	onPropertyDelete,
	onAddProperty,
	onFilterChange,
}: PropertiesProps) {
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
		pruneSelection,
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
		setIsBulkSaving,
	} = usePropertiesStore();

	const deletePropertyMutation = useDeletePropertyMutation();
	const updatePropertyMutation = useUpdatePropertyMutation();

	const { handleBulkEditOpen, bulkDeleteTargets, handleBulkDelete } =
		useBulkHandlers(
			selectedRows,
			properties,
			openBulkEdit,
			deletePropertyMutation,
			clearSelection,
		);
	// The action bar's Delete only opens the confirmation, with the ids it will
	// act on (and the one property's name); the delete runs from its Delete.
	// The ids outlive the close, so the copy holds while the dialog fades out.
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
	const [bulkDelete, setBulkDelete] = useState<{
		ids: string[];
		name: string | null;
	}>({ ids: [], name: null });
	const openBulkDelete = () => {
		const ids = bulkDeleteTargets();
		if (ids.length === 0) return;
		const only =
			ids.length === 1 ? properties.find((p) => p.id === ids[0]) : undefined;
		setBulkDelete({ ids, name: only?.name || null });
		setBulkDeleteOpen(true);
	};
	const bulkDeleteCount = bulkDelete.ids.length;

	// STATE-05: reconcile the selection against the fetched (active) property
	// list. `properties` excludes inactive rows, so a soft-deleted id drops out
	// of the selection as soon as the invalidated list query refetches —
	// clearing the phantom action-bar count.
	useEffect(() => {
		pruneSelection(properties.map((p) => p.id));
	}, [properties, pruneSelection]);

	const handleBulkEditSubmit = async () => {
		if (selectedRows.size === 0) return;
		if (!applyBulkStatus && !applyBulkType) return;
		// The dialog asks for a type when the first property's is outside the
		// set; applying "no type" would write nothing the form can read.
		if (applyBulkType && bulkEditType === null) return;
		// STATE-05: only target ids still present in the active list — a bulk
		// edit must never resurrect a just-deleted (inactive) property via a
		// phantom selection surviving the delete→refetch race.
		const ids = intersectSelection(
			selectedRows,
			properties.map((p) => p.id),
		);
		if (ids.length === 0) return;
		const updateData: Record<string, string> = {};
		if (applyBulkStatus) updateData.status = bulkEditStatus;
		if (applyBulkType && bulkEditType !== null)
			updateData.property_type = bulkEditType;
		setIsBulkSaving(true);
		try {
			await Promise.allSettled(
				ids.map((id) =>
					updatePropertyMutation.mutateAsync({ id, data: updateData }),
				),
			);
			clearSelection();
			closeBulkEdit();
		} finally {
			setIsBulkSaving(false);
		}
	};

	const filteredProperties = (() => {
		return properties.filter((p) => {
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				if (
					!(p.name ?? "").toLowerCase().includes(query) &&
					!(p.addressLine1 ?? "").toLowerCase().includes(query) &&
					!(p.city ?? "").toLowerCase().includes(query)
				)
					return false;
			}
			if (statusFilter === "occupied" && p.availableUnits > 0) return false;
			if (statusFilter === "available" && p.availableUnits === 0) return false;
			if (statusFilter === "maintenance" && p.maintenanceUnits === 0)
				return false;
			if (typeFilter !== "all" && toPropertyType(p.propertyType) !== typeFilter)
				return false;
			return true;
		});
	})();

	const handleSelectAll = () => {
		selectAll(filteredProperties.map((p) => p.id));
	};

	const handleStatusFilterChange = (value: PropertyStatusFilter) => {
		setStatusFilter(value);
		onFilterChange?.(value);
	};

	if (properties.length === 0 && !isLoading) {
		return <EmptyProperties onAddProperty={onAddProperty} />;
	}

	// No padding of its own: the page's wrapper pads it (p-6 lg:p-8), as every
	// owner page is padded once; a second p-6 lg:p-8 here inset the list 48px
	// at 390 (64px from the edge where every other owner page starts at 40) and
	// left its stat tiles 89px for a figure (66.2-39 fix round 4, Part 8c).
	return (
		<>
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
				{viewMode === "grid" && (
					<div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-auto max-h-[calc(100vh-340px)]">
						<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{filteredProperties.map((property) => (
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
				{viewMode === "table" && (
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
				onBulkDelete={openBulkDelete}
			/>
			<ConfirmDialog
				open={bulkDeleteOpen}
				// Cancel keeps the selection: nothing was deleted.
				onOpenChange={setBulkDeleteOpen}
				title={`Delete ${formatCount(bulkDeleteCount, "property", "properties")}?`}
				description={`This marks ${
					bulkDelete.name
						? `"${bulkDelete.name}"`
						: `the ${formatCount(bulkDeleteCount, "selected property", "selected properties")}`
				} as inactive, so ${
					bulkDeleteCount === 1
						? "it leaves your property list. Its units and leases are kept."
						: "they leave your property list. Their units and leases are kept."
				}`}
				confirmText="Delete"
				loading={deletePropertyMutation.isPending}
				onConfirm={() => {
					setBulkDeleteOpen(false);
					void handleBulkDelete(bulkDelete.ids);
				}}
			/>
			<PropertyBulkEditDialog
				open={isBulkEditOpen}
				selectedCount={selectedRows.size}
				bulkEditStatus={bulkEditStatus}
				bulkEditType={bulkEditType}
				applyBulkStatus={applyBulkStatus}
				applyBulkType={applyBulkType}
				isSaving={isBulkSaving}
				onOpenChange={(open) => {
					if (!open) closeBulkEdit();
				}}
				onStatusChange={setBulkEditStatus}
				onTypeChange={setBulkEditType}
				onApplyStatusChange={setApplyBulkStatus}
				onApplyTypeChange={setApplyBulkType}
				onSubmit={handleBulkEditSubmit}
			/>
		</>
	);
}
