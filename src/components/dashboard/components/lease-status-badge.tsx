import { cn } from "#lib/utils";
import type { PortfolioRow } from "../dashboard-types";

type LeaseStatus = PortfolioRow["leaseStatus"];

const LABEL: Record<LeaseStatus, string> = {
	active: "Active",
	expiring: "Expiring",
	vacant: "Vacant",
};

const CHIP: Record<LeaseStatus, string> = {
	active: "status-active",
	expiring: "status-pending",
	vacant: "status-inactive",
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
