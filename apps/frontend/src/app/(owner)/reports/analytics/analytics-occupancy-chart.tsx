'use client'

import { Card } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import type { OccupancyMetrics } from '@repo/shared/types/reports'

const formatPercent = (value: number) => `${value.toFixed(1)}%`

interface AnalyticsOccupancyChartProps {
	occupancyMetrics: OccupancyMetrics | undefined
	isLoading: boolean
}

export function AnalyticsOccupancyChart({
	occupancyMetrics,
	isLoading
}: AnalyticsOccupancyChartProps) {
	return (
		<Card className="@container/card">
			<div className="p-6 border-b">
				<h2 className="typography-h4">Occupancy by Property</h2>
				<p className="text-muted-foreground text-sm">
					Unit occupancy rates across portfolio
				</p>
			</div>
			<div className="p-6">
				{isLoading ? (
					<Skeleton className="h-64 w-full" />
				) : occupancyMetrics && occupancyMetrics.byProperty.length > 0 ? (
					<ResponsiveContainer width="100%" height={256}>
						<LineChart data={occupancyMetrics.byProperty}>
							<CartesianGrid
								strokeDasharray="3 3"
								className="stroke-muted"
							/>
							<XAxis
								dataKey="propertyName"
								className="text-xs"
								tick={{ fill: 'var(--color-muted-foreground)' }}
								angle={-45}
								textAnchor="end"
								height={80}
							/>
							<YAxis
								className="text-xs"
								tick={{ fill: 'var(--color-muted-foreground)' }}
								domain={[0, 100]}
								tickFormatter={formatPercent}
							/>
							<Tooltip
								contentStyle={{
									backgroundColor: 'var(--color-background)',
									border: '1px solid var(--color-border)',
									borderRadius: '2px'
								}}
								formatter={value => {
									const numericValue = Array.isArray(value)
										? Number(value[0])
										: Number(value)
									return formatPercent(
										Number.isFinite(numericValue) ? numericValue : 0
									)
								}}
							/>
							<Line
								type="monotone"
								dataKey="occupancyRate"
								stroke="var(--chart-4)"
								strokeWidth={2}
								name="Occupancy Rate"
							/>
						</LineChart>
					</ResponsiveContainer>
				) : (
					<div className="h-64 flex-center text-muted-foreground">
						No occupancy data available
					</div>
				)}
			</div>
		</Card>
	)
}
