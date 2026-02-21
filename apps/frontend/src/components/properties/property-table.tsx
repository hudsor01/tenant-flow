'use client'

import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Checkbox } from '#components/ui/checkbox'
import { cn } from '#lib/utils'
import type { ReactNode } from 'react'
import type { SortField, SortDirection, ColumnId, PropertyTableProps } from './property-table-types'
import { TABLE_COLUMNS } from './property-table-types'
import { PropertyTableToolbar } from './property-table-toolbar'
import { PropertyTableRow } from './property-table-row'

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
		children: ReactNode
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
			<PropertyTableToolbar
				propertyCount={properties.length}
				visibleColumns={visibleColumns}
				showColumnMenu={showColumnMenu}
				onToggleColumnMenu={() => setShowColumnMenu(!showColumnMenu)}
				onCloseColumnMenu={() => setShowColumnMenu(false)}
				onToggleColumn={toggleColumn}
			/>

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
							<PropertyTableRow
								key={property.id}
								property={property}
								isSelected={selectedRows.has(property.id)}
								visibleColumns={visibleColumns}
								onSelectRow={onSelectRow}
								onView={onView}
								onEdit={onEdit}
								onDelete={onDelete}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

