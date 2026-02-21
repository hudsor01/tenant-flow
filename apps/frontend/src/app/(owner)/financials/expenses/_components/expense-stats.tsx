'use client'

import { TrendingUp, TrendingDown, Wrench, Calendar } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { NumberTicker } from '#components/ui/number-ticker'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface ExpenseStatsProps {
	totalExpenses: number
	monthlyAvg: number
	maintenanceTotal: number
	maintenancePercent: string
	yoyChange: number | null
}

export function ExpenseStats({
	totalExpenses,
	monthlyAvg,
	maintenanceTotal,
	maintenancePercent,
	yoyChange
}: ExpenseStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<BlurFade delay={0.15} inView>
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
					<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(totalExpenses / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<TrendingDown />
					</StatIndicator>
					<StatDescription>year to date</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Monthly Average</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(monthlyAvg / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Calendar />
					</StatIndicator>
					<StatDescription>avg per month</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Maintenance</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-orange-600 dark:text-orange-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(maintenanceTotal / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Wrench />
					</StatIndicator>
					<StatDescription>{maintenancePercent}% of total</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>YoY Change</StatLabel>
					<StatValue
						className={`flex items-baseline gap-0.5 ${yoyChange !== null && yoyChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
					>
						{yoyChange !== null ? (
							<>
								{yoyChange > 0 ? '+' : ''}
								{yoyChange.toFixed(1)}%
							</>
						) : (
							'--'
						)}
					</StatValue>
					<StatIndicator
						variant="icon"
						color={
							yoyChange !== null && yoyChange > 0 ? 'destructive' : 'success'
						}
					>
						{yoyChange !== null && yoyChange > 0 ? (
							<TrendingUp />
						) : (
							<TrendingDown />
						)}
					</StatIndicator>
					<StatDescription>vs last year</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
