'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '#components/ui/chart'
import { chartConfig } from '../dashboard-types'

interface RevenueTrendPoint {
	month: string
	revenue: number
}

interface RevenueOverviewChartProps {
	revenueTrend: RevenueTrendPoint[]
}

export function RevenueOverviewChart({
	revenueTrend
}: RevenueOverviewChartProps) {
	return (
		<Card className="lg:col-span-3" data-tour="charts-section">
			<CardHeader>
				<CardTitle>Revenue Overview</CardTitle>
				<CardDescription>Monthly revenue for the past 6 months</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[400px] w-full">
					<AreaChart
						data={revenueTrend.map(point => ({
							month: point.month,
							revenue: point.revenue / 100
						}))}
						margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="var(--color-revenue)"
									stopOpacity={0.8}
								/>
								<stop
									offset="95%"
									stopColor="var(--color-revenue)"
									stopOpacity={0.1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} strokeDasharray="3 3" />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={value => value}
									formatter={value => [
										`$${Number(value).toLocaleString()}`,
										'Revenue'
									]}
								/>
							}
						/>
						<Area
							dataKey="revenue"
							type="monotone"
							fill="url(#fillRevenue)"
							stroke="var(--color-revenue)"
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
