/**
 * Tenant utilities
 * Helper functions for tenant invitation status display
 */

type InvitationStatus =
	| 'PENDING'
	| 'ACCEPTED'
	| 'EXPIRED'
	| 'DECLINED'
	| 'CANCELLED'

export const getInvitationStatusLabel = (status: InvitationStatus): string => {
	const labels: Record<InvitationStatus, string> = {
		PENDING: 'Pending',
		ACCEPTED: 'Accepted',
		EXPIRED: 'Expired',
		DECLINED: 'Declined',
		CANCELLED: 'Cancelled'
	}
	return labels[status] || status
}

export const getInvitationStatusColor = (status: InvitationStatus): string => {
	const colors: Record<InvitationStatus, string> = {
		PENDING: 'bg-warning/10 text-warning-foreground border-warning/20',
		ACCEPTED: 'bg-success/10 text-success-foreground border-success/20',
		EXPIRED: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		DECLINED: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		CANCELLED: 'bg-muted text-muted-foreground border-border'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
