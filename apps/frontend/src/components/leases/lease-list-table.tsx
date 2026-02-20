'use client'

import type { ReactNode } from 'react'
import { Search, ChevronLeft, ChevronRight, Pencil, ArrowUpDown, Eye } from 'lucide-react'
import type { LeaseItem } from '@repo/shared/types/sections/leases'
import type { LeaseStatus } from '@repo/shared/types/core'
import type { SortField } from '#components/leases/table/lease-utils'

function getStatusBadge(status: LeaseStatus) {
	const config: Record<LeaseStatus, { className: string; label: string }> = {
		draft: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending'
		},
		active: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		}
	}

	const { className, label } = config[status] ?? {
		className: 'bg-muted text-muted-foreground',
		label: status
	}

	return (
		<span
			className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${className}`}
		>
			{label}
		</span>
	)
}

interface SortHeaderProps {
	field: SortField
	children: ReactNode
	className?: string
	sortField: SortField
	onSort: (field: SortField) => void
}

function SortHeader({ field, children, className = '', sortField, onSort }: SortHeaderProps) {
	return (
		<button
			onClick={() => onSort(field)}
			className={`flex items-center gap-1 hover:text-foreground transition-colors group ${className}`}
		>
			{children}
			<ArrowUpDown
				className={`w-3.5 h-3.5 transition-colors ${sortField === field ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`}
			/>
		</button>
	)
}

interface LeaseListTableProps {
	paginatedLeases: LeaseItem[]
	sortedLeases: LeaseItem[]
	sortField: SortField
	onSort: (field: SortField) => void
	selectedRows: Set<string>
	onToggleSelectAll: (ids: string[]) => void
	onToggleSelect: (id: string) => void
	onView?: ((id: string) => void) | undefined
	currentPage: number
	totalPages: number
	itemsPerPage: number
	onPageChange: (page: number) => void
	onClearFilters: () => void
	hasLeases: boolean
}

export function LeaseListTable({
	paginatedLeases,
	sortedLeases,
	sortField,
	onSort,
	selectedRows,
	onToggleSelectAll,
	onToggleSelect,
	onView,
	currentPage,
	totalPages,
	itemsPerPage,
	onPageChange,
	onClearFilters,
	hasLeases
}: LeaseListTableProps) {
	return (
		<>
			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border bg-muted/30">
							<th className="w-12 px-4 py-3">
								<input
									type="checkbox"
									checked={
										selectedRows.size === sortedLeases.length &&
										sortedLeases.length > 0
									}
									onChange={() => onToggleSelectAll(sortedLeases.map(l => l.id))}
									className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
								/>
							</th>
							<th className="px-4 py-3 text-left">
								<SortHeader
									field="tenant"
									className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									sortField={sortField}
									onSort={onSort}
								>
									Tenant
								</SortHeader>
							</th>
							<th className="px-4 py-3 text-left hidden lg:table-cell">
								<SortHeader
									field="property"
									className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									sortField={sortField}
									onSort={onSort}
								>
									Property
								</SortHeader>
							</th>
							<th className="px-4 py-3 text-left">
								<SortHeader
									field="status"
									className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									sortField={sortField}
									onSort={onSort}
								>
									Status
								</SortHeader>
							</th>
							<th className="w-20 px-4 py-3"></th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{paginatedLeases.map(lease => (
							<tr
								key={lease.id}
								className={`hover:bg-muted/50 transition-colors ${selectedRows.has(lease.id) ? 'bg-primary/5' : ''}`}
							>
								<td className="px-4 py-3">
									<input
										type="checkbox"
										checked={selectedRows.has(lease.id)}
										onChange={() => onToggleSelect(lease.id)}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
								</td>
								<td className="px-4 py-3">
									<button
										onClick={() => onView?.(lease.id)}
										className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
									>
										{lease.tenantName}
									</button>
									<p className="text-sm text-muted-foreground lg:hidden">
										{lease.propertyName}
									</p>
								</td>
								<td className="px-4 py-3 hidden lg:table-cell">
									<p className="text-sm text-foreground">{lease.propertyName}</p>
									<p className="text-xs text-muted-foreground">
										Unit {lease.unitNumber}
									</p>
								</td>
								<td className="px-4 py-3">
									{getStatusBadge(lease.status)}
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center justify-end gap-1">
										<button
											onClick={() => onView?.(lease.id)}
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="View"
										>
											<Eye className="w-4 h-4" />
										</button>
										<button
											className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
											title="Edit"
										>
											<Pencil className="w-4 h-4" />
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="px-4 py-3 border-t border-border flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
						{Math.min(currentPage * itemsPerPage, sortedLeases.length)} of{' '}
						{sortedLeases.length}
					</span>
					<div className="flex items-center gap-1">
						<button
							onClick={() => onPageChange(Math.max(1, currentPage - 1))}
							disabled={currentPage === 1}
							className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>
						<span className="px-3 py-1 text-sm text-foreground">
							{currentPage} / {totalPages}
						</span>
						<button
							onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
							disabled={currentPage === totalPages}
							className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
					</div>
				</div>
			)}

			{/* No results */}
			{sortedLeases.length === 0 && hasLeases && (
				<div className="text-center py-12">
					<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
					<p className="text-muted-foreground">No leases match your filters</p>
					<button
						onClick={onClearFilters}
						className="mt-3 text-sm text-primary hover:underline"
					>
						Clear filters
					</button>
				</div>
			)}
		</>
	)
}
