import { Building2, DollarSign, Receipt, Wrench } from "lucide-react";
import type { ElementType } from "react";

const categoryIcons: Record<string, ElementType> = {
	maintenance: Wrench,
	utilities: Building2,
	insurance: Receipt,
	taxes: DollarSign,
	management: Building2,
	other: Receipt,
};

const categoryStyles: Record<string, string> = {
	maintenance: "bg-warning/10 text-warning-text",
	utilities: "bg-info/10 text-info-text",
	insurance: "bg-primary/10 text-primary-text",
	taxes: "bg-destructive/10 text-destructive-text",
	management: "bg-success/10 text-success-text",
	other: "bg-muted text-muted-foreground",
};

const defaultStyle = "bg-muted text-muted-foreground";

export function getCategoryBadge(category: string) {
	const Icon = categoryIcons[category] ?? Receipt;

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${categoryStyles[category] ?? defaultStyle}`}
		>
			<Icon className="w-3 h-3" />
			{category.charAt(0).toUpperCase() + category.slice(1)}
		</span>
	);
}
