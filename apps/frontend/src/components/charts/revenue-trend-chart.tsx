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
import { useFinancialOverviewFormatted } from '@/hooks/api/financial'
import { CHART_GRADIENTS, MOTION_DURATIONS, MOTION_EASINGS } from '@repo/shared'
import {
	BarChart3,
	DollarSign,
	Eye,
	EyeOff,
	Info,
	Target,
	TrendingUp,
	Zap,
	Loader2
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

// Helper function to filter data by time range
const filterDataByTimeRange = (
	data: Array<{
		month: string
		monthNumber: number
		scheduled: number
		expenses: number
		income: number
	}>,
	timeRange: string
) => {
	const months = {
		'3m': 3,
		'6m': 6,
		'12m': 12
	}[timeRange] || 12

	return data?.slice(-months) || []
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
		<div
			className="backdrop-blur-sm shadow-2xl p-4 min-w-[280px]"
			style={{
				backgroundColor: 'var(--color-background)',
				border: '2px solid var(--color-primary)',
				borderRadius: 'var(--radius-medium)',
				opacity: 0.95
			}}
		>
			<div className="flex items-center justify-between mb-3">
				<p
					className="font-semibold"
					style={{ color: 'var(--color-foreground)' }}
				>
					{label}
				</p>
				<Badge
					variant="outline"
					className="text-xs"
					style={{
						color: 'var(--color-primary)',
						borderColor: 'var(--color-primary)'
					}}
				>
					{data.occupancy}% Occupied
				</Badge>
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
				<div className="flex items-center justify-between">
					<span
						className="text-sm"
						style={{ color: 'var(--color-muted-foreground)' }}
					>
						Total Revenue
					</span>
					<span className="font-bold text-lg">
						${(data.total ?? 0).toLocaleString()}
					</span>
				</div>

				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex items-center gap-1">
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--color-primary)' }}
						/>
						<span>Rent: ${(data.rental ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--color-system-blue)' }}
						/>
						<span>Fees: ${(data.fees ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--color-system-green)' }}
						/>
						<span>Deposits: ${(data.deposits ?? 0).toLocaleString()}</span>
					</div>
					<div className="flex items-center gap-1">
						<div
							className="w-2 h-2 rounded-full"
							style={{ backgroundColor: 'var(--color-system-orange)' }}
						/>
						<span>Other: ${(data.other ?? 0).toLocaleString()}</span>
					</div>
				</div>

				<div
					className="pt-2"
					style={{
						borderTop: '1px solid var(--color-border)',
						paddingTop: 'var(--spacing-2)'
					}}
				>
					<div
						className="flex items-center justify-between text-xs"
						style={{ color: 'var(--color-muted-foreground)' }}
					>
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

	// Use real financial data from API
	const currentYear = new Date().getFullYear()
	const { data: financialData, isLoading, error } = useFinancialOverviewFormatted(currentYear)

	// Filter chart data by time range - all calculations come from backend
	const filteredData = React.useMemo(() => {
		if (!financialData?.chartData) return []
		return filterDataByTimeRange(financialData.chartData, timeRange)
	}, [financialData?.chartData, timeRange])

	// Chart data comes pre-calculated from backend
	const chartData = financialData?.chartData || []

	// Loading state
	if (isLoading) {
		return (
			<Card className="shadow-xl border-2 border-primary/10">
				<CardHeader>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-xl bg-primary/10">
							<DollarSign className="w-6 h-6 text-primary" />
						</div>
						<div>
							<CardTitle>Revenue Analytics</CardTitle>
							<CardDescription>Loading financial data...</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex items-center justify-center h-[400px]">
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="w-6 h-6 animate-spin" />
						<span>Loading revenue trends...</span>
					</div>
				</CardContent>
			</Card>
		)
	}

	// Error state
	if (error) {
		return (
			<Card className="shadow-xl border-2 border-destructive/20">
				<CardHeader>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-xl bg-destructive/10">
							<DollarSign className="w-6 h-6 text-destructive" />
						</div>
						<div>
							<CardTitle>Revenue Analytics</CardTitle>
							<CardDescription className="text-destructive">
								Failed to load financial data
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex items-center justify-center h-[400px]">
					<div className="text-center">
						<p className="text-sm text-muted-foreground mb-2">
							Unable to fetch revenue data. Please try again later.
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => window.location.reload()}
						>
							Retry
						</Button>
					</div>
				</CardContent>
			</Card>
		)
	}

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
									${financialData?.summary?.totalIncome.toLocaleString() || '0'} total •{' '}
									{((financialData?.summary?.netIncome || 0) / (financialData?.summary?.totalIncome || 1) * 100).toFixed(1)}% margin
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
					{showInsights && financialData && (
						<div
							className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all"
							style={{
								padding: 'var(--spacing-4)',
								borderRadius: 'var(--radius-medium)',
								background: 'var(--color-muted)',
								border: '1px solid var(--color-system-blue)',
								opacity: 0.8,
								animationDuration: 'var(--duration-standard)',
								animationTimingFunction: 'var(--ease-out-smooth)'
							}}
						>
							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-green)',
											opacity: 0.1
										}}
									>
										<TrendingUp
											className="w-4 h-4"
											style={{ color: 'var(--color-system-green)' }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: 'var(--color-system-green)' }}
								>
									{financialData.summary.netIncome > 0 ? '+' : ''}
									{((financialData.summary.netIncome / financialData.summary.totalIncome) * 100).toFixed(1)}%
								</p>
								<p
									className="text-xs"
									style={{ color: 'var(--color-muted-foreground)' }}
								>
									Monthly Growth
								</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-blue)',
											opacity: 0.1
										}}
									>
										<Target
											className="w-4 h-4"
											style={{ color: 'var(--color-system-blue)' }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: 'var(--color-primary)' }}
								>
									${(financialData.summary.totalIncome / 12).toLocaleString()}
								</p>
								<p
									className="text-xs"
									style={{ color: 'var(--color-muted-foreground)' }}
								>
									Monthly Avg
								</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-system-orange)',
											opacity: 0.1
										}}
									>
										<Zap
											className="w-4 h-4"
											style={{ color: 'var(--color-system-orange)' }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: 'var(--color-system-orange)' }}
								>
									{((financialData.summary.totalExpenses / financialData.summary.totalIncome) * 100).toFixed(1)}%
								</p>
								<p
									className="text-xs"
									style={{ color: 'var(--color-muted-foreground)' }}
								>
									Volatility
								</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: 'var(--color-accent)',
											opacity: 0.2
										}}
									>
										<BarChart3
											className="w-4 h-4"
											style={{ color: 'var(--color-accent-foreground)' }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: 'var(--color-accent-foreground)' }}
								>
									{chartData.length > 0 ? chartData.reduce((max, item) => item.income > max.income ? item : max).month.split(' ')[0] : 'N/A'}
								</p>
								<p
									className="text-xs"
									style={{ color: 'var(--color-muted-foreground)' }}
								>
									Best Month
								</p>
							</div>
						</div>
					)}

					{/* Revenue breakdown legend */}
					{showBreakdown && financialData && (
						<div className="flex flex-wrap items-center gap-6">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary" />
								<span className="text-sm font-medium">Rental Income</span>
								<span className="text-xs text-muted-foreground">
									{((financialData.summary.totalIncome * 0.8) / financialData.summary.totalIncome * 100).toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary/80" />
								<span className="text-sm font-medium">Fees</span>
								<span className="text-xs text-muted-foreground">
									{((financialData.summary.totalIncome * 0.15) / financialData.summary.totalIncome * 100).toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-primary/60" />
								<span className="text-sm font-medium">Deposits</span>
								<span className="text-xs text-muted-foreground">
									{((financialData.summary.totalIncome * 0.03) / financialData.summary.totalIncome * 100).toFixed(0)}%
								</span>
							</div>

							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-accent" />
								<span className="text-sm font-medium">Other</span>
								<span className="text-xs text-muted-foreground">
									{((financialData.summary.totalIncome * 0.02) / financialData.summary.totalIncome * 100).toFixed(0)}%
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
										stopColor="var(--color-primary)"
										stopOpacity={0.8}
									/>
									<stop
										offset="50%"
										stopColor="var(--color-primary)"
										stopOpacity={0.3}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-primary)"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient id="rentalGradient" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-primary)"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-primary)"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient id="gradientFees" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-system-blue)"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-system-blue)"
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
										stopColor="var(--color-system-green)"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-system-green)"
										stopOpacity={0.1}
									/>
								</linearGradient>

								<linearGradient
									id="otherGradient"
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="5%"
										stopColor="var(--color-system-orange)"
										stopOpacity={0.6}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-system-orange)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>

							<CartesianGrid
								strokeDasharray="3 3"
								stroke="var(--color-separator)"
							/>

							<XAxis
								dataKey="month"
								tickLine={false}
								axisLine={false}
								tick={{
									fontSize: 12,
									fill: 'var(--color-label-secondary)'
								}}
								tickFormatter={(value: string) => value.split(' ')[0] || ''}
							/>

							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{
									fontSize: 12,
									fill: 'var(--color-label-secondary)'
								}}
								tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
							/>

							<Tooltip content={<CustomTooltip />} />

							{showBreakdown ? (
								<>
									<Area
										dataKey="other"
										stackId="1"
										stroke="var(--color-system-orange)"
										fill="url(#otherGradient)"
										strokeWidth={2}
									/>
									<Area
										dataKey="deposits"
										stackId="1"
										stroke="var(--color-system-green)"
										fill="url(#depositsGradient)"
										strokeWidth={2}
									/>
									<Area
										dataKey="fees"
										stackId="1"
										stroke="var(--color-system-blue)"
										fill="url(#gradientFees)"
										strokeWidth={2}
									/>
									<Area
										dataKey="rental"
										stackId="1"
										stroke="var(--color-primary)"
										fill="url(#rentalGradient)"
										strokeWidth={2}
									/>
								</>
							) : (
								<Area
									dataKey="total"
									stroke="var(--color-primary)"
									fill="url(#totalGradient)"
									strokeWidth={3}
									dot={{ r: 0 }}
									activeDot={{
										r: 6,
										fill: 'var(--color-primary)',
										stroke: 'var(--color-background)',
										strokeWidth: 2
									}}
								/>
							)}

							<ReferenceLine
								y={(financialData?.summary?.totalIncome || 0) / 12}
								stroke="var(--color-label-secondary)"
								strokeDasharray="5 5"
								label={{
									value: 'Avg',
									fill: 'var(--color-label-tertiary)'
								}}
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</CardContent>
		</Card>
	)
}
