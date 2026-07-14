import Link from "next/link";
import { formatCurrency } from "#lib/utils/currency";
import type { FinancialBreakdownRow } from "#types/analytics";
import { TrendPill } from "./trend-pill";

interface BreakdownListProps {
	title: string;
	rows: FinancialBreakdownRow[];
	/**
	 * Optional drill-down destination. The "View details" link renders only when
	 * a real route is supplied — no dead `href="#"` affordance.
	 */
	detailsHref?: string;
}

export function BreakdownList({
	title,
	rows,
	detailsHref,
}: BreakdownListProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground font-medium">{title}</p>
				{detailsHref ? (
					<Link
						className="text-sm text-muted-foreground underline-offset-2 hover:underline"
						href={detailsHref}
					>
						View details
					</Link>
				) : null}
			</div>
			<div className="space-y-3">
				{rows.slice(0, 5).map((item) => (
					<div
						key={`${title}-${item.label}`}
						className="flex items-center justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-sm">{item.label}</span>
							{item.change !== null && <TrendPill value={item.change} />}
						</div>
						<div className="text-muted-foreground">
							{formatCurrency(item.value)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
