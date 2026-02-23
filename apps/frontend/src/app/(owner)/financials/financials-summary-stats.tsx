import { TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface RecentMonths {
	revenueChange: number
	expenseChange: number
}

interface FinancialsSummaryStatsProps {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	accountsReceivable: number
	profitMargin: string
	recentMonths: RecentMonths | null
}

export function FinancialsSummaryStats({
	totalRevenue,
	totalExpenses,
	netIncome,
	accountsReceivable,
	profitMargin,
	recentMonths
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
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(totalRevenue / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<TrendingUp />
					</StatIndicator>
					<StatDescription>
						{recentMonths
							? `${recentMonths.revenueChange >= 0 ? '+' : ''}${recentMonths.revenueChange.toFixed(1)}% vs last month`
							: 'year to date'}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
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
					<StatDescription>
						{recentMonths
							? `${recentMonths.expenseChange >= 0 ? '+' : ''}${recentMonths.expenseChange.toFixed(1)}% vs last month`
							: 'operating costs'}
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
						className={`flex items-baseline gap-0.5 ${netIncome >= 0 ? '' : 'text-destructive'}`}
					>
						<span className="text-lg">{netIncome >= 0 ? '$' : '-$'}</span>
						<NumberTicker
							value={Math.abs(Math.floor(netIncome / 100))}
							duration={1500}
						/>
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
					<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={Math.floor(accountsReceivable / 100)}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>accounts receivable</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
