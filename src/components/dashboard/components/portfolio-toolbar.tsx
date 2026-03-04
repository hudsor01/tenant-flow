'use client'

import { LayoutGrid, List, Search } from 'lucide-react'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'

interface PortfolioToolbarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	statusFilter: string
	onStatusFilterChange: (value: string) => void
	viewMode: 'table' | 'grid'
	onViewModeChange: (mode: 'table' | 'grid') => void
	onClearFilters: () => void
}

export function PortfolioToolbar({
	searchQuery,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	viewMode,
	onViewModeChange,
	onClearFilters
}: PortfolioToolbarProps) {
	const hasActiveFilters = searchQuery || statusFilter !== 'all'

	return (
		<div className="px-4 py-3 border-b border-border flex items-center gap-3">
			{/* LEFT: Search only */}
			<div className="relative w-64">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Search properties..."
					value={searchQuery}
					onChange={e => onSearchChange(e.target.value)}
					className="pl-9 h-9"
				/>
			</div>

			{/* RIGHT: Filters + View Toggle */}
			<div className="flex items-center gap-3 ml-auto">
				{hasActiveFilters && (
					<button
						onClick={onClearFilters}
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						Clear
					</button>
				)}

				<Select value={statusFilter} onValueChange={onStatusFilterChange}>
					<SelectTrigger className="w-[140px] h-9">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="active">Active</SelectItem>
						<SelectItem value="expiring">Expiring</SelectItem>
						<SelectItem value="vacant">Vacant</SelectItem>
					</SelectContent>
				</Select>

				<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
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
				</div>
			</div>
		</div>
	)
}
