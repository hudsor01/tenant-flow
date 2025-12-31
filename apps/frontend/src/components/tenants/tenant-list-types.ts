import type { LeaseStatus } from '@repo/shared/types/core'

export type SortField = 'name' | 'email' | 'property' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface StatusBadgeConfig {
	className: string
	label: string
}

export const statusBadgeConfig: Record<LeaseStatus, StatusBadgeConfig> = {
	draft: {
		className: 'bg-muted text-muted-foreground',
		label: 'Draft'
	},
	pending_signature: {
		className: 'bg-warning/10 text-warning',
		label: 'Pending'
	},
	active: {
		className: 'bg-success/10 text-success',
		label: 'Active'
	},
	ended: {
		className: 'bg-muted text-muted-foreground',
		label: 'Ended'
	},
	terminated: {
		className: 'bg-destructive/10 text-destructive',
		label: 'Terminated'
	}
}

export function getStatusBadge(
	status: LeaseStatus | undefined
): StatusBadgeConfig {
	if (!status) {
		return {
			className: 'bg-muted text-muted-foreground',
			label: 'No Lease'
		}
	}

	return (
		statusBadgeConfig[status] ?? {
			className: 'bg-muted text-muted-foreground',
			label: status
		}
	)
}
