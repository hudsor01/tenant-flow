'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Eye } from 'lucide-react'

import type { ChartConfig } from '@/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
	cn, 
	ANIMATION_DURATIONS, 
	TYPOGRAPHY_SCALE,
	cardClasses
} from '@/lib/utils'

interface VisitorDataPoint {
	date: string
	visitors: number
}

interface VisitorAnalyticsChartProps {
	timeRange?: '7d' | '30d' | '90d'
	data?: VisitorDataPoint[]
	showStats?: boolean
	className?: string
}

const chartConfig = {
	visitors: {
		label: 'Visitors',
		color: 'hsl(var(--primary))'
	}
} satisfies ChartConfig

// Generate realistic visitor data for different time ranges
function generateVisitorData(timeRange: '7d' | '30d' | '90d'): VisitorDataPoint[] {
	const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
	const data: VisitorDataPoint[] = []
	const today = new Date()
	
	// Base visitor count with some randomness and trends
	const baseVisitors = 1400
	const weeklyPattern = [0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.3] // Mon-Sun pattern
	
	for (let i = days - 1; i >= 0; i--) {
		const date = new Date(today)
		date.setDate(date.getDate() - i)
		
		// Add weekly pattern
		const dayOfWeek = date.getDay()
		const weeklyMultiplier = weeklyPattern[dayOfWeek] || 1.0
		
		// Add some trend (slight growth over time)
		const trendMultiplier = 1 + (days - i) * 0.002
		
		// Add random variation (±20%)
		const randomMultiplier = 0.8 + Math.random() * 0.4
		
		// Calculate final visitor count
		const visitors = Math.round(
			baseVisitors * weeklyMultiplier * trendMultiplier * randomMultiplier
		)
		
		data.push({
			date: date.toISOString().split('T')[0]!, // YYYY-MM-DD format
			visitors
		})
	}
	
	return data
}

// Filter data based on date range (for when external data is provided)
function filterDataByTimeRange(
	data: VisitorDataPoint[], 
	timeRange: '7d' | '30d' | '90d'
): VisitorDataPoint[] {
	const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - days)
	
	return data
		.filter(item => new Date(item.date) >= cutoffDate)
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Calculate analytics stats
function calculateAnalytics(data: VisitorDataPoint[]) {
	if (data.length === 0) return null
	
	const total = data.reduce((sum, item) => sum + item.visitors, 0)
	const average = Math.round(total / data.length)
	const max = Math.max(...data.map(item => item.visitors))
	const min = Math.min(...data.map(item => item.visitors))
	
	// Calculate trend (comparing first half vs second half)
	const midPoint = Math.floor(data.length / 2)
	const firstHalf = data.slice(0, midPoint)
	const secondHalf = data.slice(midPoint)
	
	const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.visitors, 0) / firstHalf.length
	const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.visitors, 0) / secondHalf.length
	
	const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
	const isIncreasing = trendPercentage > 0
	
	return {
		total,
		average,
		max,
		min,
		trendPercentage: Math.abs(trendPercentage),
		isIncreasing
	}
}

export function VisitorAnalyticsChart({
	timeRange = '7d',
	data: externalData,
	showStats = true,
	className
}: VisitorAnalyticsChartProps) {
	const chartData = React.useMemo(() => {
		// If external data is provided, filter it by time range
		if (externalData && externalData.length > 0) {
			return filterDataByTimeRange(externalData, timeRange)
		}
		
		// Otherwise generate realistic mock data
		return generateVisitorData(timeRange)
	}, [timeRange, externalData])

	const analytics = React.useMemo(() => calculateAnalytics(chartData), [chartData])

	const timeRangeLabel = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days', 
		'90d': 'Last 90 days'
	}[timeRange]

	return (
		<Card 
			className={cn(
				cardClasses(),
				'shadow-md hover:shadow-xl border-2',
				className
			)}
			style={{ 
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
			}}
		>
			<CardHeader 
				className="flex flex-row items-center justify-between space-y-0 pb-4"
				style={{ 
					animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
				}}
			>
				<div className="space-y-2">
					<CardTitle 
						className="tracking-tight font-bold flex items-center gap-2"
						style={{
							fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight,
							fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
						}}
					>
						<div className="bg-primary/10 p-2 rounded-lg">
							<Eye className="size-5 text-primary" />
						</div>
						Visitor Analytics
					</CardTitle>
					<CardDescription className="leading-relaxed text-base">
						{timeRangeLabel} • {analytics && `${analytics.total.toLocaleString()} total visitors`}
					</CardDescription>
				</div>
				{analytics && showStats && (
					<div 
						className="flex items-center gap-2 text-sm"
						style={{ 
							animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`,
						}}
					>
						{analytics.isIncreasing ? (
							<TrendingUp className="size-4 text-green-600" />
						) : (
							<TrendingDown className="size-4 text-red-600" />
						)}
						<span className={cn(
							'font-semibold',
							analytics.isIncreasing ? 'text-green-600' : 'text-red-600'
						)}>
							{analytics.trendPercentage.toFixed(1)}%
						</span>
						<span className="text-muted-foreground">
							{analytics.isIncreasing ? 'increase' : 'decrease'}
						</span>
					</div>
				)}
			</CardHeader>
			<CardContent 
				className="p-0"
				style={{ 
					animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
				}}
			>
				{showStats && analytics && (
					<div 
						className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-muted/20 border-b"
						style={{ 
							animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
						}}
					>
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">Average</p>
							<p className="text-xl font-bold tabular-nums">{analytics.average.toLocaleString()}</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">Peak</p>
							<p className="text-xl font-bold tabular-nums text-green-600">{analytics.max.toLocaleString()}</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">Lowest</p>
							<p className="text-xl font-bold tabular-nums text-orange-600">{analytics.min.toLocaleString()}</p>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground">Total</p>
							<p className="text-xl font-bold tabular-nums text-primary">{analytics.total.toLocaleString()}</p>
						</div>
					</div>
				)}
				<div className="p-6">
					<ChartContainer
						config={chartConfig}
						className="h-[300px] w-full"
						style={{ 
							animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`,
						}}
					>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={chartData}
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
								<CartesianGrid 
									strokeDasharray="3 3" 
									stroke="hsl(var(--muted-foreground))" 
									strokeOpacity={0.3}
								/>
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
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
									tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
									tickFormatter={value => `${value.toLocaleString()}`}
								/>
								<ChartTooltip
									cursor={{
										stroke: 'hsl(var(--primary))',
										strokeWidth: 2,
										strokeDasharray: '5 5'
									}}
									content={
										<ChartTooltipContent
											labelFormatter={value => {
												return new Date(value).toLocaleDateString('en-US', {
													month: 'long',
													day: 'numeric',
													year: 'numeric'
												})
											}}
											indicator="dot"
											className="bg-background/95 backdrop-blur-sm border-2 shadow-xl"
										/>
									}
								/>
								<Area
									type="monotone"
									dataKey="visitors"
									stroke="hsl(var(--primary))"
									strokeWidth={2}
									fillOpacity={1}
									fill="url(#fillVisitors)"
									dot={{
										r: 4,
										fill: 'hsl(var(--primary))',
										strokeWidth: 2,
										stroke: 'hsl(var(--background))'
									}}
									activeDot={{
										r: 6,
										fill: 'hsl(var(--primary))',
										strokeWidth: 2,
										stroke: 'hsl(var(--background))'
									}}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</CardContent>
		</Card>
	)
}
