'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CHART_GRADIENTS, MOTION_DURATIONS, MOTION_EASINGS } from '@repo/shared'
import {
	BarChart3,
	// TrendingDown,
	DollarSign,
	// Calendar,
	Eye,
	EyeOff,
	// ArrowUpRight,
	// ArrowDownRight,
	Info,
	Target,
	TrendingUp,
	Zap
} from 'lucide-react'
import * as React from 'react'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ReferenceLine,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

// MOCK DATA - REALISTIC PROPERTY MANAGEMENT REVENUE

const revenueData = [
	{
		month: 'Jan 2024',
		rental: 45000,
		fees: 2800,
		deposits: 1200,
		other: 800,
		total: 49800,
		properties: 12,
		occupancy: 95,
		date: '2024-01'
	},
	{
		month: 'Feb 2024',
		rental: 47200,
		fees: 3100,
		deposits: 1800,
		other: 600,
		total: 52700,
		properties: 12,
		occupancy: 97,
		date: '2024-02'
	},
	{
		month: 'Mar 2024',
		rental: 48500,
		fees: 2900,
		deposits: 2200,
		other: 1100,
		total: 54700,
		properties: 13,
		occupancy: 98,
		date: '2024-03'
	},
	{
		month: 'Apr 2024',
		rental: 46800,
		fees: 2600,
		deposits: 1600,
		other: 900,
		total: 51900,
		properties: 13,
		occupancy: 92,
		date: '2024-04'
	},
	{
		month: 'May 2024',
		rental: 49200,
		fees: 3200,
		deposits: 2800,
		other: 1200,
		total: 56400,
		properties: 14,
		occupancy: 96,
		date: '2024-05'
	},
	{
		month: 'Jun 2024',
		rental: 51500,
		fees: 3400,
		deposits: 2100,
		other: 1400,
		total: 58400,
		properties: 14,
		occupancy: 99,
		date: '2024-06'
	},
	{
		month: 'Jul 2024',
		rental: 52800,
		fees: 3600,
		deposits: 1900,
		other: 1100,
		total: 59400,
		properties: 15,
		occupancy: 97,
		date: '2024-07'
	},
	{
		month: 'Aug 2024',
		rental: 54100,
		fees: 3800,
		deposits: 3200,
		other: 1600,
		total: 62700,
		properties: 15,
		occupancy: 98,
		date: '2024-08'
	},
	{
		month: 'Sep 2024',
		rental: 53200,
		fees: 3500,
		deposits: 2600,
		other: 1300,
		total: 60600,
		properties: 16,
		occupancy: 94,
		date: '2024-09'
	},
	{
		month: 'Oct 2024',
		rental: 55600,
		fees: 4100,
		deposits: 2900,
		other: 1800,
		total: 64400,
		properties: 16,
		occupancy: 99,
		date: '2024-10'
	},
	{
		month: 'Nov 2024',
		rental: 57200,
		fees: 4300,
		deposits: 3100,
		other: 2000,
		total: 66600,
		properties: 17,
		occupancy: 98,
		date: '2024-11'
	},
	{
		month: 'Dec 2024',
		rental: 58900,
		fees: 4600,
		deposits: 2800,
		other: 2200,
		total: 68500,
		properties: 17,
		occupancy: 100,
		date: '2024-12'
	}
]

// ANALYTICS CALCULATIONS - HIDDEN INSIGHTS

const calculateAnalytics = (data: typeof revenueData) => {
	if (data.length < 2) return null

	const currentMonth = data[data.length - 1]
	const previousMonth = data[data.length - 2]
	const yearStart = data[0]

	if (!currentMonth || !previousMonth || !yearStart) return null

	const monthlyGrowth =
		((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
	const yearlyGrowth =
		((currentMonth.total - yearStart.total) / yearStart.total) * 100

	const totalRevenue = data.reduce((sum, month) => sum + month.total, 0)
	const avgMonthlyRevenue = totalRevenue / data.length

	const bestMonth = data.reduce((max, month) =>
		month && max && month.total > max.total ? month : max
	)

	const growthTrend = data
		.map((month, index) => {
			if (index === 0) return 0
			const prevMonth = data[index - 1]
			if (!prevMonth || prevMonth.total === 0) return 0
			return ((month.total - prevMonth.total) / prevMonth.total) * 100
		})
		.slice(1)

	const avgGrowthRate =
		growthTrend.reduce((sum, rate) => sum + rate, 0) / growthTrend.length
	const volatility = Math.sqrt(
		growthTrend.reduce(
			(sum, rate) => sum + Math.pow(rate - avgGrowthRate, 2),
			0
		) / growthTrend.length
	)

	return {
		monthlyGrowth,
		yearlyGrowth,
		totalRevenue,
		avgMonthlyRevenue,
		bestMonth,
		avgGrowthRate,
		volatility,
		revenueStreams: {
			rental:
				currentMonth.total > 0
					? (currentMonth.rental / currentMonth.total) * 100
					: 0,
			fees:
				currentMonth.total > 0
					? (currentMonth.fees / currentMonth.total) * 100
					: 0,
			deposits:
				currentMonth.total > 0
					? (currentMonth.deposits / currentMonth.total) * 100
					: 0,
			other:
				currentMonth.total > 0
					? (currentMonth.other / currentMonth.total) * 100
					: 0
		}
	}
}

// CUSTOM TOOLTIP WITH HIDDEN INSIGHTS

const CustomTooltip = ({
	active,
	payload,
	label
}: {
	active?: boolean
	payload?: Array<{
		value: number
		payload: {
			month: string
			revenue: number
			predictedRevenue: number
			monthlyGrowth?: string
			targetRevenue?: number
			occupancy?: number
			total?: number
			rental?: number
			fees?: number
			deposits?: number
			other?: number
			properties?: number
		}
	}>
	label?: string
}) => {
	if (!active || !payload || !payload.length) return null

	const data = payload[0]?.payload

	if (!data) return null

	return (
		<div className="bg-background/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl rounded-xl p-4 min-w-[280px]">
			<div className="flex items-center justify-between mb-3">
				<p className="font-semibold text-foreground">{label}</p>
				<Badge
					variant="outline"
					className="text-xs text-primary border-primary/40"
				>
					{data.occupancy}% Occupied
				</Badge>
			</div>

			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">Total Revenue</span>
					<span className="font-bold text-lg">
						${(data.total ?? 0).toLocaleString()}
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-primary" />
						<span>Rent: ${(data.rental ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-primary/80" />
						<span>Fees: ${(data.fees ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-primary/60" />
						<span>Deposits: ${(data.deposits ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 rounded-full bg-accent" />
						<span>Other: ${(data.other ?? 0).toLocaleString()}</span>
					</div>
				</div>

				<div className="pt-2 border-t border-border">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>{data.properties} Properties</span>
						<span>Click to explore details</span>
					</div>
				</div>
			</div>
		</div>
	)
}

// MAIN COMPONENT

export function RevenueTrendChart() {
	const [timeRange, setTimeRange] = React.useState('12m')
	const [showInsights, setShowInsights] = React.useState(false)
	const [showBreakdown, setShowBreakdown] = React.useState(true)

	const analytics = React.useMemo(() => calculateAnalytics(revenueData), [])

	const filteredData = React.useMemo(() => {
		const months =
			{
				'3m': 3,
				'6m': 6,
				'12m': 12
			}[timeRange] || 12

		return revenueData.slice(-months)
	}, [timeRange])

	return (
		<Card
			className={cn(
				'shadow-xl hover:shadow-2xl border-2 border-primary/10',
				'bg-gradient-to-br from-background via-muted/5 to-background',
				'transition-all duration-300 ease-out',
				'group'
			)}
		>
			<CardHeader>
				<div className="flex flex-col space-y-4">
					{/* Header with controls */}
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<div
								className="p-3 rounded-xl transition-all duration-200"
								style={{
									background: CHART_GRADIENTS.revenue,
									transition: `all ${MOTION_DURATIONS['duration-fast']} ${MOTION_EASINGS['ease-out-expo']}`
								}}
							>
								<DollarSign className="w-6 h-6 text-primary" />
							</div>

							<div className="space-y-1">
								<CardTitle className="text-2xl font-bold tracking-tight">
									Revenue Analytics
								</CardTitle>
								<CardDescription className="text-base">
									${analytics?.totalRevenue.toLocaleString() || '0'} total •{' '}
									{analytics?.avgGrowthRate.toFixed(1) || '0'}% avg growth
								</CardDescription>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowInsights(!showInsights)}
								className={cn(
									'h-8 w-8 p-0 transition-all duration-200',
									showInsights && 'bg-primary/10 text-primary'
								)}
								style={{
									transition: `all ${MOTION_DURATIONS['duration-fast']} ${MOTION_EASINGS['ease-out-expo']}`
								}}
							>
								{showInsights ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</Button>

							<Select value={timeRange} onValueChange={setTimeRange}>
								<SelectTrigger className="w-24 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="3m">3M</SelectItem>
									<SelectItem value="6m">6M</SelectItem>
									<SelectItem value="12m">12M</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Hidden insights panel */}
					{showInsights && analytics && (
						<div
							className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl transition-all duration-300"
							style={{
								background: CHART_GRADIENTS.glass,
								border: '1px solid var(--color-system-blue-25)',
								animation: `slideInFromTop 300ms ${MOTION_EASINGS['ease-out-expo']}`
							}}
						>
							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-green-25)'
										}}
									>
										<TrendingUp className="w-4 h-4 text-primary" />
									</div>
								</div>
								<p className="text-lg font-bold text-primary">
									{analytics.monthlyGrowth > 0 ? '+' : ''}
									{analytics.monthlyGrowth.toFixed(1)}%
								</p>
								<p className="text-xs text-muted-foreground">Monthly Growth</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-blue-25)'
										}}
									>
										<Target className="w-4 h-4 text-primary" />
									</div>
								</div>
								<p className="text-lg font-bold text-primary">
									${analytics.avgMonthlyRevenue.toLocaleString()}
								</p>
								<p className="text-xs text-muted-foreground">Monthly Avg</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-orange-25)'
										}}
									>
										<Zap className="w-4 h-4 text-primary" />
									</div>
								</div>
								<p className="text-lg font-bold text-primary">
									{analytics.volatility.toFixed(1)}%
								</p>
								<p className="text-xs text-muted-foreground">Volatility</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-orange-25)'
										}}
									>
										<BarChart3 className="w-4 h-4 text-accent" />
									</div>
								</div>
								<p className="text-lg font-bold text-accent">
									{analytics.bestMonth?.month.split(' ')[0] || 'N/A'}
								</p>
								<p className="text-xs text-muted-foreground">Best Month</p>
							</div>
						</div>
					)}

					{/* Revenue breakdown legend */}
					{showBreakdown && analytics && (
						<div className="flex flex-wrap items-center gap-6">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary" />
								<span className="text-sm font-medium">Rental Income</span>
								<span className="text-xs text-muted-foreground">
									{analytics.revenueStreams.rental.toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary/80" />
								<span className="text-sm font-medium">Fees</span>
								<span className="text-xs text-muted-foreground">
									{analytics.revenueStreams.fees.toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary/60" />
								<span className="text-sm font-medium">Deposits</span>
								<span className="text-xs text-muted-foreground">
									{analytics.revenueStreams.deposits.toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-accent" />
								<span className="text-sm font-medium">Other</span>
								<span className="text-xs text-muted-foreground">
									{analytics.revenueStreams.other.toFixed(0)}%
								</span>
							</div>

							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowBreakdown(!showBreakdown)}
								className="h-6 px-2 text-xs ml-auto"
							>
								<Info className="w-3 h-3 mr-1" />
								{showBreakdown ? 'Hide' : 'Show'} Breakdown
							</Button>
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent className="px-6 pt-6">
				<div className="h-[400px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart
							data={filteredData}
							margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
						>
							<defs>
								<linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="hsl(var(--primary))"
										stopOpacity={0.8}
									/>
									<stop
										offset="50%"
										stopColor="hsl(var(--primary))"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--primary))"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient id="rentalGradient" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="hsl(var(--primary))"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--primary))"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient id="gradientFees" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="hsl(var(--primary)/0.8)"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--primary)/0.8)"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient
									id="depositsGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor="hsl(var(--accent))"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="hsl(var(--accent))"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>

							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--color-system-gray-50)"
							/>

							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 12, fill: 'var(--color-system-gray)' }}
								tickFormatter={(value: string) => value.split(' ')[0] || ''}
							/>

							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{ fontSize: 12, fill: 'var(--color-system-gray)' }}
								tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
							/>

							<Tooltip content={<CustomTooltip />} />

							{showBreakdown ? (
								<>
									<Area
										dataKey="other"
										stackId="1"
										stroke="hsl(var(--accent))"
										fill="url(#depositsGradient)"
										strokeWidth={2}
									/>
									<Area
										dataKey="deposits"
										stackId="1"
										stroke="hsl(var(--accent))"
										fill="url(#depositsGradient)"
										strokeWidth={2}
									/>
									<Area
										dataKey="fees"
										stackId="1"
										stroke="hsl(var(--primary)/0.8)"
										fill="url(#gradientFees)"
										strokeWidth={2}
									/>
									<Area
										dataKey="rental"
										stackId="1"
										stroke="hsl(var(--primary))"
										fill="url(#rentalGradient)"
										strokeWidth={2}
									/>
								</>
							) : (
								<Area
									dataKey="total"
									stroke="hsl(var(--primary))"
									fill="url(#totalGradient)"
									strokeWidth={3}
									dot={{ r: 0 }}
									activeDot={{
										r: 6,
										fill: 'hsl(var(--primary))',
										stroke: 'hsl(var(--background))',
										strokeWidth: 2
									}}
								/>
							)}

							<ReferenceLine
								y={analytics?.avgMonthlyRevenue || 0}
								stroke="var(--color-system-gray)"
								strokeDasharray="5 5"
								label={{ value: 'Avg' }}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	)
}
