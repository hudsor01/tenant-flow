"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Checkbox } from "#components/ui/checkbox";
import { cn } from "#lib/utils";
import { PropertyTableRow } from "./property-table-row";
import { PropertyTableToolbar } from "./property-table-toolbar";
import type {
	ColumnId,
	PropertyTableProps,
	SortDirection,
	SortField,
} from "./property-table-types";
import { PROPERTY_COLUMN_CLASS, TABLE_COLUMNS } from "./property-table-types";

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
	onDelete,
}: PropertyTableProps) {
	const [sortField, setSortField] = useState<SortField>("name");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
		new Set(
			TABLE_COLUMNS.filter((c) => c.alwaysVisible || c.defaultVisible).map(
				(c) => c.id,
			),
		),
	);
	const [showColumnMenu, setShowColumnMenu] = useState(false);

	const toggleColumn = (columnId: ColumnId) => {
		const column = TABLE_COLUMNS.find((c) => c.id === columnId);
		if (column?.alwaysVisible) return;

		const newVisible = new Set(visibleColumns);
		if (newVisible.has(columnId)) {
			newVisible.delete(columnId);
		} else {
			newVisible.add(columnId);
		}
		setVisibleColumns(newVisible);
	};

	const isColumnVisible = (columnId: ColumnId) => visibleColumns.has(columnId);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const sortedProperties = (() => {
		return [...properties].sort((a, b) => {
			let comparison = 0;
			switch (sortField) {
				case "name":
					comparison = a.name.localeCompare(b.name);
					break;
				case "address":
					comparison = a.addressLine1.localeCompare(b.addressLine1);
					break;
				case "units":
					comparison = a.totalUnits - b.totalUnits;
					break;
				case "occupancy":
					comparison = a.occupancyRate - b.occupancyRate;
					break;
				case "revenue":
					comparison = a.monthlyRevenue - b.monthlyRevenue;
					break;
			}
			return sortDirection === "asc" ? comparison : -comparison;
		});
	})();

	const SortHeader = ({
		field,
		children,
	}: {
		field: SortField;
		children: ReactNode;
	}) => (
		<button
			onClick={() => handleSort(field)}
			className="flex items-center gap-1 hover:text-foreground transition-colors group"
		>
			{children}
			<ArrowUpDown
				className={cn(
					"w-3.5 h-3.5 transition-colors",
					sortField === field
						? "text-primary"
						: "text-muted-foreground/50 group-hover:text-muted-foreground",
				)}
			/>
		</button>
	);

	const tableScrollRef = useRef<HTMLDivElement>(null);
	const rowVirtualizer = useVirtualizer({
		count: sortedProperties.length,
		getScrollElement: () => tableScrollRef.current,
		estimateSize: () => 64,
		overscan: 5,
	});

	return (
		<div className="bg-card border border-border rounded-sm overflow-hidden">
			{/* Table Toolbar */}
			<PropertyTableToolbar
				propertyCount={properties.length}
				visibleColumns={visibleColumns}
				showColumnMenu={showColumnMenu}
				onToggleColumnMenu={() => setShowColumnMenu(!showColumnMenu)}
				onCloseColumnMenu={() => setShowColumnMenu(false)}
				onToggleColumn={toggleColumn}
			/>

			{/* Table */}
			<div
				ref={tableScrollRef}
				className="overflow-auto max-h-[calc(100vh-340px)]"
			>
				{/* grid/flex strip the implicit table ARIA roles, so explicit
				    role attributes are restored on every structural element
				    (mirrors portfolio-data-table.tsx). */}
				<table className="grid w-full" role="table">
					<thead className="grid sticky top-0 z-10" role="rowgroup">
						<tr
							className="flex w-full border-b border-border bg-muted/30"
							role="row"
						>
							<th
								className={cn(PROPERTY_COLUMN_CLASS.checkbox, "px-4 py-3")}
								role="columnheader"
							>
								<Checkbox
									checked={
										selectedRows.size === properties.length &&
										properties.length > 0
									}
									onCheckedChange={onSelectAll}
								/>
							</th>
							{isColumnVisible("property") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.property,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									<SortHeader field="name">Property</SortHeader>
								</th>
							)}
							{isColumnVisible("address") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.address,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									<SortHeader field="address">Address</SortHeader>
								</th>
							)}
							{isColumnVisible("units") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.units,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									<SortHeader field="units">Units</SortHeader>
								</th>
							)}
							{isColumnVisible("occupancy") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.occupancy,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									<SortHeader field="occupancy">Occupancy</SortHeader>
								</th>
							)}
							{isColumnVisible("status") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.status,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									Status
								</th>
							)}
							{isColumnVisible("revenue") && (
								<th
									role="columnheader"
									className={cn(
										PROPERTY_COLUMN_CLASS.revenue,
										"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
									)}
								>
									<SortHeader field="revenue">Monthly Revenue</SortHeader>
								</th>
							)}
							<th
								role="columnheader"
								className={cn(
									PROPERTY_COLUMN_CLASS.actions,
									"px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
								)}
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody
						className="relative grid divide-y divide-border"
						role="rowgroup"
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
						}}
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const property = sortedProperties[virtualRow.index]!;
							return (
								<PropertyTableRow
									key={property.id}
									property={property}
									virtualRow={virtualRow}
									isSelected={selectedRows.has(property.id)}
									visibleColumns={visibleColumns}
									onSelectRow={onSelectRow}
									onView={onView}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
