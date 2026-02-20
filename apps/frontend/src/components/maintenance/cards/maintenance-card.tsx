'use client'

import type { MouseEvent } from 'react'

import { Clock, MapPin, MoreHorizontal, User } from 'lucide-react'
import Link from 'next/link'
import type { MaintenancePriority } from '@repo/shared/types/core'
import type { MaintenanceDisplayRequest } from '@repo/shared/types/sections/maintenance'
import { BorderBeam } from '#components/ui/border-beam'

function getDaysOpen(timestamp: string | null | undefined): number {
	if (!timestamp) return 0
	const date = new Date(timestamp)
	const now = new Date()
	const diff = now.getTime() - date.getTime()
	return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getAgingDisplay(timestamp: string | null | undefined) {
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

function getPriorityBadge(priority: MaintenancePriority | string) {
	const normalizedPriority = priority?.toLowerCase() as MaintenancePriority
	const config: Record<string, string> = {
		low: 'bg-muted text-muted-foreground',
		medium: 'bg-primary/10 text-primary',
		normal: 'bg-primary/10 text-primary',
		high: 'bg-warning/10 text-warning',
		urgent: 'bg-destructive/10 text-destructive'
	}

	return (
		<span
			className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config[normalizedPriority] ?? config.low}`}
		>
			{priority?.toLowerCase() ?? 'low'}
		</span>
	)
}

interface MaintenanceCardProps {
	request: MaintenanceDisplayRequest
	isDragging?: boolean
	onView?: ((id: string) => void) | undefined
}

export function MaintenanceCard({
	request,
	isDragging,
	onView
}: MaintenanceCardProps) {
	const aging = getAgingDisplay(request.created_at)
	const isUrgent = request.priority?.toLowerCase() === 'urgent'
	const propertyName = request.property?.name ?? 'Unknown Property'
	const unitNumber = request.unit?.name ?? request.unit_id ?? ''
	const tenantName = request.tenant?.name

	const handleClick = (e: MouseEvent) => {
		if (onView) {
			e.preventDefault()
			onView(request.id)
		}
	}

	const cardContent = (
		<div
			className={`w-full bg-card border border-border rounded-lg p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group relative overflow-hidden ${
				isDragging ? 'opacity-50 shadow-lg' : ''
			}`}
		>
			{isUrgent && (
				<BorderBeam
					size={60}
					duration={4}
					colorFrom="var(--color-destructive)"
					colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
				/>
			)}

			{/* Card Header */}
			<div className="flex items-start justify-between gap-2 mb-3">
				<h4 className="font-medium text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
					{request.title ?? request.description}
				</h4>
				<button
					onClick={e => {
						e.stopPropagation()
						e.preventDefault()
					}}
					className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
					aria-label="More options"
				>
					<MoreHorizontal className="w-4 h-4 text-muted-foreground" />
				</button>
			</div>

			{/* Property Info */}
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
				<MapPin className="w-3 h-3 shrink-0" />
				<span className="truncate">
					{propertyName}
					{unitNumber && ` · Unit ${unitNumber}`}
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
			{tenantName && (
				<div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
					<div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
						<User className="w-2.5 h-2.5 text-primary" />
					</div>
					<span className="text-xs text-muted-foreground truncate">
						{tenantName}
					</span>
				</div>
			)}
		</div>
	)

	if (onView) {
		return (
			<button onClick={handleClick} className="w-full">
				{cardContent}
			</button>
		)
	}

	return (
		<Link href={`/maintenance/${request.id}`} className="block">
			{cardContent}
		</Link>
	)
}
