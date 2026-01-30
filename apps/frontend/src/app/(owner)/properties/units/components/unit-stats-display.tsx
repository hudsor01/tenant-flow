'use client'

import { cn } from '#lib/utils'
import type { UnitStats } from '@repo/shared/types/stats'

interface UnitStatsDisplayProps {
	stats: UnitStats
	className?: string
}

/**
 * Enhanced unit stats display component
 * Shows occupied/total units and occupancy percentage
 */
export function UnitStatsDisplay({ stats, className }: UnitStatsDisplayProps) {
	const occupancyRate = stats.total > 0
		? ((stats.occupied / stats.total) * 100).toFixed(1)
		: '0.0'

	return (
		<div className={cn('flex gap-2', className)}>
			<input
				type="text"
				readOnly
				value={`${stats.occupied}/${stats.total} occupied`}
				className={cn(
					'h-8 px-2 py-1 text-xs rounded-md border border-input bg-transparent',
					'text-center pointer-events-none bg-muted/50'
				)}
			/>
			<input
				type="text"
				readOnly
				value={`${occupancyRate}%`}
				className={cn(
					'h-8 px-2 py-1 text-xs rounded-md border border-input bg-transparent',
					'text-center pointer-events-none bg-primary/10'
				)}
			/>
		</div>
	)
}
