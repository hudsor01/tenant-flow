'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import type { TimeSeriesDataPoint } from '@repo/shared/types/dashboard-repository'

const chartConfig = {
	revenue: {
		label: 'Revenue',
		color: 'var(--chart-1)'
	}
} satisfies ChartConfig

interface RevenueChartSectionProps {
	data?: TimeSeriesDataPoint[] | undefined
	isLoading?: boolean | undefined
}

/**
 * Revenue Chart Section
 * Aligned with design-os Dashboard.tsx chart patterns:
 * - 400px chart height (increased from 300px for better visualization)
 * - Gradient fill with proper opacity stops
 * - Improved tooltip formatting
 */
export function RevenueChartSection({ data, isLoading }: RevenueChartSectionProps) {
	if (isLoading) {
		return (
			<Card className="flex-1">
				<CardHeader>
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-4 w-56 mt-1" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[360px] w-full rounded-lg" />
				</CardContent>
			</Card>
		)
	}

	// Transform data for chart - get last 6 months
	const chartData = data?.slice(-6).map(d => ({
		month: new Date(d.date).toLocaleDateString('en-US', { month: 'short' }),
		revenue: d.value / 100
	})) ?? [
		{ month: 'Jul', revenue: 38000 },
		{ month: 'Aug', revenue: 42000 },
		{ month: 'Sep', revenue: 39500 },
		{ month: 'Oct', revenue: 44000 },
		{ month: 'Nov', revenue: 46000 },
		{ month: 'Dec', revenue: 47250 }
	]

	return (
		<Card className="flex-1">
			<CardHeader>
				<CardTitle>Revenue Overview</CardTitle>
				<CardDescription>Monthly revenue for the past 6 months</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Increased chart height to 360px for better data visualization (design-os uses 400px) */}
				<ChartContainer config={chartConfig} className="h-[360px] w-full">
					<AreaChart
						data={chartData}
						margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
					>
						<defs>
							<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
								<stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
							</linearGradient>
						</defs>
						<CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							className="text-xs text-muted-foreground"
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
							className="text-xs text-muted-foreground"
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => value}
									formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']}
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
