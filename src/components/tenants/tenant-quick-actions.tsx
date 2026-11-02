"use client";

import { BarChart3, Download, UserPlus } from "lucide-react";
import Link from "next/link";

interface TenantQuickActionsProps {
	onAdd: () => void;
	/** Downloads the tenants the list shows as CSV. */
	onExport: () => void;
	/** True when the list shows no tenant, so there is nothing to export. */
	exportDisabled: boolean;
}

const ACTION_CLASS =
	"flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors";

export function TenantQuickActions({
	onAdd,
	onExport,
	exportDisabled,
}: TenantQuickActionsProps) {
	return (
		<div className="flex flex-wrap items-center gap-3 mb-6">
			<button type="button" onClick={onAdd} className={ACTION_CLASS}>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<UserPlus className="w-4 h-4" aria-hidden="true" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Add Tenant</div>
					<div className="text-xs text-muted-foreground">
						Create a tenant record
					</div>
				</div>
			</button>
			<button
				type="button"
				onClick={onExport}
				disabled={exportDisabled}
				className={`${ACTION_CLASS} disabled:pointer-events-none disabled:opacity-50`}
			>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<Download className="w-4 h-4" aria-hidden="true" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Export</div>
					<div className="text-xs text-muted-foreground">Download data</div>
				</div>
			</button>
			<Link href="/analytics/overview" className={ACTION_CLASS}>
				<div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
					<BarChart3 className="w-4 h-4" aria-hidden="true" />
				</div>
				<div className="text-left">
					<div className="text-sm font-medium">Analytics</div>
					<div className="text-xs text-muted-foreground">View insights</div>
				</div>
			</Link>
		</div>
	);
}
