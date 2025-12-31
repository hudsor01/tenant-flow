'use client'

import { Building2, DollarSign, Users, Wrench } from 'lucide-react'
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
import { AnimatedTrendIndicator } from '#components/ui/animated-trend-indicator'
import type { AnalyticsOverview } from '../analytics-types'

interface OverviewStatsGridProps {
	overview: AnalyticsOverview
}

export function OverviewStatsGrid({ overview }: OverviewStatsGridProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={10}
						colorFrom="hsl(var(--primary))"
						colorTo="hsl(var(--primary)/0.3)"
					/>
					<StatLabel>Occupancy Rate</StatLabel>
					<StatValue className="flex items-baseline gap-0.5">
						<NumberTicker
							value={overview.occupancyRate}
							duration={1500}
							decimalPlaces={1}
						/>
						<span className="text-lg">%</span>
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Building2 />
					</StatIndicator>
					<StatTrend trend={overview.occupancyChange >= 0 ? 'up' : 'down'}>
						<AnimatedTrendIndicator
							value={overview.occupancyChange}
							size="sm"
							delay={500}
						/>
						<span className="text-muted-foreground">vs last period</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>Active Tenants</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={overview.activeTenants} duration={1500} />
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<Users />
					</StatIndicator>
					<StatTrend trend="up">
						<span className="text-emerald-600 dark:text-emerald-400 font-medium">
							+{overview.tenantsChange}
						</span>
						<span className="text-muted-foreground">this month</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.4} inView>
				<Stat className="relative overflow-hidden">
					<BorderBeam
						size={100}
						duration={12}
						colorFrom="hsl(142 76% 36%)"
						colorTo="hsl(142 76% 36% / 0.3)"
					/>
					<StatLabel>Monthly Revenue</StatLabel>
					<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
						<span className="text-lg">$</span>
						<NumberTicker
							value={overview.monthlyRevenue / 100}
							duration={1500}
						/>
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<DollarSign />
					</StatIndicator>
					<StatTrend trend="up">
						<AnimatedTrendIndicator
							value={overview.revenueChange}
							size="sm"
							delay={600}
						/>
						<span className="text-muted-foreground">growth</span>
					</StatTrend>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.5} inView>
				<Stat className="relative overflow-hidden">
					{overview.openMaintenance > 3 && (
						<BorderBeam
							size={80}
							duration={6}
							colorFrom="hsl(45 93% 47%)"
							colorTo="hsl(45 93% 47% / 0.3)"
						/>
					)}
					<StatLabel>Open Maintenance</StatLabel>
					<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
						<NumberTicker value={overview.openMaintenance} duration={1000} />
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Wrench />
					</StatIndicator>
					<StatDescription>
						{overview.maintenanceChange < 0 ? (
							<span className="text-emerald-600 dark:text-emerald-400">
								{overview.maintenanceChange} from last week
							</span>
						) : (
							<span className="text-amber-600 dark:text-amber-400">
								+{overview.maintenanceChange} from last week
							</span>
						)}
					</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
