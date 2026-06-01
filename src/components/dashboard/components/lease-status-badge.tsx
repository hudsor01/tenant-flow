import { cn } from "#lib/utils";
import type { PortfolioRow } from "../dashboard-types";

type LeaseStatus = PortfolioRow["leaseStatus"];

const LABEL: Record<LeaseStatus, string> = {
	active: "Active",
	expiring: "Expiring",
	vacant: "Vacant",
};

const CHIP: Record<LeaseStatus, string> = {
	active:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
	expiring:
		"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
	vacant: "bg-muted text-muted-foreground",
};

/**
 * Shared lease-status pill rendered identically in the portfolio table cell and
 * the portfolio grid card (DT-01 parity). One chip definition, so the two views
 * can never drift apart.
 */
export function LeaseStatusBadge({ status }: { status: LeaseStatus }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded px-2 py-0.5 font-medium text-xs",
				CHIP[status],
			)}
		>
			{LABEL[status]}
		</span>
	);
}
