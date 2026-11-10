import {
	PORTFOLIO_OCCUPANCY_LABELS,
	type PortfolioOccupancy,
} from "#lib/constants/status-types";
import { cn } from "#lib/utils";

const CHIP: Record<PortfolioOccupancy, string> = {
	occupied: "status-active",
	"partly-vacant": "status-pending",
	vacant: "status-inactive",
	"no-units": "status-inactive",
};

/**
 * A property's occupancy pill, rendered identically in the portfolio table
 * cell and the portfolio grid card (DT-01 parity). One chip definition, so the
 * two views can never drift apart; its label is PORTFOLIO_OCCUPANCY_LABELS'.
 */
export function OccupancyBadge({
	occupancy,
}: {
	occupancy: PortfolioOccupancy;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded border px-2 py-0.5 font-medium text-xs",
				CHIP[occupancy],
			)}
		>
			{PORTFOLIO_OCCUPANCY_LABELS[occupancy]}
		</span>
	);
}
