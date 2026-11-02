import {
	AlertTriangle,
	CheckCircle,
	Clock,
	RotateCcw,
	UserCheck,
	XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { createElement } from "react";
import { formatDate } from "#lib/formatters/date";
import {
	maintenancePrioritySchema,
	maintenanceStatusSchema,
} from "#lib/validation/maintenance";
import type { MaintenancePriority, MaintenanceStatus } from "#types/core";
import type { TimelineEvent } from "#types/sections/maintenance";

// Status configuration
export const STATUS_CONFIG: Record<
	MaintenanceStatus,
	{ label: string; className: string; icon: ReactNode }
> = {
	open: {
		label: "Open",
		className: "bg-warning/10 text-warning-text",
		icon: createElement(Clock, { className: "size-3.5" }),
	},
	assigned: {
		label: "Assigned",
		className: "bg-primary/10 text-primary-text",
		icon: createElement(UserCheck, { className: "size-3.5" }),
	},
	in_progress: {
		label: "In Progress",
		className: "bg-primary/10 text-primary-text",
		icon: createElement(AlertTriangle, { className: "size-3.5" }),
	},
	needs_reassignment: {
		label: "Needs Reassignment",
		className: "bg-warning/10 text-warning-text",
		icon: createElement(RotateCcw, { className: "size-3.5" }),
	},
	completed: {
		label: "Completed",
		className: "bg-success/10 text-success-text",
		icon: createElement(CheckCircle, { className: "size-3.5" }),
	},
	on_hold: {
		label: "On Hold",
		className: "bg-muted text-muted-foreground",
		icon: createElement(Clock, { className: "size-3.5" }),
	},
	cancelled: {
		label: "Cancelled",
		className: "bg-muted text-muted-foreground",
		icon: createElement(XCircle, { className: "size-3.5" }),
	},
};

/** A maintenance status as its label; a value outside the set as written. */
export function maintenanceStatusLabel(status: string): string {
	const parsed = maintenanceStatusSchema.safeParse(status);
	return parsed.success ? STATUS_CONFIG[parsed.data].label : status;
}

// Priority configuration
export const PRIORITY_CONFIG: Record<
	MaintenancePriority,
	{ label: string; className: string }
> = {
	low: { label: "Low", className: "bg-muted text-muted-foreground" },
	normal: { label: "Normal", className: "bg-primary/10 text-primary-text" },
	medium: { label: "Medium", className: "bg-primary/10 text-primary-text" },
	high: {
		label: "High",
		className: "bg-warning/10 text-warning-text",
	},
	urgent: {
		label: "Urgent",
		className: "bg-destructive/10 text-destructive-text",
	},
};

export function generateTimeline(request: {
	created_at: string | null;
	scheduled_date: string | null;
	completed_at: string | null;
	status: string;
}): TimelineEvent[] {
	const events: TimelineEvent[] = [];

	if (request.created_at) {
		events.push({
			id: "created",
			type: "created",
			title: "Request Created",
			description: "Maintenance request was submitted",
			timestamp: request.created_at,
		});
	}

	if (request.scheduled_date) {
		events.push({
			id: "scheduled",
			type: "scheduled",
			title: "Work Scheduled",
			description: `Scheduled for ${formatDate(request.scheduled_date)}`,
			timestamp: request.scheduled_date,
		});
	}

	if (request.status === "in_progress") {
		events.push({
			id: "in_progress",
			type: "status_change",
			title: "Work Started",
			description: "Maintenance work has begun",
			timestamp:
				request.scheduled_date ??
				request.created_at ??
				new Date().toISOString(),
		});
	}

	if (request.completed_at) {
		events.push({
			id: "completed",
			type: "completed",
			title: "Request Completed",
			description: "Maintenance work has been completed",
			timestamp: request.completed_at,
		});
	}

	return events.sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
	);
}

/** A maintenance priority as its label; a value outside the set as written. */
export function maintenancePriorityLabel(priority: string): string {
	const parsed = maintenancePrioritySchema.safeParse(priority);
	return parsed.success ? PRIORITY_CONFIG[parsed.data].label : priority;
}
