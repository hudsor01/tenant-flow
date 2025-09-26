'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from '@/components/ui/chart'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import * as React from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis
} from 'recharts'

import { useIsMobile } from '@/hooks/use-mobile'
import {
	ANIMATION_DURATIONS,
	animationClasses,
	cardClasses,
	cn
} from '@/lib/utils'
import {
	Activity,
	BarChart3,
	Calendar,
	Eye,
	Monitor,
	RefreshCw,
	Smartphone,
	TrendingDown,
	TrendingUp,
	Users
} from 'lucide-react'

export const description = 'An interactive area chart'

const chartData = [
	{ date: '2024-04-01', desktop: 222, mobile: 150, tablet: 89, other: 45 },
	{ date: '2024-04-02', desktop: 97, mobile: 180, tablet: 120, other: 35 },
	{ date: '2024-04-03', desktop: 167, mobile: 120, tablet: 95, other: 28 },
	{ date: '2024-04-04', desktop: 242, mobile: 260, tablet: 140, other: 55 },
	{ date: '2024-04-05', desktop: 373, mobile: 290, tablet: 180, other: 70 },
	{ date: '2024-04-06', desktop: 301, mobile: 340, tablet: 210, other: 85 },
	{ date: '2024-04-07', desktop: 245, mobile: 180, tablet: 95, other: 40 },
	{ date: '2024-04-08', desktop: 409, mobile: 320, tablet: 165, other: 80 },
	{ date: '2024-04-09', desktop: 59, mobile: 110, tablet: 75, other: 20 },
	{ date: '2024-04-10', desktop: 261, mobile: 190, tablet: 125, other: 50 },
	{ date: '2024-04-11', desktop: 327, mobile: 350 },
	{ date: '2024-04-12', desktop: 292, mobile: 210 },
	{ date: '2024-04-13', desktop: 342, mobile: 380 },
	{ date: '2024-04-14', desktop: 137, mobile: 220 },
	{ date: '2024-04-15', desktop: 120, mobile: 170 },
	{ date: '2024-04-16', desktop: 138, mobile: 190 },
	{ date: '2024-04-17', desktop: 446, mobile: 360 },
	{ date: '2024-04-18', desktop: 364, mobile: 410 },
	{ date: '2024-04-19', desktop: 243, mobile: 180 },
	{ date: '2024-04-20', desktop: 89, mobile: 150 },
	{ date: '2024-04-21', desktop: 137, mobile: 200 },
	{ date: '2024-04-22', desktop: 224, mobile: 170 },
	{ date: '2024-04-23', desktop: 138, mobile: 230 },
	{ date: '2024-04-24', desktop: 387, mobile: 290 },
	{ date: '2024-04-25', desktop: 215, mobile: 250 },
	{ date: '2024-04-26', desktop: 75, mobile: 130 },
	{ date: '2024-04-27', desktop: 383, mobile: 420 },
	{ date: '2024-04-28', desktop: 122, mobile: 180 },
	{ date: '2024-04-29', desktop: 315, mobile: 240 },
	{ date: '2024-04-30', desktop: 454, mobile: 380 },
	{ date: '2024-05-01', desktop: 165, mobile: 220 },
	{ date: '2024-05-02', desktop: 293, mobile: 310 },
	{ date: '2024-05-03', desktop: 247, mobile: 190 },
	{ date: '2024-05-04', desktop: 385, mobile: 420 },
	{ date: '2024-05-05', desktop: 481, mobile: 390 },
	{ date: '2024-05-06', desktop: 498, mobile: 520 },
	{ date: '2024-05-07', desktop: 388, mobile: 300 },
	{ date: '2024-05-08', desktop: 149, mobile: 210 },
	{ date: '2024-05-09', desktop: 227, mobile: 180 },
	{ date: '2024-05-10', desktop: 293, mobile: 330 },
	{ date: '2024-05-11', desktop: 335, mobile: 270 },
	{ date: '2024-05-12', desktop: 197, mobile: 240 },
	{ date: '2024-05-13', desktop: 197, mobile: 160 },
	{ date: '2024-05-14', desktop: 448, mobile: 490 },
	{ date: '2024-05-15', desktop: 473, mobile: 380 },
	{ date: '2024-05-16', desktop: 338, mobile: 400 },
	{ date: '2024-05-17', desktop: 499, mobile: 420 },
	{ date: '2024-05-18', desktop: 315, mobile: 350 },
	{ date: '2024-05-19', desktop: 235, mobile: 180 },
	{ date: '2024-05-20', desktop: 177, mobile: 230 },
	{ date: '2024-05-21', desktop: 82, mobile: 140 },
	{ date: '2024-05-22', desktop: 81, mobile: 120 },
	{ date: '2024-05-23', desktop: 252, mobile: 290 },
	{ date: '2024-05-24', desktop: 294, mobile: 220 },
	{ date: '2024-05-25', desktop: 201, mobile: 250 },
	{ date: '2024-05-26', desktop: 213, mobile: 170 },
	{ date: '2024-05-27', desktop: 420, mobile: 460 },
	{ date: '2024-05-28', desktop: 233, mobile: 190 },
	{ date: '2024-05-29', desktop: 78, mobile: 130 },
	{ date: '2024-05-30', desktop: 340, mobile: 280 },
	{ date: '2024-05-31', desktop: 178, mobile: 230 },
	{ date: '2024-06-01', desktop: 178, mobile: 200 },
	{ date: '2024-06-02', desktop: 470, mobile: 410 },
	{ date: '2024-06-03', desktop: 103, mobile: 160 },
	{ date: '2024-06-04', desktop: 439, mobile: 380 },
	{ date: '2024-06-05', desktop: 88, mobile: 140 },
	{ date: '2024-06-06', desktop: 294, mobile: 250 },
	{ date: '2024-06-07', desktop: 323, mobile: 370 },
	{ date: '2024-06-08', desktop: 385, mobile: 320 },
	{ date: '2024-06-09', desktop: 438, mobile: 480 },
	{ date: '2024-06-10', desktop: 155, mobile: 200 },
	{ date: '2024-06-11', desktop: 92, mobile: 150 },
	{ date: '2024-06-12', desktop: 492, mobile: 420 },
	{ date: '2024-06-13', desktop: 81, mobile: 130 },
	{ date: '2024-06-14', desktop: 426, mobile: 380 },
	{ date: '2024-06-15', desktop: 307, mobile: 350 },
	{ date: '2024-06-16', desktop: 371, mobile: 310 },
	{ date: '2024-06-17', desktop: 475, mobile: 520 },
	{ date: '2024-06-18', desktop: 107, mobile: 170 },
	{ date: '2024-06-19', desktop: 341, mobile: 290 },
	{ date: '2024-06-20', desktop: 408, mobile: 450 },
	{ date: '2024-06-21', desktop: 169, mobile: 210 },
	{ date: '2024-06-22', desktop: 317, mobile: 270 },
	{ date: '2024-06-23', desktop: 480, mobile: 530 },
	{ date: '2024-06-24', desktop: 132, mobile: 180 },
	{ date: '2024-06-25', desktop: 141, mobile: 190 },
	{ date: '2024-06-26', desktop: 434, mobile: 380 },
	{ date: '2024-06-27', desktop: 448, mobile: 490 },
	{ date: '2024-06-28', desktop: 149, mobile: 200 },
	{ date: '2024-06-29', desktop: 103, mobile: 160 },
	{ date: '2024-06-30', desktop: 446, mobile: 400 }
]

const chartConfig = {
	visitors: {
		label: 'Visitors'
	},
	desktop: {
		label: 'Desktop',
		color: 'hsl(var(--primary))'
	},
	mobile: {
		label: 'Mobile',
		color: 'hsl(var(--secondary))'
	}
} satisfies ChartConfig

// Calculate analytics for the chart
function calculateChartAnalytics(data: typeof chartData) {
	if (!data.length) return null

	const totalDesktop = data.reduce((sum, item) => sum + (item.desktop || 0), 0)
	const totalMobile = data.reduce((sum, item) => sum + (item.mobile || 0), 0)
	const totalVisitors = totalDesktop + totalMobile

	const mobilePercentage =
		totalVisitors > 0 ? (totalMobile / totalVisitors) * 100 : 0
	const desktopPercentage =
		totalVisitors > 0 ? (totalDesktop / totalVisitors) * 100 : 0

	// Calculate trend (last 7 days vs previous 7 days for trend calculation)
	const midPoint = Math.floor(data.length / 2)
	const firstHalf = data.slice(0, midPoint)
	const secondHalf = data.slice(midPoint)

	const firstHalfTotal = firstHalf.reduce(
		(sum, item) => sum + (item.desktop || 0) + (item.mobile || 0),
		0
	)
	const secondHalfTotal = secondHalf.reduce(
		(sum, item) => sum + (item.desktop || 0) + (item.mobile || 0),
		0
	)

	const trendPercentage =
		firstHalfTotal > 0
			? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100
			: 0
	const isIncreasing = trendPercentage > 0

	return {
		totalVisitors,
		totalDesktop,
		totalMobile,
		mobilePercentage,
		desktopPercentage,
		trendPercentage: Math.abs(trendPercentage),
		isIncreasing,
		averageDaily: Math.round(totalVisitors / data.length),
		peakDay: Math.max(
			...data.map(item => (item.desktop || 0) + (item.mobile || 0))
		)
	}
}

type ChartAreaInteractiveProps = React.ComponentProps<'div'>

export const ChartAreaInteractive = React.forwardRef<
	HTMLDivElement,
	ChartAreaInteractiveProps
>(({ className, ...props }, ref) => {
	const isMobile = useIsMobile()
	const [timeRange, setTimeRange] = React.useState('90d')

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange('7d')
		}
	}, [isMobile])

	const filteredData = React.useMemo(() => {
		return chartData.filter(item => {
			const date = new Date(item.date)
			const referenceDate = new Date('2024-06-30')
			let daysToSubtract = 90
			if (timeRange === '30d') {
				daysToSubtract = 30
			} else if (timeRange === '7d') {
				daysToSubtract = 7
			}
			const startDate = new Date(referenceDate)
			startDate.setDate(startDate.getDate() - daysToSubtract)
			return date >= startDate
		})
	}, [timeRange])

	const analytics = React.useMemo(() => {
		return calculateChartAnalytics(filteredData)
	}, [filteredData])

	const timeRangeLabel = {
		'90d': 'Last 3 months',
		'30d': 'Last 30 days',
		'7d': 'Last 7 days'
	}[timeRange]

	return (
		<div
			ref={ref}
			className={cn(
				cardClasses('elevated'),
				'shadow-xl hover:shadow-2xl border-2 border-primary/10',
				'bg-gradient-to-br from-background via-muted/5 to-background',
				'touch-manipulation transform-gpu will-change-transform',
				animationClasses('fade-in'),
				'transition-fast',
				className
			)}
			style={{
				transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
			}}
			{...props}
		>
			<CardHeader className={animationClasses('slide-down')}>
				<div className="flex flex-col space-y-4">
					{/* Title and Controls Row */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
								<Activity className="size-6 text-primary" />
							</div>
							<div className="space-y-1">
								<CardTitle style={TYPOGRAPHY_SCALE['heading-xl']}>
									Visitor Analytics
								</CardTitle>
								<CardDescription style={TYPOGRAPHY_SCALE['body-lg']}>
									<span className="hidden sm:inline">
										{timeRangeLabel} •{' '}
										{analytics?.totalVisitors.toLocaleString() || '0'} total
										visitors
									</span>
									<span className="sm:hidden">
										{timeRangeLabel?.replace('Last ', '') || ''}
									</span>
								</CardDescription>
							</div>
						</div>

						{/* Controls */}
						<CardAction>
							<div className="flex items-center gap-2">
								{/* Refresh and View Options */}
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										className={cn(
											'h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary',
											'focus:ring-2 focus:ring-primary/20 focus:ring-offset-1',
											'transition-fast'
										)}
										onClick={() => window.location.reload()}
										title="Refresh data"
									>
										<RefreshCw className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										className={cn(
											'h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary',
											'focus:ring-2 focus:ring-primary/20 focus:ring-offset-1'
										)}
										title="View details"
									>
										<Eye className="h-4 w-4" />
									</Button>
								</div>
								{/* Desktop Toggle Group */}
								<ToggleGroup
									type="single"
									value={timeRange}
									onValueChange={setTimeRange}
									variant="outline"
									className="hidden lg:flex bg-muted/30 rounded-lg p-1 border"
								>
									<ToggleGroupItem
										value="90d"
										className={cn(
											'h-8 px-3 text-xs font-medium',
											timeRange === '90d'
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground'
										)}
									>
										3M
									</ToggleGroupItem>
									<ToggleGroupItem
										value="30d"
										className={cn(
											'h-8 px-3 text-xs font-medium',
											timeRange === '30d'
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground'
										)}
									>
										30D
									</ToggleGroupItem>
									<ToggleGroupItem
										value="7d"
										className={cn(
											'h-8 px-3 text-xs font-medium',
											timeRange === '7d'
												? 'bg-primary text-primary-foreground shadow-sm'
												: 'text-muted-foreground hover:text-foreground'
										)}
									>
										7D
									</ToggleGroupItem>
								</ToggleGroup>

								{/* Mobile Select */}
								<Select value={timeRange} onValueChange={setTimeRange}>
									<SelectTrigger
										className="flex w-32 lg:hidden border-2"
										size="sm"
										aria-label="Select time range"
									>
										<SelectValue placeholder="Last 3 months" />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="90d" className="rounded-lg">
											3 Months
										</SelectItem>
										<SelectItem value="30d" className="rounded-lg">
											30 Days
										</SelectItem>
										<SelectItem value="7d" className="rounded-lg">
											7 Days
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardAction>
					</div>

					{/* Enhanced Analytics Stats */}
					{analytics && (
						<div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
							<div className="text-center p-3 bg-background/50 rounded-xl border border-muted/40">
								<div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
									<Users className="size-4 text-primary" />
								</div>
								<p className="text-lg font-black text-foreground tabular-nums">
									{analytics.totalVisitors.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground font-medium">
									Total
								</p>
							</div>

							<div className="text-center p-3 bg-background/50 rounded-xl border border-muted/40">
								<div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
									<Monitor className="size-4 text-primary" />
								</div>
								<p className="text-lg font-black text-primary tabular-nums">
									{analytics.desktopPercentage.toFixed(0)}%
								</p>
								<p className="text-xs text-muted-foreground font-medium">
									Desktop
								</p>
							</div>

							<div className="text-center p-3 bg-background/50 rounded-xl border border-muted/40">
								<div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-2">
									<Smartphone className="size-4 text-primary" />
								</div>
								<p className="text-lg font-black text-primary tabular-nums">
									{analytics.mobilePercentage.toFixed(0)}%
								</p>
								<p className="text-xs text-muted-foreground font-medium">
									Mobile
								</p>
							</div>

							<div className="text-center p-3 bg-background/50 rounded-xl border border-muted/40">
								<div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center mx-auto mb-2">
									<BarChart3 className="size-4 text-accent" />
								</div>
								<p className="text-lg font-black text-accent tabular-nums">
									{analytics.averageDaily.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground font-medium">
									Daily Avg
								</p>
							</div>

							{/* Trend Badge */}
							<div className="flex items-center justify-center">
								<Badge
									variant="outline"
									className={cn(
										'px-3 py-2 font-semibold border-2',
										analytics.isIncreasing
											? 'bg-primary/10 text-primary border-primary/20'
											: 'bg-destructive/10 text-destructive border-destructive/20'
									)}
								>
									{analytics.isIncreasing ? (
										<TrendingUp className="size-3 mr-1" />
									) : (
										<TrendingDown className="size-3 mr-1" />
									)}
									{analytics.trendPercentage.toFixed(1)}%
								</Badge>
							</div>
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="px-4 pt-6 sm:px-8 sm:pt-8">
				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-primary rounded-full" />
							<span className="text-sm font-semibold text-muted-foreground">
								Desktop
							</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-secondary rounded-full" />
							<span className="text-sm font-semibold text-muted-foreground">
								Mobile
							</span>
						</div>
					</div>
					<Badge variant="outline" className="text-xs font-medium">
						<Calendar className="w-3 h-3 mr-1" />
						{timeRangeLabel}
					</Badge>
				</div>

				<ChartContainer
					config={chartConfig}
					className="h-[400px] w-full touch-manipulation overscroll-contain"
					style={{
						animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`
					}}
				>
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={filteredData}
							margin={{
								top: 20,
								right: 20,
								left: 20,
								bottom: 20
							}}
						>
							<defs>
								<linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
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
										stopOpacity={0.1}
									/>
								</linearGradient>
								<linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="hsl(var(--secondary))"
										stopOpacity={0.8}
									/>
									<stop
										offset="50%"
										stopColor="hsl(var(--secondary))"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--secondary))"
										stopOpacity={0.05}
									/>
								</linearGradient>

								{/* Grid pattern */}
								<pattern
									id="chartGridPattern"
									patternUnits="userSpaceOnUse"
									width="20"
									height="20"
								>
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
								stroke="url(#chartGridPattern)"
								vertical={false}
							/>

							<XAxis
								dataKey="date"
								tickLine={false}
								axisLine={false}
								tickMargin={16}
								minTickGap={isMobile ? 60 : 32}
								tick={{
									fontSize: 12,
									fill: 'hsl(var(--muted-foreground))',
									fontWeight: 500
								}}
								tickFormatter={value => {
									const date = new Date(value)
									return isMobile
										? date.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric'
											})
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
								tickFormatter={(value: number) => {
									if (value >= 1000) {
										return `${(value / 1000).toFixed(1)}k`
									}
									return value.toString()
								}}
							/>

							<ChartTooltip
								cursor={{
									stroke: 'hsl(var(--primary))',
									strokeWidth: 2,
									strokeDasharray: 'none',
									fill: 'hsl(var(--primary))',
									fillOpacity: 0.1
								}}
								position={isMobile ? { x: 10, y: 10 } : undefined}
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
										formatter={(value, name) => [
											`${value?.toLocaleString()} visitors`,
											name === 'desktop' ? 'Desktop' : 'Mobile'
										]}
										indicator="dot"
										className="bg-background/98 backdrop-blur-sm border-2 border-primary/20 shadow-2xl rounded-xl p-4"
									/>
								}
							/>

							{/* Mobile area (bottom layer) */}
							<Area
								dataKey="mobile"
								type="monotone"
								fill="url(#fillMobile)"
								stroke="hsl(var(--secondary))"
								strokeWidth={2}
								fillOpacity={1}
								stackId="a"
								dot={{ r: 0 }}
								activeDot={{
									r: 6,
									fill: 'hsl(var(--secondary))',
									strokeWidth: 2,
									stroke: 'hsl(var(--background))',
									style: {
										filter: 'drop-shadow(0 2px 4px hsla(var(--secondary), 0.4))'
									}
								}}
								style={{
									filter: 'drop-shadow(0 2px 8px hsla(var(--secondary), 0.2))'
								}}
							/>

							{/* Desktop area (top layer) */}
							<Area
								dataKey="desktop"
								type="monotone"
								fill="url(#fillDesktop)"
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								fillOpacity={1}
								stackId="a"
								dot={{ r: 0 }}
								activeDot={{
									r: 6,
									fill: 'hsl(var(--primary))',
									strokeWidth: 2,
									stroke: 'hsl(var(--background))',
									style: {
										filter: 'drop-shadow(0 2px 4px hsla(var(--primary), 0.4))'
									}
								}}
								style={{
									filter: 'drop-shadow(0 2px 8px hsla(var(--primary), 0.2))'
								}}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</ChartContainer>
			</CardContent>
		</div>
	)
})
ChartAreaInteractive.displayName = 'ChartAreaInteractive'
