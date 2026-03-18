'use client'

import type {
	PropertyPerformanceEntry,
	VisitorAnalyticsResponse
} from '#types/analytics'
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

import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Building2 } from 'lucide-react'

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

export function PropertyOccupancyChart({ data }: PropertyOccupancyChartProps) {
	if (!data.length) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Building2 />
					</EmptyMedia>
					<EmptyTitle>No property data</EmptyTitle>
					<EmptyDescription>
						Property performance data will appear once properties are added
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = data.map(item => ({
		property: item.propertyName,
		occupancy: Number(item.occupancyRate?.toFixed?.(1) ?? item.occupancyRate),
		revenue: item.monthlyRevenue
	}))

	return (
		<ChartContainer className="h-80" config={occupancyConfig}>
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
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Building2 />
					</EmptyMedia>
					<EmptyTitle>No property data</EmptyTitle>
					<EmptyDescription>
						Property performance data will appear once properties are added
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	const chartData = data.timeline.map(point => ({
		period: point.period,
		visits: point.visits,
		inquiries: point.inquiries,
		conversions: point.conversions
	}))

	return (
		<ChartContainer className="h-80" config={visitorConfig}>
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
