'use client'

import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend
} from '#components/ui/stat'
import { NumberTicker } from '#components/ui/number-ticker'
import { AnimatedTrendIndicator } from '#components/ui/animated-trend-indicator'
import type { FinancialMetricSummary } from '@repo/shared/types/analytics'

interface FinancialOverviewStatsProps {
	metrics: FinancialMetricSummary
}

export function FinancialOverviewStats({ metrics }: FinancialOverviewStatsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
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
						<NumberTicker
							value={metrics.totalRevenue / 100}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatTrend trend={metrics.revenueTrend && metrics.revenueTrend >= 0 ? 'up' : 'down'}>
						<AnimatedTrendIndicator
							value={metrics.revenueTrend ?? 0}
							size="sm"
							delay={500}
						/>
						<span className="text-muted-foreground">vs last period</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Net Income</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker
							value={metrics.netIncome / 100}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<TrendingUp />
					</StatIndicator>
					<StatTrend trend={metrics.profitMargin && metrics.profitMargin >= 0 ? 'up' : 'down'}>
						<AnimatedTrendIndicator
							value={metrics.profitMargin ?? 0}
							size="sm"
							delay={600}
						/>
						<span className="text-muted-foreground">profit margin</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Portfolio ROI</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={metrics.profitMargin ?? 0}
							duration={1500}
							decimalPlaces={1}
						/>
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="info">
						<BarChart3 />
					</StatIndicator>
					<StatTrend trend={metrics.expenseTrend && metrics.expenseTrend >= 0 ? 'up' : 'down'}>
						<AnimatedTrendIndicator
							value={metrics.expenseTrend ?? 0}
							size="sm"
							delay={700}
						/>
						<span className="text-muted-foreground">expense trend</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Cash Flow</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.cashFlow / 100} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatTrend trend={metrics.revenueTrend && metrics.revenueTrend >= 0 ? 'up' : 'down'}>
						<AnimatedTrendIndicator
							value={metrics.revenueTrend ?? 0}
							size="sm"
							delay={800}
						/>
						<span className="text-muted-foreground">operating cash</span>
					</StatTrend>
				</Stat>
			</BlurFade>
		</div>
	)
}
