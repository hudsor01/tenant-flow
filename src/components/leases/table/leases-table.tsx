'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { LeaseDisplay, SortField, SortDirection } from './lease-utils'
import type { StatusFilter } from '#stores/leases-store'
import { LeasesTableToolbar } from './leases-table-toolbar'
import { SortHeader, LeaseRow } from './leases-table-columns'

interface LeasesTableProps {
	leases: LeaseDisplay[]
	paginatedLeases: LeaseDisplay[]
	searchQuery: string
	statusFilter: StatusFilter
	sortField: SortField
	sortDirection: SortDirection
	selectedRows: Set<string>
	currentPage: number
	totalPages: number
	itemsPerPage: number
	onSearchChange: (value: string) => void
	onStatusFilterChange: (filter: StatusFilter) => void
	onSort: (field: SortField) => void
	onToggleSelectAll: () => void
	onToggleSelect: (id: string) => void
	onPageChange: (page: number) => void
	onView: (id: string) => void
	onEdit: (id: string) => void
	onRenew: (lease: LeaseDisplay) => void
	onTerminate: (lease: LeaseDisplay) => void
	onClearSelection: () => void
}

export function LeasesTable({
	leases,
	paginatedLeases,
	searchQuery,
	statusFilter,
	sortField,
	sortDirection: _sortDirection,
	selectedRows,
	currentPage,
	totalPages,
	itemsPerPage,
	onSearchChange,
	onStatusFilterChange,
	onSort,
	onToggleSelectAll,
	onToggleSelect,
	onPageChange,
	onView,
	onEdit,
	onRenew,
	onTerminate,
	onClearSelection
}: LeasesTableProps) {
	const handleClearFilters = () => {
		onSearchChange('')
		onStatusFilterChange('all')
	}

	const tableScrollRef = useRef<HTMLDivElement>(null)
	const rowVirtualizer = useVirtualizer({
		count: paginatedLeases.length,
		getScrollElement: () => tableScrollRef.current,
		estimateSize: () => 72,
		overscan: 5,
	})

	return (
		<BlurFade delay={0.6} inView>
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				<LeasesTableToolbar
					searchQuery={searchQuery}
					statusFilter={statusFilter}
					onSearchChange={onSearchChange}
					onStatusFilterChange={onStatusFilterChange}
				/>
				{selectedRows.size > 0 && (
					<div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
						<span className="text-sm font-medium text-foreground">{selectedRows.size} selected</span>
						<div className="flex items-center gap-2">
							<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
								Export
							</button>
							<button onClick={onClearSelection} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
								Clear
							</button>
						</div>
					</div>
				)}
				<div ref={tableScrollRef} className="overflow-auto max-h-[calc(100vh-420px)]">
					<table className="w-full">
						<thead className="sticky top-0 z-10">
							<tr className="border-b border-border bg-muted/30">
								<th className="w-12 px-4 py-3">
									<input
										type="checkbox"
										checked={selectedRows.size === leases.length && leases.length > 0}
										onChange={onToggleSelectAll}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader field="tenant" sortField={sortField} onSort={onSort} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Tenant
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden lg:table-cell">
									<SortHeader field="property" sortField={sortField} onSort={onSort} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Property
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader field="status" sortField={sortField} onSort={onSort} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Status
									</SortHeader>
								</th>
								<th className="w-20 px-4 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border" style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
							{rowVirtualizer.getVirtualItems().map(virtualRow => {
								const lease = paginatedLeases[virtualRow.index]!
								return (
									<LeaseRow
										key={lease.id}
										lease={lease}
										isSelected={selectedRows.has(lease.id)}
										onToggleSelect={onToggleSelect}
										onView={onView}
										onEdit={onEdit}
										onRenew={onRenew}
										onTerminate={onTerminate}
									/>
								)
							})}
						</tbody>
					</table>
				</div>
				{totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
							{Math.min(currentPage * itemsPerPage, leases.length)} of {leases.length}
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => onPageChange(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="px-3 py-1 text-sm text-foreground">{currentPage} / {totalPages}</span>
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
				{leases.length === 0 && (searchQuery || statusFilter !== 'all') && (
					<div className="text-center py-12">
						<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground">No leases match your filters</p>
						<button onClick={handleClearFilters} className="mt-3 text-sm text-primary hover:underline">
							Clear filters
						</button>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
