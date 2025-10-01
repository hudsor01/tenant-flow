'use client'

import type {
	PropertyPerformanceEntry,
	VisitorAnalyticsResponse
} from '@repo/shared/types/property-analytics'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { CardDescription } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '@/components/ui/chart'

const occupancyConfig = {
	occupancy: {
		label: 'Occupancy %',
		color: 'oklch(0.62 0.12 240)'
	},
	revenue: {
		label: 'Monthly Revenue',
		color: 'oklch(0.68 0.14 150)'
	}
} satisfies ChartConfig

const visitorConfig = {
	visits: {
		label: 'Visits',
		color: 'oklch(0.73 0.08 40)'
	},
	inquiries: {
		label: 'Inquiries',
		color: 'oklch(0.6 0.16 120)'
	},
	conversions: {
		label: 'Applications',
		color: 'oklch(0.67 0.14 180)'
	}
} satisfies ChartConfig

type PropertyOccupancyChartProps = {
	data: PropertyPerformanceEntry[]
}

type VisitorAnalyticsChartProps = {
	data: VisitorAnalyticsResponse
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-[240px] flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="max-w-sm text-center text-sm text-muted-foreground">
				{message}
			</CardDescription>
		</div>
	)
}

export function PropertyOccupancyChart({ data }: PropertyOccupancyChartProps) {
	if (!data.length) {
		return (
			<EmptyState message="We couldn't find property performance data for your portfolio yet." />
		)
	}

	const chartData = data.map(item => ({
		property: item.propertyName,
		occupancy: Number(item.occupancyRate?.toFixed?.(1) ?? item.occupancyRate),
		revenue: item.monthlyRevenue
	}))

	return (
		<ChartContainer className="h-[320px]" config={occupancyConfig}>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="property"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-30}
					textAnchor="end"
					height={80}
				/>
				<YAxis yAxisId="occupancy" tickLine={false} axisLine={false} unit="%" />
				<YAxis
					yAxisId="revenue"
					orientation="right"
					tickLine={false}
					axisLine={false}
				/>
				<Tooltip content={<ChartTooltipContent />} />
				<Legend />
				<Bar
					yAxisId="occupancy"
					dataKey="occupancy"
					fill="var(--color-occupancy)"
					radius={[6, 6, 0, 0]}
				/>
				<Bar
					yAxisId="revenue"
					dataKey="revenue"
					fill="var(--color-revenue)"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ChartContainer>
	)
}

export function VisitorAnalyticsChart({ data }: VisitorAnalyticsChartProps) {
	if (!data.timeline.length) {
		return (
			<EmptyState message="We haven't tracked visitor activity for this period." />
		)
	}

	const chartData = data.timeline.map(point => ({
		period: point.period,
		visits: point.visits,
		inquiries: point.inquiries,
		conversions: point.conversions
	}))

	return (
		<ChartContainer className="h-[320px]" config={visitorConfig}>
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent indicator="line" />} />
				<Legend />
				<Line
					type="monotone"
					dataKey="visits"
					stroke="var(--color-visits)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="inquiries"
					stroke="var(--color-inquiries)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="conversions"
					stroke="var(--color-conversions)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	)
}
