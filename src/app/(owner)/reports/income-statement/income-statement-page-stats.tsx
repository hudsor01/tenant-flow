import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
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

interface IncomeStatementPageStatsProps {
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
	profitMargin: string;
}

export function IncomeStatementPageStats({
	totalRevenue,
	totalExpenses,
	netIncome,
	profitMargin,
}: IncomeStatementPageStatsProps) {
	return (
		// The columns step on the row's own width, never the viewport's
		// (66.2-39 fix round 4, Part 8c): one until two tiles hold a
		// figure as long as -$1,234,567.00, then the third tile under the first two, all
		// three in a row from where three do. A tile under 16rem (one column at
		// 320) sets its figure at 24px: +$1,234,567.00 is 219.42px at 32px, the
		// tile's content 206.
		<div className="@container/income-stats mb-8">
			<div className="grid grid-cols-1 @min-[33rem]/income-stats:grid-cols-2 @min-[50rem]/income-stats:grid-cols-3 gap-4">
				<BlurFade delay={0.15}>
					<Stat className="@container/stat relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
						<StatLabel>Total Revenue</StatLabel>
						<StatValue className="flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat text-success-text">
							{formatCurrency(totalRevenue)}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>charged on your rent ledger</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2}>
					<Stat className="@container/stat relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat text-destructive-text">
							{formatCurrency(totalExpenses)}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>operating costs</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade
					className="@min-[33rem]/income-stats:col-span-2 @min-[50rem]/income-stats:col-span-1"
					delay={0.25}
				>
					<Stat className="@container/stat relative overflow-hidden">
						{netIncome > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
							/>
						)}
						<StatLabel>Net Income</StatLabel>
						<StatValue
							className={`flex items-baseline text-2xl leading-none @min-[16rem]/stat:text-stat ${netIncome >= 0 ? "" : "text-destructive-text"}`}
						>
							{formatCurrency(netIncome)}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>{profitMargin}% profit margin</StatDescription>
					</Stat>
				</BlurFade>
			</div>
		</div>
	);
}
