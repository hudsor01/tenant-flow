import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";

/**
 * The report's two activities. There is no investing activity: the data model
 * records no purchase or improvement, so the figure was always $0.
 *
 * mb-0 on each tile's figure and label: the tile is a padded box, so the base
 * `p` margin would stand under the label and widen the 4px between the two.
 * Each tile is a container, and its figure is 20px below 12.5rem (66.2-39 fix
 * round 4, Part 8c): at 320 the tile holds 158px and -$1,234,567.00 is 165.97px
 * at 24px. The two columns step on the card's own width, never the viewport's
 * (the rail changes it): one until two tiles are 10.75rem wide, where each
 * holds -$1,234,567.00 at 20px (138.31px) in its 140px (Part 8d).
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
			<div className="@container/cash-flow-activity bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">
					Cash Flow by Activity
				</h3>
				<div className="grid grid-cols-1 @min-[22.5rem]/cash-flow-activity:grid-cols-2 gap-4">
					<div className="@container/activity-tile text-center p-4 bg-success/10 rounded-lg">
						<p className="mb-0 whitespace-nowrap text-xl @min-[12.5rem]/activity-tile:text-2xl font-semibold text-success-text tabular-nums">
							{formatCurrency(netOperatingCash)}
						</p>
						<p className="mt-1 mb-0 text-sm text-muted-foreground">
							Operating Activities
						</p>
					</div>
					<div className="@container/activity-tile text-center p-4 bg-primary/5 rounded-lg">
						<p className="mb-0 whitespace-nowrap text-xl @min-[12.5rem]/activity-tile:text-2xl font-semibold text-foreground tabular-nums">
							{formatCurrency(netFinancingCash)}
						</p>
						<p className="mt-1 mb-0 text-sm text-muted-foreground">
							Financing Activities
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
	);
}
