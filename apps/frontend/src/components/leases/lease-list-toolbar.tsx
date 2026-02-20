'use client'

import { Search, ChevronDown } from 'lucide-react'
import type { LeaseStatus } from '@repo/shared/types/core'
import type { StatusFilter } from '#stores/leases-store'

interface LeaseListToolbarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	statusFilter: StatusFilter
	onStatusFilterChange: (status: StatusFilter) => void
	hasActiveFilters: boolean
	onClearFilters: () => void
	selectedCount: number
	onClearSelection: () => void
	onFilterChange?: ((status: LeaseStatus | 'all') => void) | undefined
}

export function LeaseListToolbar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	hasActiveFilters,
	onClearFilters,
	selectedCount,
	onClearSelection,
	onFilterChange
}: LeaseListToolbarProps) {
	return (
		<>
			{/* Toolbar */}
			<div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
				{/* Left: Search */}
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
					<input
						type="text"
						placeholder="Search leases..."
						value={searchQuery}
						onChange={e => onSearchChange(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
					/>
				</div>

				{/* Right: Clear + Filter */}
				<div className="flex items-center gap-2 sm:ml-auto">
					{hasActiveFilters && (
						<button
							onClick={onClearFilters}
							className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							Clear
						</button>
					)}
					<div className="relative">
						<select
							value={statusFilter}
							onChange={e => {
								const value = e.target.value as StatusFilter
								onStatusFilterChange(value)
								onFilterChange?.(value as LeaseStatus | 'all')
							}}
							className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
						>
							<option value="all">All Statuses</option>
							<option value="active">Active</option>
							<option value="expiring">Expiring Soon</option>
							<option value="pending_signature">Pending Signature</option>
							<option value="expired">Expired</option>
							<option value="terminated">Terminated</option>
						</select>
						<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
					</div>
				</div>
			</div>

			{/* Bulk Actions */}
			{selectedCount > 0 && (
				<div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center justify-between">
					<span className="text-sm font-medium text-foreground">
						{selectedCount} selected
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
		</>
	)
}
