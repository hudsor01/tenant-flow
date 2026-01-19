'use client'

import type {
	MaintenanceCostBreakdownEntry,
	MaintenanceTrendPoint
} from '@repo/shared/types/analytics'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'
import { Badge } from '#components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader } from '#components/ui/empty'

const trendConfig = {
	completed: {
		label: 'Completed',
		color: 'oklch(0.6 0.16 160)'
	},
	pending: {
		label: 'Pending',
		color: 'oklch(0.68 0.12 20)'
	}
} satisfies ChartConfig

const costConfig = {
	amount: {
		label: 'Cost',
		color: 'oklch(0.62 0.14 230)'
	}
} satisfies ChartConfig

type MaintenanceTrendChartProps = {
	points: MaintenanceTrendPoint[]
}

type MaintenanceCostChartProps = {
	entries: MaintenanceCostBreakdownEntry[]
}

export function MaintenanceTrendChart({ points }: MaintenanceTrendChartProps) {
	if (!points.length) {
		return (
			<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
				<EmptyHeader>
					<Badge variant="outline" className="mb-1">
						No data
					</Badge>
					<EmptyDescription>
						Maintenance request trends are not available yet.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = points.map(point => ({
		period: point.period,
		completed: point.completed,
		pending: point.pending,
		avgResolutionTime: point.avgResolutionTime
	}))

	return (
		<ChartContainer className="h-75" config={trendConfig}>
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent indicator="line" />} />
				<Line
					type="monotone"
					dataKey="completed"
					stroke="var(--color-completed)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="pending"
					stroke="var(--color-pending)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	)
}

export function MaintenanceCostChart({ entries }: MaintenanceCostChartProps) {
	if (!entries.length) {
		return (
			<Empty className="flex-none h-60 gap-3 rounded-lg border border-dashed p-6">
				<EmptyHeader>
					<Badge variant="outline" className="mb-1">
						No data
					</Badge>
					<EmptyDescription>
						No maintenance cost data recorded for this period.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = entries.map(entry => ({
		category: entry.category,
		amount: entry.amount
	}))

	return (
		<ChartContainer className="h-75" config={costConfig}>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="category"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-20}
					textAnchor="end"
					height={80}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent />} />
				<Bar
					dataKey="amount"
					fill="var(--color-amount)"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ChartContainer>
	)
}
