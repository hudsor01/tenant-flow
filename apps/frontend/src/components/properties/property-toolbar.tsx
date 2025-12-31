'use client'

import { Search, LayoutGrid, List } from 'lucide-react'
import { Input } from '#components/ui/input'
import { cn } from '#lib/utils'

type StatusFilter = 'all' | 'occupied' | 'available' | 'maintenance'
type ViewMode = 'grid' | 'table'

interface PropertyToolbarProps {
	searchQuery: string
	statusFilter: StatusFilter
	typeFilter: string
	viewMode: ViewMode
	filteredCount: number
	onSearchChange: (value: string) => void
	onStatusFilterChange: (filter: StatusFilter) => void
	onTypeFilterChange: (type: string) => void
	onViewModeChange: (mode: ViewMode) => void
}

export function PropertyToolbar({
	searchQuery,
	statusFilter,
	typeFilter,
	viewMode,
	filteredCount,
	onSearchChange,
	onStatusFilterChange,
	onTypeFilterChange,
	onViewModeChange
}: PropertyToolbarProps) {
	return (
		<div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
			{/* LEFT: Search + Filters */}
			<div className="relative w-64">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
				<Input
					type="search"
					placeholder="Search properties..."
					value={searchQuery}
					onChange={e => onSearchChange(e.target.value)}
					className="pl-9 h-10 focus:shadow-sm transition-shadow"
					aria-label="Search properties by name, address, or city"
				/>
			</div>

			<select
				value={statusFilter}
				onChange={e => onStatusFilterChange(e.target.value as StatusFilter)}
				className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
				aria-label="Filter by status"
			>
				<option value="all">All Statuses</option>
				<option value="occupied">Fully Occupied</option>
				<option value="available">Has Available</option>
				<option value="maintenance">Has Maintenance</option>
			</select>

			<select
				value={typeFilter}
				onChange={e => onTypeFilterChange(e.target.value)}
				className="appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9"
				aria-label="Filter by property type"
			>
				<option value="all">All Types</option>
				<option value="single_family">Single Family</option>
				<option value="multi_family">Multi Family</option>
				<option value="apartment">Apartment</option>
				<option value="condo">Condo</option>
				<option value="townhouse">Townhouse</option>
				<option value="duplex">Duplex</option>
			</select>

			{/* RIGHT: Count + View Toggle */}
			<div className="flex items-center gap-3 ml-auto">
				<span className="text-sm text-muted-foreground hidden sm:block tabular-nums">
					{filteredCount} {filteredCount === 1 ? 'property' : 'properties'}
				</span>

				<div
					className="flex items-center gap-1 p-1 bg-muted"
					role="tablist"
					aria-label="View mode"
				>
					<button
						onClick={() => onViewModeChange('table')}
						className={cn(
							'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors min-h-9',
							viewMode === 'table'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
						role="tab"
						aria-selected={viewMode === 'table'}
						aria-label="Switch to table view"
					>
						<List className="w-4 h-4" />
						Table
					</button>
					<button
						onClick={() => onViewModeChange('grid')}
						className={cn(
							'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors min-h-9',
							viewMode === 'grid'
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:text-foreground'
						)}
						role="tab"
						aria-selected={viewMode === 'grid'}
						aria-label="Switch to grid view"
					>
						<LayoutGrid className="w-4 h-4" />
						Grid
					</button>
				</div>
			</div>
		</div>
	)
}
