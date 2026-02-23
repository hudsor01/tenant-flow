'use client'

import { LayoutGrid, List } from 'lucide-react'
import type { TenantStatusFilter } from '#stores/tenants-store'

interface TenantToolbarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	statusFilter: TenantStatusFilter
	onStatusFilterChange: (value: TenantStatusFilter) => void
	viewMode: 'table' | 'grid'
	onViewModeChange: (mode: 'table' | 'grid') => void
	filteredCount: number
}

export function TenantToolbar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	viewMode,
	onViewModeChange,
	filteredCount
}: TenantToolbarProps) {
	return (
		<div className="px-4 py-3 border-b border-border flex items-center gap-3">
			{/* LEFT: Search + Filters */}
			<div className="relative w-64">
				<input
					type="text"
					placeholder="Search tenants..."
					value={searchQuery}
					onChange={e => onSearchChange(e.target.value)}
					className="w-full pl-3 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
				/>
			</div>

			<select
				value={statusFilter}
				onChange={e => onStatusFilterChange(e.target.value as TenantStatusFilter)}
				className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
			>
				<option value="all">All Statuses</option>
				<option value="active">Active</option>
				<option value="pending_signature">Pending</option>
				<option value="ended">Ended</option>
				<option value="terminated">Terminated</option>
			</select>

			{/* RIGHT: Count + View Toggle */}
			<div className="flex items-center gap-3 ml-auto">
				<span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
					{filteredCount} {filteredCount === 1 ? 'tenant' : 'tenants'}
				</span>

				<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
					<button
						onClick={() => onViewModeChange('table')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							viewMode === 'table'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<List className="w-4 h-4" />
						Table
					</button>
					<button
						onClick={() => onViewModeChange('grid')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
							viewMode === 'grid'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<LayoutGrid className="w-4 h-4" />
						Grid
					</button>
				</div>
			</div>
		</div>
	)
}
