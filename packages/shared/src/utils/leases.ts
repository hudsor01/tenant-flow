import type { LeaseStatus } from '../constants/status-types.js'
/**
 * Lease utilities
 * Helper functions for lease status display and management
 */

export const getLeaseStatusLabel = (status: LeaseStatus): string => {
	const labels: Record<LeaseStatus, string> = {
		draft: 'Draft',
		pending_signature: 'Pending Signature',
		active: 'Active',
		ended: 'Ended',
		terminated: 'Terminated'
	}
	return labels[status] || status
}

export const getLeaseStatusColor = (status: LeaseStatus): string => {
	const colors: Record<LeaseStatus, string> = {
		draft: 'bg-muted text-muted-foreground border-border',
		pending_signature: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
		active: 'bg-success/10 text-success-foreground border-success/20',
		ended: 'bg-muted text-muted-foreground border-border',
		terminated:
			'bg-destructive/10 text-destructive-foreground border-destructive/20'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
