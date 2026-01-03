import type {
	MaintenanceStatus,
	MaintenancePriority
} from '@repo/shared/types/core'
import {
	Clock,
	AlertTriangle,
	CheckCircle,
	XCircle
} from 'lucide-react'
import { createElement } from 'react'
import type { ReactNode } from 'react'

// Status configuration
export const STATUS_CONFIG: Record<
	MaintenanceStatus,
	{ label: string; className: string; icon: ReactNode }
> = {
	open: {
		label: 'Open',
		className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
		icon: createElement(Clock, { className: 'size-3.5' })
	},
	in_progress: {
		label: 'In Progress',
		className: 'bg-primary/10 text-primary',
		icon: createElement(AlertTriangle, { className: 'size-3.5' })
	},
	completed: {
		label: 'Completed',
		className: 'bg-green-500/10 text-green-600 dark:text-green-400',
		icon: createElement(CheckCircle, { className: 'size-3.5' })
	},
	on_hold: {
		label: 'On Hold',
		className: 'bg-muted text-muted-foreground',
		icon: createElement(Clock, { className: 'size-3.5' })
	},
	cancelled: {
		label: 'Cancelled',
		className: 'bg-muted text-muted-foreground',
		icon: createElement(XCircle, { className: 'size-3.5' })
	}
}

// Priority configuration
export const PRIORITY_CONFIG: Record<
	MaintenancePriority,
	{ label: string; className: string }
> = {
	low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
	normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
	medium: { label: 'Medium', className: 'bg-primary/10 text-primary' },
	high: {
		label: 'High',
		className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
	},
	urgent: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' }
}

// Timeline event type
export interface TimelineEvent {
	id: string
	type:
		| 'created'
		| 'status_change'
		| 'scheduled'
		| 'expense_added'
		| 'photo_added'
		| 'completed'
	title: string
	description?: string
	timestamp: string
	user?: string
}

export function generateTimeline(request: {
	created_at: string | null
	scheduled_date: string | null
	completed_at: string | null
	status: string
}): TimelineEvent[] {
	const events: TimelineEvent[] = []

	if (request.created_at) {
		events.push({
			id: 'created',
			type: 'created',
			title: 'Request Created',
			description: 'Maintenance request was submitted',
			timestamp: request.created_at
		})
	}

	if (request.scheduled_date) {
		events.push({
			id: 'scheduled',
			type: 'scheduled',
			title: 'Work Scheduled',
			description: `Scheduled for ${new Date(request.scheduled_date).toLocaleDateString()}`,
			timestamp: request.scheduled_date
		})
	}

	if (request.status === 'in_progress') {
		events.push({
			id: 'in_progress',
			type: 'status_change',
			title: 'Work Started',
			description: 'Maintenance work has begun',
			timestamp:
				request.scheduled_date ?? request.created_at ?? new Date().toISOString()
		})
	}

	if (request.completed_at) {
		events.push({
			id: 'completed',
			type: 'completed',
			title: 'Request Completed',
			description: 'Maintenance work has been completed',
			timestamp: request.completed_at
		})
	}

	return events.sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	)
}
