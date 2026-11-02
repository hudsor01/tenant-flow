import { differenceInCalendarDays } from "date-fns";
import {
	CheckCircle,
	Clock,
	FileText,
	PenLine,
	RefreshCw,
	Send,
	XCircle,
} from "lucide-react";
import {
	EXPIRING_LEASE_LABEL,
	LEASE_STATUS_LABELS,
} from "#lib/constants/status-types";
import { parseLocalYmd } from "#lib/formatters/date";
import type { Lease } from "#types/core";

/** Timeline event for lease history display */
export interface LeaseTimelineEvent {
	id: string;
	type:
		| "created"
		| "sent_for_signature"
		| "owner_signed"
		| "tenant_signed"
		| "activated"
		| "renewed"
		| "terminated"
		| "ended"
		| "expired";
	title: string;
	description: string;
	timestamp: string;
	actor?: string;
}

/** Generates timeline events from lease data */
export function generateTimelineEvents(lease: Lease): LeaseTimelineEvent[] {
	const events: LeaseTimelineEvent[] = [];

	// Lease created
	if (lease.created_at) {
		events.push({
			id: "created",
			type: "created",
			title: "Lease Created",
			description: "Lease draft was created",
			timestamp: lease.created_at,
			actor: "Owner",
		});
	}

	// Sent for signature
	if (lease.sent_for_signature_at) {
		events.push({
			id: "sent",
			type: "sent_for_signature",
			title: "Sent for Signature",
			description: "Lease sent to tenant for signing",
			timestamp: lease.sent_for_signature_at,
			actor: "Owner",
		});
	}

	// Owner signed
	if (lease.owner_signed_at) {
		events.push({
			id: "owner_signed",
			type: "owner_signed",
			title: "Owner Signed",
			description: "Lease signed by property owner",
			timestamp: lease.owner_signed_at,
			actor: "Owner",
		});
	}

	// Tenant signed
	if (lease.tenant_signed_at) {
		events.push({
			id: "tenant_signed",
			type: "tenant_signed",
			title: "Tenant Signed",
			description: "Lease signed by tenant",
			timestamp: lease.tenant_signed_at,
			actor: "Tenant",
		});
	}

	// Activated (when both signed and status is active)
	if (
		lease.lease_status === "active" &&
		lease.owner_signed_at &&
		lease.tenant_signed_at
	) {
		const activatedAt = new Date(
			Math.max(
				new Date(lease.owner_signed_at).getTime(),
				new Date(lease.tenant_signed_at).getTime(),
			),
		).toISOString();
		events.push({
			id: "activated",
			type: "activated",
			title: "Lease Activated",
			description: "Lease became active after both parties signed",
			timestamp: activatedAt,
		});
	}

	// Terminated
	if (lease.lease_status === "terminated" && lease.updated_at) {
		events.push({
			id: "terminated",
			type: "terminated",
			title: "Lease Terminated",
			description: "Lease was terminated early",
			timestamp: lease.updated_at,
		});
	}

	// Ended
	if (lease.lease_status === "ended" && lease.end_date) {
		events.push({
			id: "ended",
			type: "ended",
			title: "Lease Ended",
			description: "Lease reached its end date",
			timestamp: lease.end_date,
		});
	}

	// Expired (naturally lapsed via the expire-leases cron)
	if (lease.lease_status === "expired" && lease.end_date) {
		events.push({
			id: "expired",
			type: "expired",
			title: "Lease Expired",
			description: "Lease lapsed at the end of its term",
			timestamp: lease.end_date,
		});
	}

	// Sort by timestamp (newest first)
	return events.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);
}

/** Get icon for timeline event type */
export function getTimelineIcon(type: LeaseTimelineEvent["type"]) {
	const iconMap = {
		created: FileText,
		sent_for_signature: Send,
		owner_signed: PenLine,
		tenant_signed: PenLine,
		activated: CheckCircle,
		renewed: RefreshCw,
		terminated: XCircle,
		ended: Clock,
		expired: Clock,
	};
	return iconMap[type] || Clock;
}

/** Get color classes for timeline event type */
export function getTimelineColor(type: LeaseTimelineEvent["type"]) {
	const colorMap = {
		created: "text-muted-foreground bg-muted",
		sent_for_signature: "text-info-text bg-info/10",
		owner_signed: "text-success-text bg-success/10",
		tenant_signed: "text-success-text bg-success/10",
		activated: "text-success-text bg-success/10",
		renewed: "text-info-text bg-info/10",
		terminated: "text-destructive-text bg-destructive/10",
		ended: "text-muted-foreground bg-muted",
		expired: "text-warning-text bg-warning/10",
	};
	return colorMap[type] || "text-muted-foreground bg-muted";
}

/** Status badge configuration */
export interface StatusConfig {
	className: string;
	label: string;
}

/** Get status badge configuration */
export function getStatusConfig(status: string): StatusConfig {
	const config: Record<string, StatusConfig> = {
		draft: {
			className: "bg-muted text-muted-foreground",
			label: LEASE_STATUS_LABELS.draft,
		},
		pending_signature: {
			className: "bg-warning/10 text-warning-text",
			label: LEASE_STATUS_LABELS.pending_signature,
		},
		active: {
			className: "bg-success/10 text-success-text",
			label: LEASE_STATUS_LABELS.active,
		},
		ended: {
			className: "bg-muted text-muted-foreground",
			label: LEASE_STATUS_LABELS.ended,
		},
		expired: {
			className: "bg-muted text-muted-foreground",
			label: LEASE_STATUS_LABELS.expired,
		},
		terminated: {
			className: "bg-destructive/10 text-destructive-text",
			label: LEASE_STATUS_LABELS.terminated,
		},
		// Pseudo-status produced by transformLease (table/lease-utils.ts) for an
		// active lease within 30 days of its end date. Not a stored lease_status.
		expiring: {
			className: "bg-warning/10 text-warning-text",
			label: EXPIRING_LEASE_LABEL,
		},
	};

	return (
		config[status] ?? {
			className: "bg-muted text-muted-foreground",
			label: status,
		}
	);
}

/** Format relative time */
export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
	return `${Math.floor(diffDays / 365)} years ago`;
}

/** Calculate days until expiry */
export function getDaysUntilExpiry(endDate: string | null): number | null {
	if (!endDate) return null;
	const end = parseLocalYmd(endDate);
	if (!end) return null;
	return differenceInCalendarDays(end, new Date());
}
