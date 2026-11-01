import { Home, User, Wrench } from "lucide-react";
import type { UnitStatus } from "#types/core";

// Status badge configuration matching spec
export const statusConfig: Record<
	UnitStatus,
	{ label: string; className: string; icon: typeof Home }
> = {
	occupied: {
		label: "Occupied",
		className: "bg-info/10 text-info-text",
		icon: User,
	},
	available: {
		label: "Available",
		className: "bg-success/10 text-success-text",
		icon: Home,
	},
	maintenance: {
		label: "Maintenance",
		className: "bg-warning/10 text-warning-text",
		icon: Wrench,
	},
	reserved: {
		label: "Reserved",
		className: "bg-primary/10 text-primary-text",
		icon: Home,
	},
};

export function formatUnitCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}
