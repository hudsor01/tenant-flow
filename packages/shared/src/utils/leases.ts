import type { LeaseStatus } from '../constants/status-types.js'
/**
 * Lease utilities
 * Helper functions for lease status display and management
 */

export const getLeaseStatusLabel = (status: LeaseStatus): string => {
	const labels: Record<LeaseStatus, string> = {
		draft: 'Draft',
		active: 'Active',
		expired: 'Expired',
		terminated: 'Terminated'
	}
	return labels[status] || status
}

export const getLeaseStatusColor = (status: LeaseStatus): string => {
	const colors: Record<LeaseStatus, string> = {
		draft: 'bg-muted text-muted-foreground border-border',
		active: 'bg-success/10 text-success-foreground border-success/20',
		expired: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		terminated: 'bg-warning/10 text-warning-foreground border-warning/20'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
