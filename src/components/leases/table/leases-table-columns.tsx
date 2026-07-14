import type { VirtualItem } from "@tanstack/react-virtual";
import { ArrowUpDown, Eye, Pencil, RefreshCw, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { getStatusConfig } from "#components/leases/detail/lease-detail-utils";
import {
	getVirtualRowStyle,
	VIRTUAL_ROW_CLASS,
} from "#components/shared/virtualized-table-row";
import { formatDate } from "#lib/formatters/date";
import { cn } from "#lib/utils";
import type { LeaseDisplay, SortField } from "./lease-utils";

/**
 * Per-column layout classes shared by the leases `<thead>` cells and the
 * flex-row `<td>`s so columns stay aligned with the header. Header + rows apply
 * the SAME class per column; responsive columns (property: `hidden lg:flex`)
 * toggle on both together.
 */
export const LEASE_COLUMN_CLASS = {
	checkbox: "flex w-12 shrink-0 items-center",
	tenant: "flex flex-1 min-w-0 items-center",
	property: "hidden lg:flex w-48 shrink-0 items-center",
	status: "flex w-32 shrink-0 items-center",
	actions: "flex w-40 shrink-0 items-center justify-end",
} as const;

export function SortHeader({
	field,
	sortField,
	children,
	className = "",
	onSort,
}: {
	field: SortField;
	sortField: SortField;
	children: ReactNode;
	className?: string;
	onSort: (field: SortField) => void;
}) {
	return (
		<button
			onClick={() => onSort(field)}
			className={`flex items-center gap-1 hover:text-foreground transition-colors group ${className}`}
		>
			{children}
			<ArrowUpDown
				className={`w-3.5 h-3.5 transition-colors ${sortField === field ? "text-primary" : "text-muted-foreground/50 group-hover:text-muted-foreground"}`}
			/>
		</button>
	);
}

export function StatusBadge({ status }: { status: string }) {
	const config = getStatusConfig(status);
	return (
		<span
			className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${config.className}`}
		>
			{config.label}
		</span>
	);
}

interface LeaseRowProps {
	lease: LeaseDisplay;
	virtualRow: VirtualItem;
	measureElement: (node: Element | null) => void;
	isSelected: boolean;
	onToggleSelect: (id: string) => void;
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onRenew: (lease: LeaseDisplay) => void;
	onTerminate: (lease: LeaseDisplay) => void;
}

export function LeaseRow({
	lease,
	virtualRow,
	measureElement,
	isSelected,
	onToggleSelect,
	onView,
	onEdit,
	onRenew,
	onTerminate,
}: LeaseRowProps) {
	return (
		<tr
			ref={measureElement}
			data-index={virtualRow.index}
			aria-rowindex={virtualRow.index + 2}
			role="row"
			style={getVirtualRowStyle(virtualRow, { measured: true })}
			className={cn(
				VIRTUAL_ROW_CLASS,
				"hover:bg-muted/50 transition-colors",
				isSelected && "bg-primary/5",
			)}
		>
			<td className={cn(LEASE_COLUMN_CLASS.checkbox, "px-4 py-3")} role="cell">
				<input
					type="checkbox"
					checked={isSelected}
					onChange={() => onToggleSelect(lease.id)}
					aria-label={`Select lease ${lease.tenantName}`}
					className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
				/>
			</td>
			<td className={cn(LEASE_COLUMN_CLASS.tenant, "px-4 py-3")} role="cell">
				<div className="min-w-0">
					<button
						onClick={() => onView(lease.id)}
						className="font-medium text-foreground hover:text-primary-text hover:underline transition-colors text-left truncate max-w-full"
					>
						{lease.tenantName}
					</button>
					<p className="text-xs text-muted-foreground truncate">
						{formatDate(lease.startDate, { fallback: "N/A" })} -{" "}
						{formatDate(lease.endDate, { fallback: "N/A" })}
					</p>
					<p className="text-sm text-muted-foreground lg:hidden truncate">
						{lease.propertyName}
					</p>
				</div>
			</td>
			<td className={cn(LEASE_COLUMN_CLASS.property, "px-4 py-3")} role="cell">
				<div className="min-w-0">
					<p className="text-sm text-foreground truncate">
						{lease.propertyName}
					</p>
					<p className="text-xs text-muted-foreground">
						Unit {lease.unitNumber}
					</p>
				</div>
			</td>
			<td className={cn(LEASE_COLUMN_CLASS.status, "px-4 py-3")} role="cell">
				<StatusBadge status={lease.status} />
			</td>
			<td className={cn(LEASE_COLUMN_CLASS.actions, "px-4 py-3")} role="cell">
				<div className="flex items-center justify-end gap-1">
					<button
						onClick={() => onView(lease.id)}
						className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						title="View"
						aria-label={`View lease for ${lease.tenantName}`}
					>
						<Eye className="w-4 h-4" />
					</button>
					<button
						onClick={() => onEdit(lease.id)}
						className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
						title="Edit"
						aria-label={`Edit lease for ${lease.tenantName}`}
					>
						<Pencil className="w-4 h-4" />
					</button>
					{lease.status === "active" && (
						<>
							<button
								onClick={() => onRenew(lease)}
								className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
								title="Renew Lease"
								aria-label={`Renew lease for ${lease.tenantName}`}
							>
								<RefreshCw className="w-4 h-4" />
							</button>
							<button
								onClick={() => onTerminate(lease)}
								className="p-2 rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
								title="Terminate Lease"
								aria-label={`Terminate lease for ${lease.tenantName}`}
							>
								<XCircle className="w-4 h-4" />
							</button>
						</>
					)}
				</div>
			</td>
		</tr>
	);
}
