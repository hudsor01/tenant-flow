'use client'

import {
	Search,
	ChevronLeft,
	ChevronRight,
	Pencil,
	ArrowUpDown,
	Eye,
	RefreshCw,
	XCircle
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import {
	formatDate,
	getStatusConfig,
	type LeaseDisplay,
	type SortField,
	type SortDirection
} from './lease-utils'
import type { StatusFilter } from '#stores/leases-store'
import { LeasesTableToolbar } from './leases-table-toolbar'

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

function SortHeader({
	field,
	sortField,
	children,
	className = '',
	onSort
}: {
	field: SortField
	sortField: SortField
	children: React.ReactNode
	className?: string
	onSort: (field: SortField) => void
}) {
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

function StatusBadge({ status }: { status: string }) {
	const config = getStatusConfig(status)
	return (
		<span
			className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${config.className}`}
		>
			{config.label}
		</span>
	)
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

	return (
		<BlurFade delay={0.6} inView>
			<div className="bg-card border border-border rounded-sm overflow-hidden">
				<LeasesTableToolbar
					searchQuery={searchQuery}
					statusFilter={statusFilter}
					onSearchChange={onSearchChange}
					onStatusFilterChange={onStatusFilterChange}
				/>

				{/* Bulk Actions */}
				{selectedRows.size > 0 && (
					<div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
						<span className="text-sm font-medium text-foreground">
							{selectedRows.size} selected
						</span>
						<div className="flex items-center gap-2">
							<button className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-sm hover:bg-muted transition-colors">
								Export
							</button>
							<button
								onClick={onClearSelection}
								className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Clear
							</button>
						</div>
					</div>
				)}

				{/* Table */}
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-border bg-muted/30">
								<th className="w-12 px-4 py-3">
									<input
										type="checkbox"
										checked={
											selectedRows.size === leases.length && leases.length > 0
										}
										onChange={onToggleSelectAll}
										className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
									/>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader
										field="tenant"
										sortField={sortField}
										onSort={onSort}
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									>
										Tenant
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left hidden lg:table-cell">
									<SortHeader
										field="property"
										sortField={sortField}
										onSort={onSort}
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
									>
										Property
									</SortHeader>
								</th>
								<th className="px-4 py-3 text-left">
									<SortHeader
										field="status"
										sortField={sortField}
										onSort={onSort}
										className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
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
											onClick={() => onView(lease.id)}
											className="font-medium text-foreground hover:text-primary hover:underline transition-colors text-left"
										>
											{lease.tenantName}
										</button>
										<p className="text-xs text-muted-foreground">
											{formatDate(lease.startDate)} -{' '}
											{formatDate(lease.endDate)}
										</p>
										<p className="text-sm text-muted-foreground lg:hidden">
											{lease.propertyName}
										</p>
									</td>
									<td className="px-4 py-3 hidden lg:table-cell">
										<p className="text-sm text-foreground">
											{lease.propertyName}
										</p>
										<p className="text-xs text-muted-foreground">
											Unit {lease.unitNumber}
										</p>
									</td>
									<td className="px-4 py-3">
										<StatusBadge status={lease.status} />
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={() => onView(lease.id)}
												className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="View"
											>
												<Eye className="w-4 h-4" />
											</button>
											<button
												onClick={() => onEdit(lease.id)}
												className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
												title="Edit"
											>
												<Pencil className="w-4 h-4" />
											</button>
											{lease.status === 'active' && (
												<>
													<button
														onClick={() => onRenew(lease)}
														className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
														title="Renew Lease"
													>
														<RefreshCw className="w-4 h-4" />
													</button>
													<button
														onClick={() => onTerminate(lease)}
														className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
														title="Terminate Lease"
													>
														<XCircle className="w-4 h-4" />
													</button>
												</>
											)}
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
							{Math.min(currentPage * itemsPerPage, leases.length)} of{' '}
							{leases.length}
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
								onClick={() =>
									onPageChange(Math.min(totalPages, currentPage + 1))
								}
								disabled={currentPage === totalPages}
								className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* No results */}
				{leases.length === 0 && (searchQuery || statusFilter !== 'all') && (
					<div className="text-center py-12">
						<Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
						<p className="text-muted-foreground">
							No leases match your filters
						</p>
						<button
							onClick={handleClearFilters}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
