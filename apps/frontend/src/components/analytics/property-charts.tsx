'use client'

import type {
	OccupancyTrendPoint,
	VacancyAnalysisEntry
} from '@repo/shared/types/analytics'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import { Badge } from '#components/ui/badge'
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'
import { Empty, EmptyDescription, EmptyHeader } from '#components/ui/empty'

const occupancyConfig = {
	occupancyRate: {
		label: 'Occupancy Rate',
		color: 'oklch(0.65 0.13 210)'
	}
} satisfies ChartConfig

type OccupancyTrendChartProps = {
	data: OccupancyTrendPoint[]
}

type VacancyListProps = {
	entries: VacancyAnalysisEntry[]
}

export function OccupancyTrendChart({ data }: OccupancyTrendChartProps) {
	if (!data.length) {
		return (
			<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
				<EmptyHeader>
					<Badge variant="outline" className="mb-1">
						No data
					</Badge>
					<EmptyDescription>
						Occupancy trend data is not available yet.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = data.map(point => ({
		period: point.period,
		occupancyRate: Number(
			point.occupancyRate.toFixed?.(2) ?? point.occupancyRate
		)
	}))

	return (
		<ChartContainer className="h-75" config={occupancyConfig}>
			<AreaChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} unit="%" />
				<Tooltip content={<ChartTooltipContent />} />
				<Area
					type="monotone"
					dataKey="occupancyRate"
					stroke="var(--color-occupancyRate)"
					fill="var(--color-occupancyRate)"
					fillOpacity={0.25}
				/>
			</AreaChart>
		</ChartContainer>
	)
}

export function VacancySummaryList({ entries }: VacancyListProps) {
	if (!entries.length) {
		return (
			<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
				<EmptyHeader>
					<Badge variant="outline" className="mb-1">
						No data
					</Badge>
					<EmptyDescription>
						No vacancy analysis available for the selected filters.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<div className="space-y-3">
			{entries.slice(0, 8).map(entry => (
				<div
					key={entry.property_id}
					className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
				>
					<div className="flex flex-col">
						<span className="font-medium">{entry.propertyName}</span>
						{entry.notes ? (
							<span className="text-muted-foreground text-xs">{entry.notes}</span>
						) : null}
					</div>
					<div className="flex items-center gap-4">
						<span className="text-muted-foreground">
							{entry.vacancyDays} days vacant
						</span>
						<Badge variant="outline" className="text-xs">
							{entry.turnovers} turnovers
						</Badge>
					</div>
				</div>
			))}
		</div>
	)
}
