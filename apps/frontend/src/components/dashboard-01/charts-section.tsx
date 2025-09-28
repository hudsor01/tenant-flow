'use client'

import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'

/**
 * ChartsSection - Single Responsibility: Financial chart visualizations
 *
 * Handles chart display and layout - chart component manages its own data
 */
export function ChartsSection() {
	return (
		<div className="w-full">
			<ChartAreaInteractive className="w-full" />
		</div>
	)
}