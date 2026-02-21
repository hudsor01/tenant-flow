'use client'

import { useState, useMemo } from 'react'
import { Clock, AlertTriangle, CheckCircle, Plus, XCircle } from 'lucide-react'
import type {
	MaintenanceListProps,
	MaintenanceRequestItem
} from '@repo/shared/types/sections/maintenance'
import { BlurFade } from '#components/ui/blur-fade'
import { MaintenanceListEmpty } from '#components/maintenance/maintenance-list-empty'
import { MaintenanceListStats } from '#components/maintenance/maintenance-list-stats'
import { MaintenanceListToolbar } from '#components/maintenance/maintenance-list-toolbar'
import { KanbanColumn } from '#components/maintenance/maintenance-kanban-column'

function groupByStatus(requests: MaintenanceRequestItem[]) {
	return {
		open: requests.filter(r => r.status === 'open'),
		inProgress: requests.filter(r => r.status === 'in_progress'),
		completed: requests.filter(r => r.status === 'completed'),
		cancelled: requests.filter(r => r.status === 'cancelled')
	}
}

export function MaintenanceList({
	requests,
	onView,
	onUpdateStatus,
	onUpdatePriority: _onUpdatePriority,
	onCreate,
	onFilterChange: _onFilterChange
}: MaintenanceListProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

	// Single-pass stats + filter computation
	const { openCount, inProgressCount, completedCount, urgentCount, filteredRequests } =
		useMemo(() => {
			let open = 0
			let inProgress = 0
			let completed = 0
			let urgent = 0
			const filtered: MaintenanceRequestItem[] = []
			const lowerSearch = searchQuery.toLowerCase()

			for (const r of requests) {
				if (r.status === 'open') open++
				else if (r.status === 'in_progress') inProgress++
				else if (r.status === 'completed') completed++
				if (r.priority === 'urgent' && r.status !== 'completed') urgent++

				if (!searchQuery || (r.title ?? '').toLowerCase().includes(lowerSearch)) {
					filtered.push(r)
				}
			}

			return {
				openCount: open,
				inProgressCount: inProgress,
				completedCount: completed,
				urgentCount: urgent,
				filteredRequests: filtered
			}
		}, [requests, searchQuery])

	const grouped = useMemo(() => groupByStatus(filteredRequests), [filteredRequests])

	if (requests.length === 0) {
		return <MaintenanceListEmpty onCreate={onCreate} />
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Maintenance
						</h1>
						<p className="text-muted-foreground">
							Track and manage maintenance requests
						</p>
					</div>
					<button
						onClick={onCreate}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-4 h-4" />
						New Request
					</button>
				</div>
			</BlurFade>

			<MaintenanceListStats
				openCount={openCount}
				inProgressCount={inProgressCount}
				completedCount={completedCount}
				urgentCount={urgentCount}
				onCreate={onCreate}
			/>

			<MaintenanceListToolbar
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>

			{/* Kanban Board */}
			<div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8">
				<KanbanColumn
					title="Open"
					count={grouped.open.length}
					colorClass="bg-warning/10"
					icon={<Clock className="w-4 h-4 text-warning" />}
					requests={grouped.open}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={0}
				/>
				<KanbanColumn
					title="In Progress"
					count={grouped.inProgress.length}
					colorClass="bg-primary/10"
					icon={<AlertTriangle className="w-4 h-4 text-primary" />}
					requests={grouped.inProgress}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={1}
				/>
				<KanbanColumn
					title="Completed"
					count={grouped.completed.length}
					colorClass="bg-success/10"
					icon={<CheckCircle className="w-4 h-4 text-success" />}
					requests={grouped.completed}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={2}
				/>
				{grouped.cancelled.length > 0 && (
					<KanbanColumn
						title="Cancelled"
						count={grouped.cancelled.length}
						colorClass="bg-muted"
						icon={<XCircle className="w-4 h-4 text-muted-foreground" />}
						requests={grouped.cancelled}
						onView={onView}
						onUpdateStatus={onUpdateStatus}
						columnIndex={3}
					/>
				)}
			</div>
		</div>
	)
}
