'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Eye, Activity, Calendar, Users, AlertCircle, Loader2, RefreshCw, BarChart3 } from 'lucide-react'

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
	cardClasses,
	buttonClasses,
	badgeClasses,
	animationClasses
} from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface VisitorDataPoint {
	date: string
	visitors: number
}

interface VisitorAnalyticsChartProps {
	timeRange?: '7d' | '30d' | '90d'
	data?: VisitorDataPoint[]
	showStats?: boolean
	className?: string
	isLoading?: boolean
	isError?: boolean
	onRefresh?: () => void
	onTimeRangeChange?: (range: '7d' | '30d' | '90d') => void
	title?: string
	subtitle?: string
}

const chartConfig = {
	visitors: {
		label: 'Visitors',
		color: 'hsl(var(--primary))'
	}
} satisfies ChartConfig

// Loading skeleton component for the chart
function ChartLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{/* Header skeleton */}
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-8 w-20" />
			</div>
			
			{/* Stats skeleton */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-muted/20 border-b rounded-t-lg">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-3 w-16" />
						<Skeleton className="h-6 w-12" />
					</div>
				))}
			</div>
			
			{/* Chart skeleton */}
			<div className="p-6">
				<div className="h-[300px] flex items-end justify-between space-x-2">
					{[...Array(12)].map((_, i) => (
						<Skeleton 
							key={i} 
							className="w-full" 
							style={{ height: `${Math.random() * 200 + 50}px` }}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

// Error state component
function ChartErrorState({ onRefresh }: { onRefresh?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-[400px] space-y-4">
			<div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
				<AlertCircle className="h-8 w-8 text-red-600" />
			</div>
			<div className="text-center space-y-2">
				<h3 className="font-semibold text-foreground">Failed to load analytics</h3>
				<p className="text-sm text-muted-foreground">
					There was an error loading the visitor data. Please try again.
				</p>
			</div>
			{onRefresh && (
				<Button 
					variant="outline" 
					onClick={onRefresh}
					className="mt-4"
				>
					<RefreshCw className="h-4 w-4 mr-2" />
					Retry
				</Button>
			)}
		</div>
	)
}

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
	className,
	isLoading = false,
	isError = false,
	onRefresh,
	onTimeRangeChange,
	title = 'Visitor Analytics',
	subtitle
}: VisitorAnalyticsChartProps) {
	const [selectedRange, setSelectedRange] = React.useState(timeRange)
	const [isRefreshing, setIsRefreshing] = React.useState(false)

	const chartData = React.useMemo(() => {
		// If external data is provided, filter it by time range
		if (externalData && externalData.length > 0) {
			return filterDataByTimeRange(externalData, selectedRange)
		}
		
		// Otherwise generate realistic mock data
		return generateVisitorData(selectedRange)
	}, [selectedRange, externalData])

	const analytics = React.useMemo(() => calculateAnalytics(chartData), [chartData])

	const timeRangeLabel = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days', 
		'90d': 'Last 90 days'
	}[selectedRange]

	const handleRangeChange = (newRange: '7d' | '30d' | '90d') => {
		setSelectedRange(newRange)
		onTimeRangeChange?.(newRange)
	}

	const handleRefresh = async () => {
		if (!onRefresh) return
		
		setIsRefreshing(true)
		try {
			await onRefresh()
		} finally {
			setIsRefreshing(false)
		}
	}

	return (
		<Card 
			className={cn(
				cardClasses('elevated'),
				'shadow-xl hover:shadow-2xl border-2 border-primary/10',
				'bg-gradient-to-br from-background via-muted/5 to-background',
				animationClasses('fade-in'),
				className
			)}
			style={{ 
				transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`,
			}}
		>
			{/* Show loading skeleton or error state */}
			{isLoading ? (
				<ChartLoadingSkeleton />
			) : isError ? (
				<ChartErrorState onRefresh={onRefresh} />
			) : (
				<>
					<CardHeader 
						className={cn(
							'flex flex-col space-y-4 pb-6',
							animationClasses('slide-down')
						)}
					>
						{/* Title and Controls Row */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
									<BarChart3 className="size-6 text-primary" />
								</div>
								<div className="space-y-1">
									<CardTitle 
										className="tracking-tight font-bold text-foreground"
										style={{
											fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
											lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
											fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
										}}
									>
										{title}
									</CardTitle>
									<CardDescription className="leading-relaxed" style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize }}>
										{subtitle || `${timeRangeLabel} • ${analytics?.total.toLocaleString() || '0'} total visitors`}
									</CardDescription>
								</div>
							</div>
							
							{/* Controls */}
							<div className="flex items-center gap-3">
								{/* View Details Button */}
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										buttonClasses('ghost', 'sm'),
										"h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600",
										"dark:hover:bg-blue-900/20 dark:hover:text-blue-400",
										"focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1"
									)}
									title="View detailed analytics"
									style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
								>
									<Eye className="h-4 w-4" />
								</Button>

								{/* Time Range Selector */}
								<div className="flex items-center bg-muted/30 rounded-lg p-1 border">
									{(['7d', '30d', '90d'] as const).map((range) => (
										<Button
											key={range}
											variant={selectedRange === range ? 'default' : 'ghost'}
											size="sm"
											onClick={() => handleRangeChange(range)}
											className={cn(
												buttonClasses('ghost', 'sm'),
												"h-8 px-3 text-xs font-medium",
												selectedRange === range
													? "bg-primary text-primary-foreground shadow-sm"
													: "text-muted-foreground hover:text-foreground"
											)}
											style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
										>
											{range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
										</Button>
									))}
								</div>
								
								{/* Refresh Button */}
								{onRefresh && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleRefresh}
										disabled={isRefreshing}
										className={cn(
											buttonClasses('outline', 'sm'),
											"h-8 px-3 border-2"
										)}
										style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
									>
										{isRefreshing ? (
											<Loader2 className="size-3 animate-spin" />
										) : (
											<RefreshCw className="size-3" />
										)}
									</Button>
								)}
							</div>
						</div>

						{/* Trend Indicator */}
						{analytics && (
							<div className="flex items-center justify-center">
								<Badge 
									variant="outline"
									className={cn(
										badgeClasses(analytics.isIncreasing ? 'success' : 'destructive'),
										"px-4 py-2 font-semibold border-2",
										analytics.isIncreasing 
											? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
											: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
									)}
									style={{ transition: `all ${ANIMATION_DURATIONS.fast} ease-out` }}
								>
									{analytics.isIncreasing ? (
										<TrendingUp className="size-4 mr-2" />
									) : (
										<TrendingDown className="size-4 mr-2" />
									)}
									{analytics.trendPercentage.toFixed(1)}% {analytics.isIncreasing ? 'increase' : 'decrease'} vs previous period
								</Badge>
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
						className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-8 bg-gradient-to-r from-muted/20 via-background to-muted/20 border-b-2 border-muted/30"
						style={{ 
							animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
						}}
					>
						<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-2xl border border-muted/40 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-center mb-3">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
									<Activity className="size-5 text-blue-600" />
								</div>
							</div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Daily</p>
							<p 
								className="font-black text-foreground tabular-nums mt-1"
								style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize }}
							>
								{analytics.average.toLocaleString()}
							</p>
						</div>
						<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-2xl border border-muted/40 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-center mb-3">
								<div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
									<TrendingUp className="size-5 text-green-600" />
								</div>
							</div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peak Day</p>
							<p 
								className="font-black text-green-600 tabular-nums mt-1"
								style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize }}
							>
								{analytics.max.toLocaleString()}
							</p>
						</div>
						<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-2xl border border-muted/40 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-center mb-3">
								<div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
									<TrendingDown className="size-5 text-orange-600" />
								</div>
							</div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lowest Day</p>
							<p 
								className="font-black text-orange-600 tabular-nums mt-1"
								style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize }}
							>
								{analytics.min.toLocaleString()}
							</p>
						</div>
						<div className="text-center p-4 bg-white/50 dark:bg-gray-900/20 rounded-2xl border border-muted/40 hover:shadow-md transition-shadow">
							<div className="flex items-center justify-center mb-3">
								<div className="p-2 bg-primary/20 rounded-lg">
									<Users className="size-5 text-primary" />
								</div>
							</div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Visitors</p>
							<p 
								className="font-black text-primary tabular-nums mt-1"
								style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize }}
							>
								{analytics.total.toLocaleString()}
							</p>
						</div>
					</div>
				)}
				<div className="p-8">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-primary rounded-full" />
							<span className="text-sm font-semibold text-muted-foreground">
								Daily Visitors
							</span>
						</div>
						<Badge 
							variant="outline" 
							className={cn(
								badgeClasses('secondary'),
								"text-xs font-medium"
							)}
						>
							<Calendar className="w-3 h-3 mr-1" />
							{timeRangeLabel}
						</Badge>
					</div>
					
					<ChartContainer
						config={chartConfig}
						className="h-[400px] w-full"
						style={{ 
							animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`,
						}}
					>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={chartData}
								margin={{
									top: 20,
									right: 30,
									left: 20,
									bottom: 20
								}}
							>
								<defs>
									<linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="hsl(var(--primary))"
											stopOpacity={0.9}
										/>
										<stop
											offset="50%"
											stopColor="hsl(var(--primary))"
											stopOpacity={0.4}
										/>
										<stop
											offset="95%"
											stopColor="hsl(var(--primary))"
											stopOpacity={0.05}
										/>
									</linearGradient>
									
									{/* Grid pattern */}
									<pattern id="gridPattern" patternUnits="userSpaceOnUse" width="20" height="20">
										<path
											d="M 20 0 L 0 0 0 20"
											fill="none"
											stroke="hsl(var(--muted-foreground))"
											strokeWidth="0.5"
											strokeOpacity="0.1"
										/>
									</pattern>
								</defs>
								
								<CartesianGrid 
									strokeDasharray="none" 
									stroke="url(#gridPattern)"
								/>
								
								<XAxis
									dataKey="date"
									tickLine={false}
									axisLine={false}
									tickMargin={16}
									tick={{ 
										fontSize: 12, 
										fill: 'hsl(var(--muted-foreground))',
										fontWeight: 500
									}}
									tickFormatter={value => {
										const date = new Date(value)
										return selectedRange === '7d' 
											? date.toLocaleDateString('en-US', { weekday: 'short' })
											: date.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric'
											})
									}}
								/>
								
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={16}
									tick={{ 
										fontSize: 12, 
										fill: 'hsl(var(--muted-foreground))',
										fontWeight: 500
									}}
									tickFormatter={value => {
										if (value >= 1000) {
											return `${(value / 1000).toFixed(1)}k`
										}
										return value.toString()
									}}
								/>
								
								<ChartTooltip
									cursor={{
										stroke: 'hsl(var(--primary))',
										strokeWidth: 3,
										strokeDasharray: 'none',
										fill: 'hsl(var(--primary))',
										fillOpacity: 0.1
									}}
									content={
										<ChartTooltipContent
											labelFormatter={value => {
												return new Date(value).toLocaleDateString('en-US', {
													weekday: 'long',
													month: 'long',
													day: 'numeric',
													year: 'numeric'
												})
											}}
											formatter={(value) => [
												`${value.toLocaleString()} visitors`,
												'Visitors'
											]}
											indicator="dot"
											className="bg-background/98 backdrop-blur-sm border-2 border-primary/20 shadow-2xl rounded-xl p-4"
										/>
									}
								/>
								
								<Area
									type="monotone"
									dataKey="visitors"
									stroke="hsl(var(--primary))"
									strokeWidth={3}
									fillOpacity={1}
									fill="url(#fillVisitors)"
									dot={{
										r: 0,
									}}
									activeDot={{
										r: 8,
										fill: 'hsl(var(--primary))',
										strokeWidth: 3,
										stroke: 'hsl(var(--background))',
										style: {
											filter: 'drop-shadow(0 4px 8px hsla(var(--primary), 0.4))'
										}
									}}
									style={{
										filter: 'drop-shadow(0 4px 12px hsla(var(--primary), 0.2))'
									}}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</CardContent>
				</>
			)}
		</Card>
	)
}
