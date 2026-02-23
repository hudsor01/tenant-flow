'use client'

import { Search, LayoutGrid, List } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface MaintenanceListToolbarProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	viewMode: 'kanban' | 'list'
	onViewModeChange: (mode: 'kanban' | 'list') => void
}

export function MaintenanceListToolbar({
	searchQuery,
	onSearchChange,
	viewMode,
	onViewModeChange
}: MaintenanceListToolbarProps) {
	return (
		<BlurFade delay={0.35} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					{/* LEFT: Search */}
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
						<input
							type="text"
							placeholder="Search requests..."
							value={searchQuery}
							onChange={e => onSearchChange(e.target.value)}
							className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
						/>
					</div>

					{/* RIGHT: Clear + View Toggle (Kanban left, List right) */}
					<div className="flex items-center gap-3 ml-auto">
						{searchQuery && (
							<button
								onClick={() => onSearchChange('')}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Clear
							</button>
						)}

						<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
							<button
								onClick={() => onViewModeChange('kanban')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
									viewMode === 'kanban'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<LayoutGrid className="w-4 h-4" />
								Kanban
							</button>
							<button
								onClick={() => onViewModeChange('list')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
									viewMode === 'list'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<List className="w-4 h-4" />
								List
							</button>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
