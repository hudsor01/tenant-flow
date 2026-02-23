'use client'

import { useMemo, useState } from 'react'
import { Checkbox } from '#components/ui/checkbox'
import { Button } from '#components/ui/button'
import type { TenantItem } from '@repo/shared/types/sections/tenants'
import {
	SortableHeader,
	type SortDirection,
	type SortField
} from './tenant-table-helpers'
import { TenantTableRow } from './tenant-table-row'

interface TenantTableProps {
	tenants: TenantItem[]
	selectedIds: Set<string>
	onSelectChange: (ids: string[]) => void
	onSelectAll: () => void
	onDeselectAll: () => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onViewLease: (leaseId: string) => void
}

export function TenantTable({
	tenants,
	selectedIds,
	onSelectChange,
	onSelectAll,
	onDeselectAll,
	onView,
	onEdit,
	onDelete,
	onViewLease
}: TenantTableProps) {
	const [sortField, setSortField] = useState<SortField>(null)
	const [sortDirection, setSortDirection] = useState<SortDirection>(null)
	const [pageIndex, setPageIndex] = useState(0)
	const pageSize = 10

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			if (sortDirection === 'asc') {
				setSortDirection('desc')
			} else if (sortDirection === 'desc') {
				setSortField(null)
				setSortDirection(null)
			}
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const sortedTenants = useMemo(() => {
		if (!sortField || !sortDirection) return tenants

		return [...tenants].sort((a, b) => {
			let aVal: string = ''
			let bVal: string = ''

			switch (sortField) {
				case 'fullName':
					aVal = a.fullName
					bVal = b.fullName
					break
				case 'email':
					aVal = a.email
					bVal = b.email
					break
				case 'property':
					aVal = a.currentProperty || ''
					bVal = b.currentProperty || ''
					break
				case 'leaseStatus':
					aVal = a.leaseStatus || ''
					bVal = b.leaseStatus || ''
					break
			}

			const comparison = aVal.localeCompare(bVal)
			return sortDirection === 'asc' ? comparison : -comparison
		})
	}, [tenants, sortField, sortDirection])

	const paginatedTenants = sortedTenants.slice(
		pageIndex * pageSize,
		(pageIndex + 1) * pageSize
	)

	const totalPages = Math.ceil(sortedTenants.length / pageSize)

	const allSelected =
		paginatedTenants.length > 0 &&
		paginatedTenants.every(t => selectedIds.has(t.id))
	const someSelected =
		paginatedTenants.some(t => selectedIds.has(t.id)) && !allSelected

	const handleSelectAll = () => {
		if (allSelected) {
			onDeselectAll()
		} else {
			onSelectAll()
		}
	}

	const handleSelectOne = (id: string) => {
		const newIds = new Set(selectedIds)
		if (newIds.has(id)) {
			newIds.delete(id)
		} else {
			newIds.add(id)
		}
		onSelectChange(Array.from(newIds))
	}

	return (
		<div className="w-full">
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead className="border-b border-border bg-muted/50">
						<tr>
							<th className="w-10 px-4 py-3">
								<Checkbox
									checked={
										allSelected ? true : someSelected ? 'indeterminate' : false
									}
									onCheckedChange={handleSelectAll}
									aria-label="Select all"
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Name"
									field="fullName"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Email"
									field="email"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Phone
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Property"
									field="property"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortableHeader
									title="Status"
									field="leaseStatus"
									currentSort={sortField}
									currentDirection={sortDirection}
									onSort={handleSort}
								/>
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
								Lease
							</th>
							<th className="w-20 px-4 py-3"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{paginatedTenants.map(tenant => (
							<TenantTableRow
								key={tenant.id}
								tenant={tenant}
								isSelected={selectedIds.has(tenant.id)}
								onSelect={handleSelectOne}
								onView={onView}
								onEdit={onEdit}
								onDelete={onDelete}
								onViewLease={onViewLease}
							/>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between px-4 py-3 border-t border-border">
					<p className="text-sm text-muted-foreground">
						Showing {pageIndex * pageSize + 1} to{' '}
						{Math.min((pageIndex + 1) * pageSize, sortedTenants.length)} of{' '}
						{sortedTenants.length}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
							disabled={pageIndex === 0}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
							}
							disabled={pageIndex >= totalPages - 1}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
