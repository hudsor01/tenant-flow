'use client'

import type { ReactNode } from 'react'
import { Clock, MoreHorizontal, MapPin, User } from 'lucide-react'
import type { MaintenanceRequestItem } from '@repo/shared/types/sections/maintenance'
import type { MaintenancePriority, MaintenanceStatus } from '@repo/shared/types/core'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'

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

export interface KanbanColumnProps {
	title: string
	count: number
	colorClass: string
	icon: ReactNode
	requests: MaintenanceRequestItem[]
	onView?: ((id: string) => void) | undefined
	onUpdateStatus?: ((id: string, status: MaintenanceStatus) => void) | undefined
	columnIndex: number
}

export function KanbanColumn({
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
