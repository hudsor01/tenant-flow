import { Calendar, TrendingDown, Wrench } from "lucide-react";
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

// Match financials-summary-stats: dollars, two decimals, no /100 mis-conversion.
interface ExpenseStatsProps {
	totalExpenses: number;
	monthlyAvg: number;
	maintenanceTotal: number;
	maintenancePercent: string;
}

export function ExpenseStats({
	totalExpenses,
	monthlyAvg,
	maintenanceTotal,
	maintenancePercent,
}: ExpenseStatsProps) {
	// No year-over-year tile: get_expense_summary returns year_over_year_change
	// as the literal null, so it only ever read "--" beside a green down-trend.
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
			<BlurFade delay={0.15}>
				<Stat className="relative overflow-hidden">
					{totalExpenses > 0 && (
						<BorderBeam
							size={80}
							duration={10}
							colorFrom="var(--color-destructive)"
							colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
						/>
					)}
					<StatLabel>Total Expenses</StatLabel>
					<StatValue className="flex items-baseline text-destructive-text">
						{formatCurrency(totalExpenses)}
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<TrendingDown />
					</StatIndicator>
					<StatDescription>year to date</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2}>
				<Stat className="relative overflow-hidden">
					<StatLabel>Monthly Average</StatLabel>
					<StatValue className="flex items-baseline">
						{formatCurrency(monthlyAvg)}
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Calendar />
					</StatIndicator>
					<StatDescription>avg per month</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25}>
				<Stat className="relative overflow-hidden">
					<StatLabel>Maintenance</StatLabel>
					<StatValue className="flex items-baseline text-warning-text">
						{formatCurrency(maintenanceTotal)}
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Wrench />
					</StatIndicator>
					<StatDescription>{maintenancePercent}% of total</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	);
}
