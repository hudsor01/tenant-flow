'use client'

import { AlertTriangle, Clock, Percent, TrendingUp } from 'lucide-react'
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

interface StatsSectionProps {
	totalCollected: number
	totalPending: number
	totalOverdue: number
	collectionRate: number
	onTimeRate: number
	upcomingCount: number
	overdueCount: number
	activeSubscriptionsCount: number
}

export function StatsSection({
	totalCollected,
	totalPending,
	totalOverdue,
	collectionRate,
	onTimeRate,
	upcomingCount,
	overdueCount,
	activeSubscriptionsCount
}: StatsSectionProps) {
	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
			<BlurFade delay={0.15} inView>
				<Stat className="relative overflow-hidden">
					{totalCollected > 0 && (
						<BorderBeam
							size={80}
							duration={8}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
					)}
					<StatLabel>Collected (MTD)</StatLabel>
					<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
						${Math.floor(totalCollected / 100).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="success">
						<TrendingUp />
					</StatIndicator>
					<StatDescription>
						{collectionRate > 0 ? `${collectionRate}% rate` : 'this month'}
					</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.2} inView>
				<Stat className="relative overflow-hidden">
					{totalPending > 0 && (
						<BorderBeam
							size={80}
							duration={8}
							colorFrom="var(--color-warning)"
							colorTo="oklch(from var(--color-warning) l c h / 0.3)"
						/>
					)}
					<StatLabel>Pending</StatLabel>
					<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
						${Math.floor(totalPending / 100).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="warning">
						<Clock />
					</StatIndicator>
					<StatDescription>{upcomingCount} upcoming</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.25} inView>
				<Stat className="relative overflow-hidden">
					{totalOverdue > 0 && (
						<BorderBeam
							size={80}
							duration={4}
							colorFrom="var(--color-destructive)"
							colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
						/>
					)}
					<StatLabel>Overdue</StatLabel>
					<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
						${Math.floor(totalOverdue / 100).toLocaleString()}
					</StatValue>
					<StatIndicator variant="icon" color="destructive">
						<AlertTriangle />
					</StatIndicator>
					<StatDescription>{overdueCount} late</StatDescription>
				</Stat>
			</BlurFade>

			<BlurFade delay={0.3} inView>
				<Stat className="relative overflow-hidden">
					<StatLabel>On-Time Rate</StatLabel>
					<StatValue className="flex items-baseline">
						<NumberTicker value={onTimeRate} duration={800} />%
					</StatValue>
					<StatIndicator variant="icon" color="primary">
						<Percent />
					</StatIndicator>
					<StatDescription>
						{activeSubscriptionsCount} autopay active
					</StatDescription>
				</Stat>
			</BlurFade>
		</div>
	)
}
