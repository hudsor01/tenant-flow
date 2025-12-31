'use client'

import * as React from 'react'
import {
	Pencil,
	Trash2,
	FileText,
	ChevronDown,
	ChevronUp,
	ChevronsUpDown
} from 'lucide-react'
import { Checkbox } from '#components/ui/checkbox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Button } from '#components/ui/button'
import type { TenantItem } from '@repo/shared/types/sections/tenants'
import type { LeaseStatus } from '@repo/shared/types/core'
import { createLogger } from '@repo/shared/lib/frontend-logger'

// ============================================================================
// TYPES
// ============================================================================

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

type SortDirection = 'asc' | 'desc' | null
type SortField = 'fullName' | 'email' | 'property' | 'leaseStatus' | null

// ============================================================================
// STATUS SELECT CELL
// ============================================================================

function StatusSelectCell({
	value,
	onChange
}: {
	value: LeaseStatus | undefined
	onChange: (value: LeaseStatus) => void
}) {
	const statusLabels: Record<LeaseStatus, string> = {
		draft: 'Draft',
		pending_signature: 'Pending',
		active: 'Active',
		ended: 'Ended',
		terminated: 'Terminated'
	}

	return (
		<Select
			value={value || 'active'}
			onValueChange={v => onChange(v as LeaseStatus)}
		>
			<SelectTrigger className="h-8 w-[100px] text-sm">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{Object.entries(statusLabels).map(([key, label]) => (
					<SelectItem key={key} value={key}>
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

// ============================================================================
// SORTABLE COLUMN HEADER
// ============================================================================

function SortableHeader({
	title,
	field,
	currentSort,
	currentDirection,
	onSort
}: {
	title: string
	field: SortField
	currentSort: SortField
	currentDirection: SortDirection
	onSort: (field: SortField) => void
}) {
	const isActive = currentSort === field

	return (
		<button
			onClick={() => onSort(field)}
			className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
		>
			{title}
			{isActive ? (
				currentDirection === 'asc' ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)
			) : (
				<ChevronsUpDown className="h-4 w-4 opacity-50" />
			)}
		</button>
	)
}

// ============================================================================
// MAIN TABLE COMPONENT
// Styled to match @diceui/data-table aesthetic
// ============================================================================

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
	const logger = createLogger({ component: 'TenantTable' })
	const [sortField, setSortField] = React.useState<SortField>(null)
	const [sortDirection, setSortDirection] = React.useState<SortDirection>(null)
	const [pageIndex, setPageIndex] = React.useState(0)
	const pageSize = 10

	// Handle sorting
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

	// Sort and paginate tenants
	const sortedTenants = React.useMemo(() => {
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

	// Selection handlers
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
			{/* Table */}
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
							<tr
								key={tenant.id}
								className={`hover:bg-muted/50 transition-colors ${
									selectedIds.has(tenant.id) ? 'bg-primary/5' : ''
								}`}
							>
								<td className="px-4 py-3">
									<Checkbox
										checked={selectedIds.has(tenant.id)}
										onCheckedChange={() => handleSelectOne(tenant.id)}
										aria-label={`Select ${tenant.fullName}`}
									/>
								</td>
								<td className="px-4 py-3">
									<button
										onClick={() => onView(tenant.id)}
										className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
									>
										{tenant.fullName}
									</button>
								</td>
								<td className="px-4 py-3">
									<span className="text-sm text-muted-foreground">
										{tenant.email}
									</span>
								</td>
								<td className="px-4 py-3">
									<span className="text-sm text-muted-foreground">
										{tenant.phone || '—'}
									</span>
								</td>
								<td className="px-4 py-3">
									{tenant.currentProperty ? (
										<div className="text-left">
											<p className="text-sm text-foreground">
												{tenant.currentProperty}
											</p>
											{tenant.currentUnit && (
												<p className="text-xs text-muted-foreground">
													Unit {tenant.currentUnit}
												</p>
											)}
										</div>
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</td>
								<td className="px-4 py-3">
									<StatusSelectCell
										value={tenant.leaseStatus}
										onChange={value =>
											logger.info('Status change:', { tenantId: tenant.id, newStatus: value })
										}
									/>
								</td>
								<td className="px-4 py-3">
									{tenant.leaseStatus === 'active' ? (
										<Button
											variant="ghost"
											size="sm"
											className="h-auto p-0 text-primary"
											onClick={() => onViewLease(tenant.id)}
										>
											<FileText className="mr-1 h-3.5 w-3.5" />
											View
										</Button>
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => onEdit(tenant.id)}
										>
											<Pencil className="h-4 w-4" />
											<span className="sr-only">Edit</span>
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive hover:text-destructive hover:bg-destructive/10"
											onClick={() => onDelete(tenant.id)}
										>
											<Trash2 className="h-4 w-4" />
											<span className="sr-only">Delete</span>
										</Button>
									</div>
								</td>
							</tr>
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
