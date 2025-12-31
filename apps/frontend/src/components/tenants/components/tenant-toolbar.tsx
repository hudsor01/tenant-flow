'use client'

import { Search, ChevronDown } from 'lucide-react'
import type { LeaseStatus } from '@repo/shared/types/core'

interface TenantToolbarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	statusFilter: string
	onStatusFilterChange: (value: string) => void
	onFilterChange?: ((filter: LeaseStatus | 'all') => void) | undefined
	onClearFilters: () => void
}

export function TenantToolbar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	onFilterChange,
	onClearFilters
}: TenantToolbarProps) {
	const hasActiveFilters = searchQuery || statusFilter !== 'all'

	return (
		<div className="px-4 py-3 border-b border-border flex items-center gap-3">
			{/* LEFT: Search */}
			<div className="relative w-64">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<input
					type="text"
					placeholder="Search tenants..."
					value={searchQuery}
					onChange={e => onSearchChange(e.target.value)}
					className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
				/>
			</div>

			{/* RIGHT: Filter */}
			<div className="flex items-center gap-3 ml-auto">
				{hasActiveFilters && (
					<button
						onClick={onClearFilters}
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						Clear
					</button>
				)}

				<div className="relative">
					<select
						value={statusFilter}
						onChange={e => {
							onStatusFilterChange(e.target.value)
							onFilterChange?.(e.target.value as LeaseStatus | 'all')
						}}
						className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
					>
						<option value="all">All Statuses</option>
						<option value="draft">Draft</option>
						<option value="pending_signature">Pending</option>
						<option value="active">Active</option>
						<option value="ended">Ended</option>
						<option value="terminated">Terminated</option>
					</select>
					<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				</div>
			</div>
		</div>
	)
}
