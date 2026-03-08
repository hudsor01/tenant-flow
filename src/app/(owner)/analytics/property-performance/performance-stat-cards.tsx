import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '#components/ui/stat'
import { formatNumber } from '#lib/formatters/currency'
import type { PropertyPerformanceSummary } from '#types/analytics'
import { Building2, TrendingUp, DollarSign, Home } from 'lucide-react'

interface PerformanceStatCardsProps {
	metrics: PropertyPerformanceSummary
}

export function PerformanceStatCards({ metrics }: PerformanceStatCardsProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam size={100} duration={10} colorFrom="var(--color-primary)" colorTo="oklch(from var(--color-primary) l c h / 0.3)" />
					<StatLabel>Total properties</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={metrics.totalProperties} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="primary"><Building2 /></StatIndicator>
					<StatDescription>Tracked in workspace</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam size={100} duration={12} colorFrom="hsl(142 76% 36%)" colorTo="hsl(142 76% 36% / 0.3)" />
					<StatLabel>Average occupancy</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<NumberTicker value={metrics.averageOccupancy} duration={1500} decimalPlaces={1} />
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="success"><TrendingUp /></StatIndicator>
					<StatTrend trend="neutral">
						<span className="text-muted-foreground">{formatNumber(metrics.occupiedUnits)} of {formatNumber(metrics.totalUnits)} occupied</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Best performer</StatLabel>
					<StatValue className="flex items-baseline text-base font-semibold truncate">{metrics.bestPerformer ?? '-'}</StatValue>
					<StatIndicator variant="icon" color="info"><Home /></StatIndicator>
					<StatDescription>Highest occupancy rate</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Monthly revenue</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<span className="text-lg">$</span>
						<NumberTicker value={metrics.totalRevenue / 100} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success"><DollarSign /></StatIndicator>
					<StatDescription>Combined across properties</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
