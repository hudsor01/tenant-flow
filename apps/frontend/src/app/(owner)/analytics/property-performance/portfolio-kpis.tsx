'use client'

import { Badge } from '#components/ui/badge'
import { formatNumber, formatPercentage } from '#lib/formatters/currency'
import type { UnitStatisticEntry } from '@repo/shared/types/analytics'

export function PortfolioKPIs({ unitStats }: { unitStats: UnitStatisticEntry[] }) {
	return (
		<div className="space-y-3">
			{unitStats.slice(0, 6).map(stat => (
				<div
					key={stat.label}
					className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
				>
					<span className="text-muted-foreground">{stat.label}</span>
					<span className="font-medium tabular-nums">
						{formatNumber(stat.value)}
						{stat.trend !== null && stat.trend !== undefined && (
							<Badge
								variant={stat.trend >= 0 ? 'outline' : 'destructive'}
								className="ml-2"
							>
								{formatPercentage(Math.abs(stat.trend))}
							</Badge>
						)}
					</span>
				</div>
			))}
		</div>
	)
}
