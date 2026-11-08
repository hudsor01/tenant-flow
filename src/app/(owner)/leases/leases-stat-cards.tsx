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

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			{cards.map((card) => (
				// A column, its figure row at the foot: the grid stretches a row's
				// tiles to one height, so a label that wraps (Pending Signature at
				// 390px) leaves every figure in the row on one line (66.2-39 VD-111).
				<div
					key={card.label}
					className="flex flex-col bg-card border border-border rounded-sm p-4"
				>
					<div className="flex items-center justify-between mb-2">
						<p className="mb-0 text-sm text-muted-foreground">{card.label}</p>
					</div>
					<div className="mt-auto flex items-end justify-between">
						<p className="mb-0 text-2xl font-bold text-foreground">
							{card.value}
						</p>
						<div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
							<card.icon className="w-4 h-4 text-primary" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
