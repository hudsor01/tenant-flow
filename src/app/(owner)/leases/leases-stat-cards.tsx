import { AlertTriangle, Check, Clock, FileText } from "lucide-react";
import {
	EXPIRING_LEASE_LABEL,
	LEASE_STATUS_LABELS,
} from "#lib/constants/status-types";

interface LeasesStatCardsProps {
	totalLeases: number;
	activeLeases: number;
	expiringLeases: number;
	pendingLeases: number;
}

export function LeasesStatCards({
	totalLeases,
	activeLeases,
	expiringLeases,
	pendingLeases,
}: LeasesStatCardsProps) {
	const cards = [
		{ label: "Total Leases", value: totalLeases, icon: FileText },
		{ label: LEASE_STATUS_LABELS.active, value: activeLeases, icon: Check },
		{
			label: EXPIRING_LEASE_LABEL,
			value: expiringLeases,
			icon: AlertTriangle,
		},
		{
			label: LEASE_STATUS_LABELS.pending_signature,
			value: pendingLeases,
			icon: Clock,
		},
	];

	// The columns step on the row's own width, never the viewport's (the rail
	// changes it): one column until two tiles are 10rem wide, four from where
	// four are (66.2-39 fix round 4, Part 8c). A tile's icon sits beside its
	// label, so the figure has the tile's whole width.
	return (
		<div className="@container/lease-stats mb-6">
			<div className="grid grid-cols-1 @min-[21rem]/lease-stats:grid-cols-2 @min-[43rem]/lease-stats:grid-cols-4 gap-4">
				{cards.map((card) => (
					// A column, its figure at the foot: the grid stretches a row's tiles
					// to one height, so a label that wraps (Pending Signature) leaves
					// every figure in the row on one line (66.2-39 VD-111), and every
					// icon at its tile's top.
					<div
						key={card.label}
						className="flex flex-col bg-card border border-border rounded-sm p-4"
					>
						<div className="flex items-start justify-between gap-2 mb-2">
							<p className="mb-0 text-sm text-muted-foreground">{card.label}</p>
							<div className="w-9 h-9 shrink-0 rounded-sm bg-primary/10 flex items-center justify-center">
								<card.icon className="w-4 h-4 text-primary" />
							</div>
						</div>
						<p className="mt-auto mb-0 whitespace-nowrap text-2xl font-bold text-foreground">
							{card.value}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
