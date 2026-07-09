"use client";

import type { VirtualItem } from "@tanstack/react-virtual";
import { FileText, Pencil, Trash2 } from "lucide-react";
import {
	getVirtualRowStyle,
	VIRTUAL_ROW_CLASS,
} from "#components/shared/virtualized-table-row";
import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import { cn } from "#lib/utils";
import type { TenantItem } from "#types/sections/tenants";
import {
	TENANT_COLUMN_CLASS,
	TenantLeaseStatusBadge,
} from "./tenant-table-helpers";

interface TenantTableRowProps {
	tenant: TenantItem;
	virtualRow: VirtualItem;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
	onViewLease: (leaseId: string) => void;
}

export function TenantTableRow({
	tenant,
	virtualRow,
	isSelected,
	onSelect,
	onView,
	onEdit,
	onDelete,
	onViewLease,
}: TenantTableRowProps) {
	// Extract to a local const so TypeScript narrows it into the onClick closure
	// (a `tenant.leaseId` property access is NOT narrowed there → TS2345).
	const leaseId = tenant.leaseId;

	return (
		<tr
			data-index={virtualRow.index}
			style={getVirtualRowStyle(virtualRow)}
			className={cn(
				VIRTUAL_ROW_CLASS,
				"hover:bg-muted/50 transition-colors",
				isSelected && "bg-primary/5",
			)}
		>
			<td className={cn(TENANT_COLUMN_CLASS.checkbox, "px-4 py-2")}>
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onSelect(tenant.id)}
					aria-label={`Select ${tenant.fullName}`}
				/>
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.name, "px-4 py-2")}>
				<button
					onClick={() => onView(tenant.id)}
					className="font-medium text-foreground hover:text-primary-text hover:underline transition-colors text-left truncate"
				>
					{tenant.fullName}
				</button>
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.email, "px-4 py-2")}>
				<span className="text-sm text-muted-foreground truncate">
					{tenant.email}
				</span>
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.phone, "px-4 py-2")}>
				<span className="text-sm text-muted-foreground truncate">
					{tenant.phone || "—"}
				</span>
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.property, "px-4 py-2")}>
				{tenant.currentProperty ? (
					<div className="text-left min-w-0">
						<p className="text-sm text-foreground truncate">
							{tenant.currentProperty}
						</p>
						{tenant.currentUnit && (
							<p className="text-xs text-muted-foreground truncate">
								Unit {tenant.currentUnit}
							</p>
						)}
					</div>
				) : (
					<span className="text-sm text-muted-foreground">—</span>
				)}
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.status, "px-4 py-2")}>
				<TenantLeaseStatusBadge status={tenant.leaseStatus} />
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.lease, "px-4 py-2")}>
				{tenant.leaseStatus === "active" && leaseId ? (
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 text-primary-text"
						onClick={() => onViewLease(leaseId)}
					>
						<FileText className="mr-1 h-3.5 w-3.5" />
						View
					</Button>
				) : (
					<span className="text-sm text-muted-foreground">—</span>
				)}
			</td>
			<td className={cn(TENANT_COLUMN_CLASS.actions, "px-4 py-2")}>
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 min-h-8 min-w-8"
						onClick={() => onEdit(tenant.id)}
					>
						<Pencil className="h-4 w-4" />
						<span className="sr-only">Edit</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 min-h-8 min-w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={() => onDelete(tenant.id)}
					>
						<Trash2 className="h-4 w-4" />
						<span className="sr-only">Delete</span>
					</Button>
				</div>
			</td>
		</tr>
	);
}
