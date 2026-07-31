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
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
			<BlurFade delay={0.15} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="var(--color-success)"
						colorTo="oklch(from var(--color-success) l c h / 0.3)"
					/>
					<StatLabel>Total Revenue</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						{`$${totalRevenue.toLocaleString("en-US", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}`}
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<TrendingUp />
					</StatIndicator>
					<StatDescription>all income sources</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Total Expenses</StatLabel>
					<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
						{`$${totalExpenses.toLocaleString("en-US", {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}`}
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<TrendingDown />
					</StatIndicator>
					<StatDescription>operating costs</StatDescription>
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
						{`${netIncome >= 0 ? "" : "-"}$${Math.abs(netIncome).toLocaleString(
							"en-US",
							{ minimumFractionDigits: 2, maximumFractionDigits: 2 },
						)}`}
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<DollarSign />
					</StatIndicator>
					<StatDescription>{profitMargin}% profit margin</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
