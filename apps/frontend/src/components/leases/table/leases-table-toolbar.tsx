'use client'

import { Search, ChevronDown } from 'lucide-react'
import type { StatusFilter } from '#stores/leases-store'

interface LeasesTableToolbarProps {
	searchQuery: string
	statusFilter: StatusFilter
	onSearchChange: (value: string) => void
	onStatusFilterChange: (filter: StatusFilter) => void
}

export function LeasesTableToolbar({
	searchQuery,
	statusFilter,
	onSearchChange,
	onStatusFilterChange
}: LeasesTableToolbarProps) {
	const handleClear = () => {
		onSearchChange('')
		onStatusFilterChange('all')
	}

	return (
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
				{(searchQuery || statusFilter !== 'all') && (
					<button
						onClick={handleClear}
						className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Clear
					</button>
				)}
				<div className="relative">
					<select
						value={statusFilter}
						onChange={e => onStatusFilterChange(e.target.value as StatusFilter)}
						className="appearance-none pl-3 pr-8 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
					>
						<option value="all">All Statuses</option>
						<option value="active">Active</option>
						<option value="expiring">Expiring Soon</option>
						<option value="pending_signature">Pending Signature</option>
						<option value="ended">Ended</option>
						<option value="terminated">Terminated</option>
					</select>
					<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				</div>
			</div>
		</div>
	)
}
