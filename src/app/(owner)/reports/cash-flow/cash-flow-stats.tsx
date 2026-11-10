import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { formatCurrency } from "#lib/utils/currency";

interface CashFlowStatsProps {
	totalInflows: number;
	totalOutflows: number;
	netCashFlow: number;
}

export function CashFlowStats({
	totalInflows,
	totalOutflows,
	netCashFlow,
}: CashFlowStatsProps) {
	return (
		// The columns step on the row's own width, never the viewport's
		// (66.2-39 fix round 4, Part 8c): one until two tiles hold a
		// figure as long as -$1,234,567.00, then the third tile under the first two, all
		// three in a row from where three do. A tile under 16rem (one column at
		// 320) sets its figure at 24px: +$1,234,567.00 is 219.42px at 32px, the
		// tile's content 206.
		<div className="@container/cash-flow-stats mb-8">
			<div className="grid grid-cols-1 @min-[33rem]/cash-flow-stats:grid-cols-2 @min-[50rem]/cash-flow-stats:grid-cols-3 gap-4">
				<BlurFade delay={0.2}>
					<Stat className="@container/stat relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
						<StatLabel>Total Inflows</StatLabel>
						<StatValue className="flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat text-success-text">
							{formatCurrency(totalInflows)}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<ArrowUpCircle />
						</StatIndicator>
						<StatDescription>money received</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25}>
					<Stat className="@container/stat relative overflow-hidden">
						<StatLabel>Total Outflows</StatLabel>
						<StatValue className="flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat text-destructive-text">
							{formatCurrency(totalOutflows)}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<ArrowDownCircle />
						</StatIndicator>
						<StatDescription>money spent</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade
					className="@min-[33rem]/cash-flow-stats:col-span-2 @min-[50rem]/cash-flow-stats:col-span-1"
					delay={0.3}
				>
					<Stat className="@container/stat relative overflow-hidden">
						{netCashFlow > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
							/>
						)}
						<StatLabel>Net Cash Flow</StatLabel>
						<StatValue
							className={`flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat ${netCashFlow >= 0 ? "" : "text-destructive-text"}`}
						>
							{netCashFlow > 0 ? "+" : ""}
							{formatCurrency(netCashFlow)}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net change</StatDescription>
					</Stat>
				</BlurFade>
			</div>
		</div>
	);
}
