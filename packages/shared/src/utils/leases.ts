import type { LeaseStatus } from '../constants/status-types.js'
/**
 * Lease utilities
 * Helper functions for lease status display and management
 */

export const getLeaseStatusLabel = (status: LeaseStatus): string => {
	const labels: Record<LeaseStatus, string> = {
		DRAFT: 'Draft',
		ACTIVE: 'Active',
		EXPIRED: 'Expired',
		TERMINATED: 'Terminated'
	}
	return labels[status] || status
}

export const getLeaseStatusColor = (status: LeaseStatus): string => {
	const colors: Record<LeaseStatus, string> = {
		DRAFT: 'bg-muted text-muted-foreground border-border',
		ACTIVE: 'bg-success/10 text-success-foreground border-success/20',
		EXPIRED: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		TERMINATED: 'bg-warning/10 text-warning-foreground border-warning/20'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
