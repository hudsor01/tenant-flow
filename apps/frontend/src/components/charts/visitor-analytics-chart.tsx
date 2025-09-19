'use client'

import { usePropertiesFormatted } from '@/hooks/api/properties'
import {
	Eye,
	Home,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Users
} from 'lucide-react'
import * as React from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis
} from 'recharts'

import { cn } from '@/lib/utils'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from 'src/components/ui/card'
import type { ChartConfig } from 'src/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from 'src/components/ui/chart'
import { Skeleton } from 'src/components/ui/skeleton'

interface PropertyInterestDataPoint {
	date: string
	interest: number
	inquiries: number
	viewings: number
}

interface PropertyInterestAnalyticsChartProps {
	timeRange?: '7d' | '30d' | '90d'
	className?: string
}

const chartConfig = {
	interest: {
		label: 'Property Interest',
		color: 'hsl(var(--chart-1))'
	},
	inquiries: {
		label: 'Inquiries',
		color: 'hsl(var(--chart-2))'
	},
	viewings: {
		label: 'Viewings',
		color: 'hsl(var(--chart-3))'
	}
} as ChartConfig

function generatePropertyInterestData(
	_properties: unknown[] = [],
	timeRange: '7d' | '30d' | '90d' = '30d'
): PropertyInterestDataPoint[] {
	const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
	const baseInterest = Math.floor(Math.random() * 20) + 30

	return Array.from({ length: days }, (_, i) => {
		const date = new Date()
		date.setDate(date.getDate() - (days - 1 - i))

		const interest = Math.floor(baseInterest + Math.random() * 20 - 10)
		const inquiries = Math.floor(interest * (0.15 + Math.random() * 0.1))
		const viewings = Math.floor(inquiries * (0.3 + Math.random() * 0.2))

		return {
			date: date.toISOString().split('T')[0]!,
			interest: Math.max(0, interest),
			inquiries: Math.max(0, inquiries),
			viewings: Math.max(0, viewings)
		}
	})
}

function filterDataByRange(
	data: PropertyInterestDataPoint[],
	timeRange: '7d' | '30d' | '90d'
): PropertyInterestDataPoint[] {
	const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
	const cutoffDate = new Date()
	cutoffDate.setDate(cutoffDate.getDate() - days)

	return data
		.filter(item => new Date(item.date) >= cutoffDate)
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function calculateAnalytics(data: PropertyInterestDataPoint[]) {
	if (data.length === 0) return null

	const total = data.reduce(
		(sum, item) => ({
			interest: sum.interest + item.interest,
			inquiries: sum.inquiries + item.inquiries,
			viewings: sum.viewings + item.viewings
		}),
		{ interest: 0, inquiries: 0, viewings: 0 }
	)

	const average = Math.round(total.interest / data.length)
	const max = Math.max(...data.map(item => item.interest))
	const min = Math.min(...data.map(item => item.interest))

	const midPoint = Math.floor(data.length / 2)
	const firstHalf = data.slice(0, midPoint)
	const secondHalf = data.slice(midPoint)

	const firstHalfAvg =
		firstHalf.reduce((sum, item) => sum + item.interest, 0) / firstHalf.length
	const secondHalfAvg =
		secondHalf.reduce((sum, item) => sum + item.interest, 0) / secondHalf.length

	const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100
	const isIncreasing = trendPercentage > 0

	return {
		total,
		average,
		max,
		min,
		trendPercentage: Math.abs(trendPercentage),
		isIncreasing,
		totalInquiries: total.inquiries,
		totalViewings: total.viewings,
		inquiryRate:
			total.interest > 0
				? Math.round((total.inquiries / total.interest) * 100)
				: 0
	}
}

export function PropertyInterestAnalyticsChart({
	timeRange = '30d',
	className
}: PropertyInterestAnalyticsChartProps) {
	const { data: propertiesData, isPending: isLoading } =
		usePropertiesFormatted()
	const [selectedRange, setSelectedRange] = React.useState<
		'7d' | '30d' | '90d'
	>(timeRange)
	const [isRefreshing, setIsRefreshing] = React.useState(false)

	const chartData = React.useMemo(() => {
		return generatePropertyInterestData(
			propertiesData?.properties ?? [],
			selectedRange
		)
	}, [propertiesData?.properties, selectedRange])

	const analytics = React.useMemo(() => {
		const filteredData = filterDataByRange(chartData, selectedRange)
		return calculateAnalytics(filteredData)
	}, [chartData, selectedRange])

	const timeRangeLabels: Record<'7d' | '30d' | '90d', string> = {
		'7d': 'Last 7 days',
		'30d': 'Last 30 days',
		'90d': 'Last 90 days'
	}

	const handleRefresh = React.useCallback(async () => {
		setIsRefreshing(true)
		await new Promise(resolve => setTimeout(resolve, 1000))
		setIsRefreshing(false)
	}, [])

	const handleTimeRangeChange = React.useCallback(
		(range: '7d' | '30d' | '90d') => {
			setSelectedRange(range)
		},
		[]
	)

	if (isLoading) {
		return (
			<Card className={cn('w-full', className)}>
				<CardHeader>
					<div className="space-y-2">
						<Skeleton className="h-4 w-[200px]" />
						<Skeleton className="h-3 w-[150px]" />
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-3 gap-4">
							{Array.from({ length: 3 }, (_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-8 w-full" />
									<Skeleton className="h-3 w-[80px]" />
								</div>
							))}
						</div>
						<Skeleton className="h-[300px] w-full" />
					</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={cn('w-full', className)}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
				<div className="space-y-1">
					<CardTitle className="text-base font-semibold">
						Property Interest Analytics
					</CardTitle>
					<CardDescription>
						Track property interest, inquiries, and viewings over time
					</CardDescription>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1 rounded-md border bg-background p-1">
						{(['7d', '30d', '90d'] as const).map(range => (
							<Button
								key={range}
								variant={selectedRange === range ? 'default' : 'ghost'}
								size="sm"
								className="h-7 px-3 text-xs"
								onClick={() => handleTimeRangeChange(range)}
							>
								{range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
							</Button>
						))}
					</div>

					<Button
						variant="outline"
						size="sm"
						className="h-8 w-8 p-0"
						onClick={handleRefresh}
						disabled={isRefreshing}
					>
						<RefreshCw
							className={cn('h-3 w-3', isRefreshing && 'animate-spin')}
						/>
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{analytics && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5 border">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
								<Eye className="h-4 w-4 text-primary" />
							</div>
							<div className="space-y-0.5">
								<p className="text-sm font-medium">Total Interest</p>
								<div className="flex items-center space-x-1">
									<span className="text-xl font-semibold">
										{analytics.total.interest}
									</span>
									<Badge
										variant={analytics.isIncreasing ? 'default' : 'secondary'}
										className="text-xs"
									>
										{analytics.isIncreasing ? (
											<TrendingUp className="w-3 h-3 mr-1" />
										) : (
											<TrendingDown className="w-3 h-3 mr-1" />
										)}
										{analytics.trendPercentage.toFixed(1)}%
									</Badge>
								</div>
							</div>
						</div>

						<div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
								<Users className="h-4 w-4 text-primary" />
							</div>
							<div className="space-y-0.5">
								<p className="text-sm font-medium">Total Inquiries</p>
								<div className="flex items-center space-x-1">
									<span className="text-xl font-semibold">
										{analytics.totalInquiries}
									</span>
									<span className="text-xs text-muted-foreground">
										({analytics.inquiryRate}% rate)
									</span>
								</div>
							</div>
						</div>

						<div className="flex items-center space-x-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
								<Home className="h-4 w-4 text-accent" />
							</div>
							<div className="space-y-0.5">
								<p className="text-sm font-medium">Total Viewings</p>
								<div className="flex items-center space-x-1">
									<span className="text-xl font-semibold">
										{analytics.totalViewings}
									</span>
									<span className="text-xs text-muted-foreground">
										(
										{analytics.totalInquiries > 0
											? Math.round(
													(analytics.totalViewings / analytics.totalInquiries) *
														100
												)
											: 0}
										% rate)
									</span>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-sm font-medium">Interest Timeline</h4>
						<p className="text-xs text-muted-foreground">
							{timeRangeLabels[selectedRange]}
						</p>
					</div>

					<ChartContainer config={chartConfig}>
						<ResponsiveContainer width="100%" height={300}>
							<AreaChart
								data={chartData}
								margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient
										id="colorInterest"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop
											offset="5%"
											stopColor="hsl(var(--chart-1))"
											stopOpacity={0.3}
										/>
										<stop
											offset="95%"
											stopColor="hsl(var(--chart-1))"
											stopOpacity={0}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
								<XAxis
									dataKey="date"
									axisLine={false}
									tickLine={false}
									tick={{ fontSize: 12 }}
									tickFormatter={value =>
										new Date(value).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric'
										})
									}
								/>
								<YAxis
									axisLine={false}
									tickLine={false}
									tick={{ fontSize: 12 }}
								/>
								<ChartTooltip
									content={<ChartTooltipContent />}
									labelFormatter={value =>
										new Date(value).toLocaleDateString('en-US', {
											weekday: 'short',
											month: 'short',
											day: 'numeric'
										})
									}
								/>
								<Area
									type="monotone"
									dataKey="interest"
									stroke="hsl(var(--chart-1))"
									fillOpacity={1}
									fill="url(#colorInterest)"
									strokeWidth={2}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>
			</CardContent>
		</Card>
	)
}

export { PropertyInterestAnalyticsChart as VisitorAnalyticsChart }
