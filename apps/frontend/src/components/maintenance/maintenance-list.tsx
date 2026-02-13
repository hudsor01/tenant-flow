'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import {
	Wrench,
	Plus,
	Clock,
	AlertTriangle,
	CheckCircle,
	Search,
	LayoutGrid,
	List,
	MoreHorizontal,
	MapPin,
	User,
	XCircle,
	UserCheck,
	Download,
	BarChart3
} from 'lucide-react'
import type {
	MaintenanceListProps,
	MaintenanceRequestItem
} from '@repo/shared/types/sections/maintenance'
import type { MaintenancePriority, MaintenanceStatus } from '@repo/shared/types/core'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

function getDaysOpen(timestamp: string): number {
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getAgingDisplay(timestamp: string) {
	const days = getDaysOpen(timestamp)

	if (days <= 3) {
		return {
			label: days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`,
			className: 'bg-success/10 text-success'
		}
	} else if (days <= 7) {
		return {
			label: `${days} days`,
			className: 'bg-warning/10 text-warning'
		}
	} else if (days <= 14) {
		return {
			label: `${days} days`,
			className:
				'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
		}
	} else {
		return {
			label: `${days} days`,
			className: 'bg-destructive/10 text-destructive'
		}
	}
}

function getPriorityBadge(priority: MaintenancePriority) {
	const config: Record<MaintenancePriority, string> = {
		low: 'bg-muted text-muted-foreground',
		normal: 'bg-muted text-muted-foreground',
		medium: 'bg-primary/10 text-primary',
		high: 'bg-warning/10 text-warning',
		urgent: 'bg-destructive/10 text-destructive'
	}

	return (
		<span
			className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config[priority]}`}
		>
			{priority}
		</span>
	)
}

interface KanbanColumnProps {
	title: string
	count: number
	colorClass: string
	icon: ReactNode
	requests: MaintenanceRequestItem[]
	onView?: ((id: string) => void) | undefined
	onUpdateStatus?: ((id: string, status: MaintenanceStatus) => void) | undefined
	columnIndex: number
}

function KanbanColumn({
	title,
	count,
	colorClass,
	icon,
	requests,
	onView,
	columnIndex
}: KanbanColumnProps) {
	const sortedRequests = [...requests].sort((a, b) => {
		return getDaysOpen(b.submittedAt) - getDaysOpen(a.submittedAt)
	})

	return (
		<BlurFade delay={0.3 + columnIndex * 0.1} inView>
			<div className="flex flex-col min-w-[300px] w-[300px] bg-muted/30 rounded-lg">
				{/* Column Header */}
				<div className="flex items-center gap-3 p-4 border-b border-border">
					<div
						className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}
					>
						{icon}
					</div>
					<div className="flex-1">
						<h3 className="font-medium text-foreground">{title}</h3>
					</div>
					<span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-muted-foreground">
						{count}
					</span>
				</div>

				{/* Cards Container */}
				<div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-380px)]">
					{sortedRequests.map((request, idx) => {
						const aging = getAgingDisplay(request.submittedAt)
						const isUrgent = request.priority === 'urgent'

						return (
							<BlurFade
								key={request.id}
								delay={0.4 + columnIndex * 0.1 + idx * 0.03}
								inView
							>
								<button
									onClick={() => onView?.(request.id)}
									className="w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group relative overflow-hidden"
								>
									{isUrgent && (
										<BorderBeam
											size={60}
											duration={4}
											colorFrom="hsl(var(--destructive))"
											colorTo="hsl(var(--destructive)/0.3)"
										/>
									)}

									{/* Card Header */}
									<div className="flex items-start justify-between gap-2 mb-3">
										<h4 className="font-medium text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
											{request.title}
										</h4>
										<button
											onClick={e => {
												e.stopPropagation()
											}}
											className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
										>
											<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
										</button>
									</div>

									{/* Property Info */}
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
										<MapPin className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{request.propertyName} · Unit {request.unitNumber}
										</span>
									</div>

									{/* Card Footer - Priority and Aging */}
									<div className="flex items-center justify-between gap-2">
										{getPriorityBadge(request.priority)}
										<div
											className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${aging.className}`}
										>
											<Clock className="w-3 h-3" />
											{aging.label}
										</div>
									</div>

									{/* Tenant */}
									{request.tenantName && (
										<div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
											<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
												<User className="w-2.5 h-2.5 text-primary" />
											</div>
											<span className="text-xs text-muted-foreground truncate">
												{request.tenantName}
											</span>
										</div>
									)}
								</button>
							</BlurFade>
						)
					})}

					{requests.length === 0 && (
						<div className="text-center py-8">
							<p className="text-sm text-muted-foreground">No requests</p>
						</div>
					)}
				</div>
			</div>
		</BlurFade>
	)
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

	// Calculate stats
	const openCount = requests.filter(r => r.status === 'open').length
	const inProgressCount = requests.filter(
		r => r.status === 'in_progress'
	).length
	const completedCount = requests.filter(r => r.status === 'completed').length
	const urgentCount = requests.filter(
		r => r.priority === 'urgent' && r.status !== 'completed'
	).length

	// Filter requests by search
	const filteredRequests = requests.filter(r => {
		if (
			searchQuery &&
			!(r.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false
		}
		return true
	})

	// Group by status for Kanban
	const openRequests = filteredRequests.filter(r => r.status === 'open')
	const inProgressRequests = filteredRequests.filter(
		r => r.status === 'in_progress'
	)
	const completedRequests = filteredRequests.filter(
		r => r.status === 'completed'
	)
	const cancelledRequests = filteredRequests.filter(
		r => r.status === 'cancelled'
	)

	if (requests.length === 0) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="max-w-md mx-auto text-center py-16">
						<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
							<Wrench className="w-8 h-8 text-primary" />
						</div>
						<h2 className="text-xl font-semibold text-foreground mb-3">
							No maintenance requests
						</h2>
						<p className="text-muted-foreground mb-6">
							Maintenance requests from tenants will appear here.
						</p>
						<button
							onClick={onCreate}
							className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
						>
							<Plus className="w-5 h-5" />
							Create Request
						</button>
					</div>
				</BlurFade>
			</div>
		)
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

			{/* Stats Cards - Premium Stat Components */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{openCount > 0 && (
							<BorderBeam
								size={80}
								duration={8}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Open</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={openCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>awaiting action</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In Progress</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={inProgressCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<AlertTriangle />
						</StatIndicator>
						<StatDescription>being worked on</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Completed</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={completedCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>this month</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{urgentCount > 0 && (
							<BorderBeam
								size={80}
								duration={4}
								colorFrom="hsl(var(--destructive))"
								colorTo="hsl(var(--destructive)/0.3)"
							/>
						)}
						<StatLabel>Urgent</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							<NumberTicker value={urgentCount} duration={800} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<Wrench />
						</StatIndicator>
						<StatDescription>
							{urgentCount > 0 ? 'needs attention' : 'all clear'}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Quick Actions */}
			<div className="flex items-center gap-3 mb-6">
				<button
					onClick={onCreate}
					className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
				>
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Plus className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">New Request</div>
						<div className="text-xs text-muted-foreground">Create ticket</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<UserCheck className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Assign Vendor</div>
						<div className="text-xs text-muted-foreground">Bulk assign</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<Download className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Export</div>
						<div className="text-xs text-muted-foreground">Download data</div>
					</div>
				</button>
				<button className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors">
					<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
						<BarChart3 className="w-4 h-4" />
					</div>
					<div className="text-left">
						<div className="text-sm font-medium">Analytics</div>
						<div className="text-xs text-muted-foreground">View insights</div>
					</div>
				</button>
			</div>

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
								onChange={e => setSearchQuery(e.target.value)}
								className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all h-9"
							/>
						</div>

						{/* RIGHT: Clear + View Toggle (Kanban left, List right) */}
						<div className="flex items-center gap-3 ml-auto">
							{searchQuery && (
								<button
									onClick={() => setSearchQuery('')}
									className="text-sm text-muted-foreground hover:text-foreground"
								>
									Clear
								</button>
							)}

							<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
								<button
									onClick={() => setViewMode('kanban')}
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
									onClick={() => setViewMode('list')}
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

			{/* Kanban Board */}
			<div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 lg:-mx-8 lg:px-8">
				<KanbanColumn
					title="Open"
					count={openRequests.length}
					colorClass="bg-warning/10"
					icon={<Clock className="w-4 h-4 text-warning" />}
					requests={openRequests}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={0}
				/>
				<KanbanColumn
					title="In Progress"
					count={inProgressRequests.length}
					colorClass="bg-primary/10"
					icon={<AlertTriangle className="w-4 h-4 text-primary" />}
					requests={inProgressRequests}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={1}
				/>
				<KanbanColumn
					title="Completed"
					count={completedRequests.length}
					colorClass="bg-success/10"
					icon={<CheckCircle className="w-4 h-4 text-success" />}
					requests={completedRequests}
					onView={onView}
					onUpdateStatus={onUpdateStatus}
					columnIndex={2}
				/>
				{cancelledRequests.length > 0 && (
					<KanbanColumn
						title="Cancelled"
						count={cancelledRequests.length}
						colorClass="bg-muted"
						icon={<XCircle className="w-4 h-4 text-muted-foreground" />}
						requests={cancelledRequests}
						onView={onView}
						onUpdateStatus={onUpdateStatus}
						columnIndex={3}
					/>
				)}
			</div>
		</div>
	)
}
