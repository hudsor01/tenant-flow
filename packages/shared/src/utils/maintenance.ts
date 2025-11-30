import type { MaintenancePriority, RequestStatus } from '../constants/status-types.js'
/**
 * Maintenance utilities
 * Helper functions for maintenance priority and status display
 */

type Priority = MaintenancePriority

export const getPriorityLabel = (priority: Priority): string => {
	const labels: Record<Priority, string> = {
		LOW: 'Low Priority',
		MEDIUM: 'Medium Priority',
		HIGH: 'High Priority',
		URGENT: 'Urgent'
	}
	return labels[priority] || priority
}

export const getPriorityColor = (priority: Priority): string => {
	const colors: Record<Priority, string> = {
		LOW: 'bg-success/10 text-success-foreground border-success/20',
		MEDIUM: 'bg-warning/10 text-warning-foreground border-warning/20',
		HIGH: 'bg-warning/10 text-warning-foreground border-warning/20',
		URGENT: 'bg-destructive/10 text-destructive-foreground border-destructive/20'
	}
	return colors[priority] || 'bg-muted text-muted-foreground border-border'
}

export const getRequestStatusLabel = (status: RequestStatus): string => {
	const labels: Record<RequestStatus, string> = {
		OPEN: 'Open',
		IN_PROGRESS: 'In Progress',
		COMPLETED: 'Completed',
		CANCELED: 'Canceled',
		ON_HOLD: 'On Hold',
		CLOSED: 'Closed'
	}
	return labels[status] || status
}

export const getRequestStatusColor = (status: RequestStatus): string => {
	const colors: Record<RequestStatus, string> = {
		OPEN: 'bg-warning/10 text-warning-foreground border-warning/20',
		IN_PROGRESS: 'bg-info/10 text-info-foreground border-info/20',
		COMPLETED: 'bg-success/10 text-success-foreground border-success/20',
		CANCELED: 'bg-muted text-muted-foreground border-border',
		ON_HOLD: 'bg-warning/10 text-warning-foreground border-warning/20',
		CLOSED: 'bg-success/10 text-success-foreground border-success/20'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
