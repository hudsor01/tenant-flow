import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";

/**
 * The report's two activities. There is no investing activity: the data model
 * records no purchase or improvement, so the figure was always $0.
 */
interface CashFlowActivityProps {
	netOperatingCash: number;
	netFinancingCash: number;
}

export function CashFlowActivity({
	netOperatingCash,
	netFinancingCash,
}: CashFlowActivityProps) {
	return (
		<BlurFade delay={0.4}>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">
					Cash Flow by Activity
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="text-center p-4 bg-success/10 rounded-lg">
						<p className="text-2xl font-semibold text-success-text tabular-nums">
							{formatCurrency(netOperatingCash)}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Operating Activities
						</p>
					</div>
					<div className="text-center p-4 bg-primary/5 rounded-lg">
						<p className="text-2xl font-semibold text-foreground tabular-nums">
							{formatCurrency(netFinancingCash)}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Financing Activities
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
	);
}
