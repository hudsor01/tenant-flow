import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
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

interface IncomeStatementPageStatsProps {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	profitMargin: string
}

export function IncomeStatementPageStats({
	totalRevenue,
	totalExpenses,
	netIncome,
	profitMargin
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
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<span className="text-lg">$</span>
						<NumberTicker value={Math.floor(totalRevenue)} duration={1500} />
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
					<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
						<span className="text-lg">$</span>
						<NumberTicker value={Math.floor(totalExpenses)} duration={1500} />
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
						className={`flex items-baseline gap-0.5 ${netIncome >= 0 ? '' : 'text-destructive'}`}
					>
						<span className="text-lg">{netIncome >= 0 ? '$' : '-$'}</span>
						<NumberTicker
							value={Math.abs(Math.floor(netIncome))}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<DollarSign />
					</StatIndicator>
					<StatDescription>{profitMargin}% profit margin</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
