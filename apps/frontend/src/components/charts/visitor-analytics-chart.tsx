'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import type { ChartConfig } from '@/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'

// Mock visitor data for the chart
const visitorData = [
	{ date: '2024-01-01', visitors: 1200 },
	{ date: '2024-01-02', visitors: 1100 },
	{ date: '2024-01-03', visitors: 1400 },
	{ date: '2024-01-04', visitors: 1600 },
	{ date: '2024-01-05', visitors: 1300 },
	{ date: '2024-01-06', visitors: 1800 },
	{ date: '2024-01-07', visitors: 2100 }
]

const chartConfig = {
	visitors: {
		label: 'Visitors',
		color: 'hsl(var(--primary))'
	}
} satisfies ChartConfig

interface VisitorAnalyticsChartProps {
	timeRange?: '7d' | '30d' | '90d'
}

export function VisitorAnalyticsChart({
	timeRange = '7d'
}: VisitorAnalyticsChartProps) {
	// TODO: filter data based on timeRange
	const filteredData = React.useMemo(() => {
		// For demo purposes, just return the mock data
		// In production, this would filter based on timeRange: timeRange
		return visitorData
	}, [])

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-[300px] w-full"
		>
			<AreaChart
				data={filteredData}
				margin={{
					top: 10,
					right: 30,
					left: 0,
					bottom: 0
				}}
			>
				<defs>
					<linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="hsl(var(--primary))"
							stopOpacity={0.8}
						/>
						<stop
							offset="95%"
							stopColor="hsl(var(--primary))"
							stopOpacity={0.1}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					dataKey="date"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={value => {
						const date = new Date(value)
						return date.toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric'
						})
					}}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					tickFormatter={value => `${value}`}
				/>
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							labelFormatter={value => {
								return new Date(value).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})
							}}
							indicator="dot"
						/>
					}
				/>
				<Area
					type="monotone"
					dataKey="visitors"
					stroke="hsl(var(--primary))"
					fillOpacity={1}
					fill="url(#fillVisitors)"
				/>
			</AreaChart>
		</ChartContainer>
	)
}
