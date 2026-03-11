'use client'

import { Suspense } from 'react'
import {
	BarChart3,
	LayoutGrid,
	List,
	Plus,
	Search
} from 'lucide-react'
import Link from 'next/link'
import { BlurFade } from '#components/ui/blur-fade'
import {
	MaintenanceInsightsSection,
	MaintenanceInsightsSkeleton
} from '#components/analytics/maintenance-insights-section'
import { MaintenanceKanban } from './kanban/maintenance-kanban.client'
import { MaintenanceTableClient } from './table/maintenance-table.client'
import { columns } from './table/columns'
import type { MaintenanceDisplayRequest } from '#types/sections/maintenance'

type ViewType = 'kanban' | 'table'

interface MaintenanceOverviewTabProps {
	searchQuery: string
	onSearchChange: (value: string) => void
	currentView: ViewType
	onViewChange: (view: ViewType) => void
	filteredRequests: MaintenanceDisplayRequest[]
	onViewAnalytics: () => void
}

export function MaintenanceOverviewTab({
	searchQuery,
	onSearchChange,
	currentView,
	onViewChange,
	filteredRequests,
	onViewAnalytics
}: MaintenanceOverviewTabProps) {
	return (
		<>
			{/* Quick Actions */}
			<BlurFade delay={0.35} inView>
				<div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
					<Link
						href="/maintenance/new"
						className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
					>
						<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
							<Plus className="w-4 h-4" />
						</div>
						<div className="text-left">
							<div className="text-sm font-medium">New Request</div>
							<div className="text-xs text-muted-foreground">
								Create ticket
							</div>
						</div>
					</Link>
					<button
						onClick={onViewAnalytics}
						className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors shrink-0"
					>
						<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
							<BarChart3 className="w-4 h-4" />
						</div>
						<div className="text-left">
							<div className="text-sm font-medium">Analytics</div>
							<div className="text-xs text-muted-foreground">
								View insights
							</div>
						</div>
					</button>
				</div>
			</BlurFade>

			{/* Standardized Toolbar: Search LEFT, View Toggle RIGHT */}
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

						{/* RIGHT: Clear + View Toggle */}
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
									onClick={() => onViewChange('kanban')}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
										currentView === 'kanban'
											? 'bg-background text-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'
									}`}
								>
									<LayoutGrid className="w-4 h-4" />
									Kanban
								</button>
								<button
									onClick={() => onViewChange('table')}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
										currentView === 'table'
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

			{/* Content */}
			<BlurFade delay={0.4} inView>
				{currentView === 'kanban' ? (
					<MaintenanceKanban initialRequests={filteredRequests} />
				) : (
					<div className="overflow-auto max-h-[calc(100vh-420px)]">
						<MaintenanceTableClient
							columns={columns}
							initialRequests={filteredRequests}
						/>
					</div>
				)}
			</BlurFade>
		</>
	)
}

export function MaintenanceInsightsTab() {
	return (
		<Suspense fallback={<MaintenanceInsightsSkeleton />}>
			<MaintenanceInsightsSection />
		</Suspense>
	)
}
