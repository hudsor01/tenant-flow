/**
 * Tenant utilities
 * Helper functions for tenant invitation status display
 */

type InvitationStatus =
	| 'pending'
	| 'accepted'
	| 'expired'
	| 'declined'
	| 'cancelled'

export const getInvitationStatusLabel = (status: InvitationStatus): string => {
	const labels: Record<InvitationStatus, string> = {
		pending: 'Pending',
		accepted: 'Accepted',
		expired: 'Expired',
		declined: 'Declined',
		cancelled: 'Cancelled'
	}
	return labels[status] || status
}

export const getInvitationStatusColor = (status: InvitationStatus): string => {
	const colors: Record<InvitationStatus, string> = {
		pending: 'bg-warning/10 text-warning-foreground border-warning/20',
		accepted: 'bg-success/10 text-success-foreground border-success/20',
		expired: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		declined: 'bg-destructive/10 text-destructive-foreground border-destructive/20',
		cancelled: 'bg-muted text-muted-foreground border-border'
	}
	return colors[status] || 'bg-muted text-muted-foreground border-border'
}
