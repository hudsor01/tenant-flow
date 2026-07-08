"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "#lib/utils";
import type { LeaseStatus } from "#types/core";

export type SortDirection = "asc" | "desc" | null;
export type SortField =
	| "fullName"
	| "email"
	| "property"
	| "leaseStatus"
	| null;

const STATUS_LABELS: Record<LeaseStatus, string> = {
	draft: "Draft",
	pending_signature: "Pending",
	active: "Active",
	ended: "Ended",
	terminated: "Terminated",
};

const STATUS_CHIP: Record<LeaseStatus, string> = {
	draft: "status-pending",
	pending_signature: "status-pending",
	active: "status-active",
	ended: "status-inactive",
	terminated: "status-inactive",
};

/**
 * Read-only lease-status badge shared by the tenant table row and grid card.
 * One chip definition so the two views can never drift apart. Lease status is a
 * lease-derived value with no tenant-list mutation, so it is displayed, never
 * edited, here (TEN-03).
 */
export function TenantLeaseStatusBadge({
	status,
	ariaLabel,
}: {
	status: LeaseStatus | undefined;
	ariaLabel?: string;
}) {
	if (!status) {
		return (
			<span className="text-sm text-muted-foreground" aria-label={ariaLabel}>
				—
			</span>
		);
	}

	return (
		<span
			aria-label={ariaLabel}
			className={cn(
				"inline-flex items-center rounded border px-2 py-0.5 font-medium text-xs",
				STATUS_CHIP[status],
			)}
		>
			{STATUS_LABELS[status]}
		</span>
	);
}

export function SortableHeader({
	title,
	field,
	currentSort,
	currentDirection,
	onSort,
}: {
	title: string;
	field: SortField;
	currentSort: SortField;
	currentDirection: SortDirection;
	onSort: (field: SortField) => void;
}) {
	const isActive = currentSort === field;

	return (
		<button
			onClick={() => onSort(field)}
			className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
		>
			{title}
			{isActive ? (
				currentDirection === "asc" ? (
					<ChevronUp className="h-4 w-4" />
				) : (
					<ChevronDown className="h-4 w-4" />
				)
			) : (
				<ChevronsUpDown className="h-4 w-4 opacity-50" />
			)}
		</button>
	);
}
