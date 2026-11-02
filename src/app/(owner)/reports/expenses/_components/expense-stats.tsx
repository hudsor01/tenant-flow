import {
	Calendar,
	Minus,
	TrendingDown,
	TrendingUp,
	Wrench,
} from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { BorderBeam } from "#components/ui/border-beam";
import {
	Stat,
	StatDescription,
	StatIndicator,
	StatLabel,
	StatValue,
} from "#components/ui/stat";
import { formatDateWindow } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";
import type { ExpenseYearOverYear } from "#types/analytics";

// Match financials-summary-stats: dollars, two decimals, no /100 mis-conversion.
interface ExpenseStatsProps {
	totalExpenses: number;
	monthlyAvg: number;
	maintenanceTotal: number;
	maintenancePercent: string;
	yearOverYear: ExpenseYearOverYear;
}

/** The U+2212 typographic minus the other trend figures use. */
const MINUS = String.fromCharCode(0x2212);

/**
 * The year to date against the same dates a year earlier (get_expense_summary,
 * 20261102184502). Spending more is the destructive direction. With no prior
 * period from the server (the body before) the change is unavailable; with
 * nothing spent then there is no prior figure to compare with.
 */
function YearOverYearTile({
	yearOverYear,
}: {
	yearOverYear: ExpenseYearOverYear;
}) {
	if (yearOverYear.status === "unavailable" || yearOverYear.change === null) {
		return (
			<Stat className="relative overflow-hidden">
				<StatLabel>YoY Change</StatLabel>
				<StatValue className="flex items-baseline text-base font-semibold text-muted-foreground">
					{yearOverYear.status === "unavailable"
						? "Unavailable"
						: "No prior figure"}
				</StatValue>
				<StatIndicator variant="icon" color="primary">
					<Minus />
				</StatIndicator>
				<StatDescription>
					{yearOverYear.status === "unavailable"
						? "Year-over-year pending"
						: `Nothing spent ${formatDateWindow(yearOverYear.priorPeriod)}`}
				</StatDescription>
			</Stat>
		);
	}
	const rounded = Math.round(yearOverYear.change * 10) / 10;
	const sign = rounded > 0 ? "+" : rounded < 0 ? MINUS : "";
	return (
		<Stat className="relative overflow-hidden">
			<StatLabel>YoY Change</StatLabel>
			<StatValue
				className={`flex items-baseline ${rounded > 0 ? "text-destructive-text" : rounded < 0 ? "text-success-text" : ""}`}
			>
				{sign}
				{Math.abs(rounded).toFixed(1)}%
			</StatValue>
			<StatIndicator
				variant="icon"
				color={
					rounded > 0 ? "destructive" : rounded < 0 ? "success" : "primary"
				}
			>
				{rounded > 0 ? (
					<TrendingUp />
				) : rounded < 0 ? (
					<TrendingDown />
				) : (
					<Minus />
				)}
			</StatIndicator>
			<StatDescription>
				vs {formatDateWindow(yearOverYear.priorPeriod)}
			</StatDescription>
		</Stat>
	);
}

export function ExpenseStats({
	totalExpenses,
	monthlyAvg,
	maintenanceTotal,
	maintenancePercent,
	yearOverYear,
}: ExpenseStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

			<BlurFade delay={0.3}>
				<YearOverYearTile yearOverYear={yearOverYear} />
			</BlurFade>
		</div>
	);
}
