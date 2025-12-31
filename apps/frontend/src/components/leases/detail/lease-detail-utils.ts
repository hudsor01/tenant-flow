import {
	FileText,
	Send,
	PenLine,
	CheckCircle,
	RefreshCw,
	XCircle,
	Clock
} from 'lucide-react'
import type { Lease } from '@repo/shared/types/core'

/** Timeline event for lease history display */
export interface TimelineEvent {
	id: string
	type:
		| 'created'
		| 'sent_for_signature'
		| 'owner_signed'
		| 'tenant_signed'
		| 'activated'
		| 'renewed'
		| 'terminated'
		| 'ended'
	title: string
	description: string
	timestamp: string
	actor?: string
}

/** Generates timeline events from lease data */
export function generateTimelineEvents(lease: Lease): TimelineEvent[] {
	const events: TimelineEvent[] = []

	// Lease created
	if (lease.created_at) {
		events.push({
			id: 'created',
			type: 'created',
			title: 'Lease Created',
			description: 'Lease draft was created',
			timestamp: lease.created_at,
			actor: 'Owner'
		})
	}

	// Sent for signature
	if (lease.sent_for_signature_at) {
		events.push({
			id: 'sent',
			type: 'sent_for_signature',
			title: 'Sent for Signature',
			description: 'Lease sent to tenant for signing',
			timestamp: lease.sent_for_signature_at,
			actor: 'Owner'
		})
	}

	// Owner signed
	if (lease.owner_signed_at) {
		events.push({
			id: 'owner_signed',
			type: 'owner_signed',
			title: 'Owner Signed',
			description: 'Lease signed by property owner',
			timestamp: lease.owner_signed_at,
			actor: 'Owner'
		})
	}

	// Tenant signed
	if (lease.tenant_signed_at) {
		events.push({
			id: 'tenant_signed',
			type: 'tenant_signed',
			title: 'Tenant Signed',
			description: 'Lease signed by tenant',
			timestamp: lease.tenant_signed_at,
			actor: 'Tenant'
		})
	}

	// Activated (when both signed and status is active)
	if (
		lease.lease_status === 'active' &&
		lease.owner_signed_at &&
		lease.tenant_signed_at
	) {
		const activatedAt = new Date(
			Math.max(
				new Date(lease.owner_signed_at).getTime(),
				new Date(lease.tenant_signed_at).getTime()
			)
		).toISOString()
		events.push({
			id: 'activated',
			type: 'activated',
			title: 'Lease Activated',
			description: 'Lease became active after both parties signed',
			timestamp: activatedAt
		})
	}

	// Terminated
	if (lease.lease_status === 'terminated' && lease.updated_at) {
		events.push({
			id: 'terminated',
			type: 'terminated',
			title: 'Lease Terminated',
			description: 'Lease was terminated early',
			timestamp: lease.updated_at
		})
	}

	// Ended
	if (lease.lease_status === 'ended' && lease.end_date) {
		events.push({
			id: 'ended',
			type: 'ended',
			title: 'Lease Ended',
			description: 'Lease reached its end date',
			timestamp: lease.end_date
		})
	}

	// Sort by timestamp (newest first)
	return events.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
	)
}

/** Get icon for timeline event type */
export function getTimelineIcon(type: TimelineEvent['type']) {
	const iconMap = {
		created: FileText,
		sent_for_signature: Send,
		owner_signed: PenLine,
		tenant_signed: PenLine,
		activated: CheckCircle,
		renewed: RefreshCw,
		terminated: XCircle,
		ended: Clock
	}
	return iconMap[type] || Clock
}

/** Get color classes for timeline event type */
export function getTimelineColor(type: TimelineEvent['type']) {
	const colorMap = {
		created: 'text-stone-500 bg-stone-100 dark:bg-stone-800',
		sent_for_signature: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
		owner_signed: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		tenant_signed: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		activated: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
		renewed: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
		terminated: 'text-red-600 bg-red-100 dark:bg-red-900/30',
		ended: 'text-stone-500 bg-stone-100 dark:bg-stone-800'
	}
	return colorMap[type] || 'text-stone-500 bg-stone-100 dark:bg-stone-800'
}

/** Status badge configuration */
export interface StatusConfig {
	className: string
	label: string
}

/** Get status badge configuration */
export function getStatusConfig(status: string): StatusConfig {
	const config: Record<string, StatusConfig> = {
		draft: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Draft'
		},
		pending_signature: {
			className:
				'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
			label: 'Pending Signature'
		},
		active: {
			className:
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
			label: 'Active'
		},
		ended: {
			className:
				'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
			label: 'Ended'
		},
		terminated: {
			className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
			label: 'Terminated'
		}
	}

	return (
		config[status] ?? {
			className: 'bg-stone-100 text-stone-600',
			label: status
		}
	)
}

/** Format currency */
export function formatCurrency(amount: number | null): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount ?? 0)
}

/** Format date */
export function formatDate(dateString: string | null): string {
	if (!dateString) return 'N/A'
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	})
}

/** Format relative time */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return 'Today'
	if (diffDays === 1) return 'Yesterday'
	if (diffDays < 7) return `${diffDays} days ago`
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
	return `${Math.floor(diffDays / 365)} years ago`
}

/** Calculate days until expiry */
export function getDaysUntilExpiry(endDate: string | null): number | null {
	if (!endDate) return null
	const end = new Date(endDate)
	const now = new Date()
	const diffMs = end.getTime() - now.getTime()
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/** Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.) */
export function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return s[(v - 20) % 10] || s[v] || s[0] || 'th'
}
