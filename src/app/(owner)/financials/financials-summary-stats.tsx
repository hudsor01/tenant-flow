import { Clock, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";

// Session 11 P2 #25, cycle-1 review #10: unify $0.00 format with
// balance-sheet / cash-flow / income-statement cycle-2 fixes. Also
// drops a pre-existing /100 mis-conversion: get_financial_overview
// returns numeric(10,2) dollars (rent_amount × 12 from leases), but
// the prior NumberTicker call divided by 100 and displayed revenue
// 1/100th the actual amount.
function formatUsd(value: number): string {
	return value.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

interface RecentMonths {
	revenueChange: number;
	expenseChange: number;
}

interface FinancialsSummaryStatsProps {
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
	accountsReceivable: number;
	profitMargin: string;
	recentMonths: RecentMonths | null;
}

export function FinancialsSummaryStats({
	totalRevenue,
	totalExpenses,
	netIncome,
	accountsReceivable,
	profitMargin,
	recentMonths,
}: FinancialsSummaryStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.15} inView>
				<Stat className="relative overflow-hidden">
					{totalRevenue > 0 && (
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
					)}
					<StatLabel>Total Revenue</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						${formatUsd(totalRevenue)}
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<TrendingUp />
					</StatIndicator>
					<StatDescription>
						{recentMonths
							? `${recentMonths.revenueChange >= 0 ? "+" : ""}${recentMonths.revenueChange.toFixed(1)}% vs last month`
							: "year to date"}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Total Expenses</StatLabel>
					<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
						${formatUsd(totalExpenses)}
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<TrendingDown />
					</StatIndicator>
					<StatDescription>
						{recentMonths
							? `${recentMonths.expenseChange >= 0 ? "+" : ""}${recentMonths.expenseChange.toFixed(1)}% vs last month`
							: "operating costs"}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
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
						className={`flex items-baseline ${netIncome >= 0 ? "" : "text-destructive"}`}
					>
						{netIncome >= 0 ? "$" : "-$"}
						{formatUsd(Math.abs(netIncome))}
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<DollarSign />
					</StatIndicator>
					<StatDescription>{profitMargin}% profit margin</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					{accountsReceivable > 0 && (
						<BorderBeam
							size={100}
							duration={8}
							colorFrom="var(--color-warning)"
							colorTo="oklch(from var(--color-warning) l c h / 0.3)"
						/>
					)}
					<StatLabel>Outstanding</StatLabel>
					<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
						${formatUsd(accountsReceivable)}
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>accounts receivable</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
