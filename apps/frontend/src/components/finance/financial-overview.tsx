'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
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
import { Separator } from '@/components/ui/separator'
import {
	ArrowDownLeft,
	ArrowUpRight,
	CalendarCheck,
	DollarSign,
	TrendingDown,
	TrendingUp
} from 'lucide-react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	XAxis,
	YAxis
} from 'recharts'

import { useFinancialOverview } from '@/hooks/api/financial'
import {
	ANIMATION_DURATIONS,
	animationClasses,
	badgeClasses,
	buttonClasses,
	cardClasses,
	cn,
	formatCurrency,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { useMemo, useState } from 'react'

const chartConfig = {
	scheduled: {
		label: 'Scheduled',
		color: 'var(--chart-1)'
	},
	expenses: {
		label: 'Expenses',
		color: 'var(--chart-2)'
	},
	income: {
		label: 'Income',
		color: 'var(--chart-3)'
	}
} as ChartConfig

export function FinancialOverview() {
	const [selectedPeriod, setSelectedPeriod] = useState<string>('last-year')
	const [selectedYear, setSelectedYear] = useState<number>(
		new Date().getFullYear()
	)
	const {
		data: financialData,
		isLoading,
		error
	} = useFinancialOverview(selectedYear)

	// Memoized calculations for better performance
	const { chartData, summary, trends, metrics } = useMemo(() => {
		const defaultData = {
			chartData: [],
			summary: {
				totalIncome: 0,
				totalExpenses: 0,
				totalScheduled: 0,
				netIncome: 0
			},
			trends: { income: 0, expenses: 0, net: 0 },
			metrics: { avgMonthlyIncome: 0, avgMonthlyExpenses: 0, profitMargin: 0 }
		}

		if (!financialData?.chartData || financialData.chartData.length === 0) {
			return defaultData
		}

		const data = financialData.chartData
		const summaryData = financialData.summary

		// Calculate trends (comparing last 3 months to previous 3 months)
		const recentData = data.slice(-3)
		const previousData = data.slice(-6, -3)

		const recentAvgIncome =
			recentData.reduce((sum, item) => sum + item.income, 0) / recentData.length
		const previousAvgIncome =
			previousData.reduce((sum, item) => sum + item.income, 0) /
			previousData.length
		const incomeTrend =
			previousAvgIncome > 0
				? ((recentAvgIncome - previousAvgIncome) / previousAvgIncome) * 100
				: 0

		const recentAvgExpenses =
			recentData.reduce((sum, item) => sum + item.expenses, 0) /
			recentData.length
		const previousAvgExpenses =
			previousData.reduce((sum, item) => sum + item.expenses, 0) /
			previousData.length
		const expensesTrend =
			previousAvgExpenses > 0
				? ((recentAvgExpenses - previousAvgExpenses) / previousAvgExpenses) *
					100
				: 0

		const netTrend = incomeTrend - expensesTrend

		// Calculate metrics
		const avgMonthlyIncome = summaryData.totalIncome / 12
		const avgMonthlyExpenses = summaryData.totalExpenses / 12
		const profitMargin =
			summaryData.totalIncome > 0
				? ((summaryData.totalIncome - summaryData.totalExpenses) /
						summaryData.totalIncome) *
					100
				: 0

		return {
			chartData: data,
			summary: summaryData,
			trends: { income: incomeTrend, expenses: expensesTrend, net: netTrend },
			metrics: { avgMonthlyIncome, avgMonthlyExpenses, profitMargin }
		}
	}, [financialData])

	// Error state with user-friendly messaging
	if (error) {
		return (
			<Card className={cn(cardClasses('elevated'), 'shadow-xl border-2 bg-card/95')}>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<TrendingDown className="size-5" />
						Unable to Load Financial Data
					</CardTitle>
					<CardDescription>
						We encountered an issue loading your financial overview. Please try again.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={() => window.location.reload()}
						variant="outline"
						className="w-full"
					>
						Retry Loading
					</Button>
				</CardContent>
			</Card>
		)
	}

	// Loading state with enhanced skeleton
	if (isLoading) {
		return (
			<Card
				className={cn(
					cardClasses('elevated'),
					'shadow-xl border-2 backdrop-blur-sm bg-card/95 overflow-hidden',
					animationClasses('fade-in'),
					'transition-transform'
				)}
				style={{
					animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
				}}
				role="status"
				aria-label="Loading financial overview data"
			>
				<CardHeader className="space-y-4 pb-6">
					<div className="flex items-center justify-between">
						<div className="space-y-2">
							<CardTitle
								className="tracking-tight font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
									fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
								}}
							>
								Financial Overview
							</CardTitle>
							<CardDescription className="text-base leading-relaxed max-w-lg">
								Loading your financial data and insights...
							</CardDescription>
						</div>
						<div className="animate-pulse">
							<DollarSign className="size-8 text-muted-foreground" />
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{[1, 2, 3].map(i => (
							<div
								key={i}
								className={animationClasses('pulse')}
								style={{ animationDelay: `${i * 100}ms` }}
							>
								<div className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-muted/20 to-muted/10 border-2 border-muted/30 shadow-sm">
									<div className="size-14 bg-gradient-to-br from-muted to-muted/60 rounded-xl animate-pulse shadow-sm" />
									<div className="space-y-3 flex-1">
										<div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded-full w-20 animate-pulse" />
										<div className="h-6 bg-gradient-to-r from-muted to-muted/60 rounded-lg w-24 animate-pulse" />
										<div className="h-3 bg-gradient-to-r from-muted/70 to-muted/40 rounded-full w-16 animate-pulse" />
									</div>
								</div>
							</div>
						))}
					</div>
					<div className="h-80 bg-gradient-to-br from-muted/10 to-muted/5 rounded-2xl border-2 border-muted/20 animate-pulse shadow-inner" />
				</CardContent>
			</Card>
		)
	}

	// Enhanced main component with modern SaaS design
	return (
		<Card
			className={cn(
				cardClasses('elevated'),
				'dashboard-widget shadow-xl border-2 hover:shadow-2xl backdrop-blur-sm bg-card/95 overflow-hidden group',
				animationClasses('fade-in'),
				'transition-transform'
			)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
			}}
			role="region"
			aria-labelledby="financial-overview-title"
		>
			<CardHeader
				className="space-y-6 pb-8 bg-gradient-to-br from-background to-muted/20"
				style={{
					animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
								<DollarSign className="size-5 text-primary" />
							</div>
							<CardTitle
								id="financial-overview-title"
								className="tracking-tight font-bold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-xl'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-xl'].lineHeight,
									fontWeight: TYPOGRAPHY_SCALE['heading-xl'].fontWeight
								}}
							>
								Financial Overview
							</CardTitle>
						</div>
						<CardDescription className="leading-relaxed text-base max-w-2xl text-muted-foreground">
							Track your income, expenses, and scheduled amounts at a glance.
							Get insights into your financial performance and trends.
						</CardDescription>
					</div>
					<CardAction className="flex items-center gap-3">
						<Select
							value={selectedYear.toString()}
							onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
							aria-label="Select year for financial data"
						>
							<SelectTrigger className="w-auto min-w-[120px] transition-all shadow-sm hover:shadow-md bg-background border-2">
								<SelectValue placeholder="Select year" />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
									<SelectItem key={year} value={year.toString()}>{year}</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={selectedPeriod}
							onValueChange={setSelectedPeriod}
							aria-label="Select time period for financial data"
						>
							<SelectTrigger className="w-auto min-w-[160px] transition-all shadow-sm hover:shadow-md bg-background border-2">
								<SelectValue placeholder="Select period" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="last-year">Last Year</SelectItem>
								<SelectItem value="last-month">Last Month</SelectItem>
								<SelectItem value="ytd">Year to Date</SelectItem>
								<SelectItem value="last-quarter">Last Quarter</SelectItem>
							</SelectContent>
						</Select>
						{metrics.profitMargin !== 0 && (
							<Badge
								variant={metrics.profitMargin > 0 ? 'default' : 'destructive'}
								className={cn(
									badgeClasses(
										metrics.profitMargin > 0 ? 'success' : 'destructive',
										'sm'
									),
									'text-xs font-semibold px-3 py-1 animate-pulse',
									'transition-transform'
								)}
								style={{
									animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
								}}
							>
								<div
									className={cn(
										'size-2 rounded-full mr-2',
										metrics.profitMargin > 0 ? 'bg-primary' : 'bg-accent',
										'transition-transform'
									)}
								/>
								{metrics.profitMargin > 0 ? '+' : ''}
								{metrics.profitMargin.toFixed(1)}% margin
							</Badge>
						)}
					</CardAction>
				</div>
			</CardHeader>
			<CardContent
				className="space-y-8 px-8 pb-8"
				style={{
					animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				{/* Enhanced metric cards with trends and better accessibility */}
				<div
					className="grid grid-cols-1 lg:grid-cols-3 gap-6"
					role="group"
					aria-label="Financial metrics summary"
				>
					{/* Income Card */}
					<article
						className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 cursor-pointer transform hover:scale-[1.02]"
						style={{
							animation: `slideInFromLeft ${ANIMATION_DURATIONS.default} ease-out`,
							transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
						}}
						tabIndex={0}
						role="button"
						aria-label={`Total income: ${formatCurrency(summary.totalIncome)}${trends.income !== 0 ? `, trending ${trends.income > 0 ? 'up' : 'down'} by ${Math.abs(trends.income).toFixed(1)}%` : ''}`}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								// Add click behavior here if needed
							}
						}}
					>
						<div className="flex items-start justify-between p-6">
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className="flex size-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-sm group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 transition-all"
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
										}}
									>
										<ArrowDownLeft className="size-6 text-primary transition-transform group-hover:scale-110" />
									</div>
									<div>
										<p className="text-primary text-sm font-semibold uppercase tracking-wide">
											Total Income
										</p>
										{trends.income !== 0 && (
											<div className="flex items-center gap-1 mt-1">
												{trends.income > 0 ? (
													<TrendingUp className="size-3 text-primary" />
												) : (
													<TrendingDown className="size-3 text-primary" />
												)}
												<span className="text-xs text-primary font-medium">
													{trends.income > 0 ? '+' : ''}
													{trends.income.toFixed(1)}%
												</span>
											</div>
										)}
									</div>
								</div>
								<p className="font-bold tabular-nums text-3xl text-primary">
									{formatCurrency(summary.totalIncome)}
								</p>
								<p className="text-sm text-primary/80">
									Avg: {formatCurrency(metrics.avgMonthlyIncome)}/mo
								</p>
							</div>
						</div>
						<div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
					</article>

					{/* Expenses Card */}
					<article
						className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/5 to-accent/10 border-2 border-accent/20 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10 focus-within:ring-2 focus-within:ring-accent/20 focus-within:ring-offset-2 cursor-pointer transform hover:scale-[1.02]"
						style={{
							animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`,
							transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
						}}
						tabIndex={0}
						role="button"
						aria-label={`Total expenses: ${formatCurrency(summary.totalExpenses)}${trends.expenses !== 0 ? `, trending ${trends.expenses > 0 ? 'up' : 'down'} by ${Math.abs(trends.expenses).toFixed(1)}%` : ''}`}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								// Add click behavior here if needed
							}
						}}
					>
						<div className="flex items-start justify-between p-6">
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className="flex size-12 items-center justify-center rounded-xl bg-accent/20 border border-accent/30 shadow-sm group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 transition-all"
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
										}}
									>
										<ArrowUpRight className="size-6 text-accent transition-transform group-hover:scale-110" />
									</div>
									<div>
										<p className="text-accent text-sm font-semibold uppercase tracking-wide">
											Total Expenses
										</p>
										{trends.expenses !== 0 && (
											<div className="flex items-center gap-1 mt-1">
												{trends.expenses > 0 ? (
													<TrendingUp className="size-3 text-accent" />
												) : (
													<TrendingDown className="size-3 text-accent" />
												)}
												<span className="text-xs text-accent font-medium">
													{trends.expenses > 0 ? '+' : ''}
													{trends.expenses.toFixed(1)}%
												</span>
											</div>
										)}
									</div>
								</div>
								<p className="font-bold tabular-nums text-3xl text-accent">
									{formatCurrency(summary.totalExpenses)}
								</p>
								<p className="text-sm text-accent/80">
									Avg: {formatCurrency(metrics.avgMonthlyExpenses)}/mo
								</p>
							</div>
						</div>
						<div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
					</article>

					{/* Scheduled/Net Income Card */}
					<article
						className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 cursor-pointer transform hover:scale-[1.02]"
						style={{
							animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`,
							transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`
						}}
						tabIndex={0}
						role="button"
						aria-label={`Net income: ${formatCurrency(summary.netIncome)}${trends.net !== 0 ? `, trending ${trends.net > 0 ? 'up' : 'down'} by ${Math.abs(trends.net).toFixed(1)}%` : ''}`}
						onKeyDown={e => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								// Add click behavior here if needed
							}
						}}
					>
						<div className="flex items-start justify-between p-6">
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<div
										className="flex size-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-sm group-hover:scale-110 group-hover:shadow-md group-focus-visible:scale-110 transition-all"
										style={{
											transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
										}}
									>
										<CalendarCheck className="size-6 text-primary transition-transform group-hover:scale-110" />
									</div>
									<div>
										<p className="text-primary text-sm font-semibold uppercase tracking-wide">
											Net Income
										</p>
										{trends.net !== 0 && (
											<div className="flex items-center gap-1 mt-1">
												{trends.net > 0 ? (
													<TrendingUp className="size-3 text-primary" />
												) : (
													<TrendingDown className="size-3 text-primary" />
												)}
												<span className="text-xs text-primary font-medium">
													{trends.net > 0 ? '+' : ''}
													{trends.net.toFixed(1)}%
												</span>
											</div>
										)}
									</div>
								</div>
								<p className="font-bold tabular-nums text-3xl text-primary">
									{formatCurrency(summary.netIncome)}
								</p>
								<p className="text-sm text-primary/80">
									Scheduled: {formatCurrency(summary.totalScheduled)}
								</p>
							</div>
						</div>
						<div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
					</article>
				</div>
				<Separator className="opacity-60" />

				{/* Enhanced chart section with better accessibility */}
				<section
					className="space-y-6"
					style={{
						animation: `slideInFromBottom ${ANIMATION_DURATIONS.slow} ease-out`
					}}
					aria-labelledby="monthly-breakdown-title"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div className="space-y-1">
							<h3
								id="monthly-breakdown-title"
								className="text-lg font-semibold text-foreground"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight,
									fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight
								}}
							>
								Monthly Financial Trends
							</h3>
							<p className="text-sm text-muted-foreground">
								Track your financial performance month over month
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								className={cn(
									buttonClasses('outline', 'sm'),
									'text-xs h-8 px-3 border-2 hover:bg-muted/50 hover:scale-105 font-semibold',
									'transition-transform'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
								}}
							>
								Export Data
							</Button>
							<Badge
								variant="outline"
								className={cn(
									badgeClasses('outline', 'sm'),
									'text-xs bg-primary/5 border-primary/20 text-primary',
									'transition-transform'
								)}
							>
								{chartData.length} months
							</Badge>
						</div>
					</div>

					<div
						className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-muted/10 border-2 border-border/60 p-6 hover:shadow-lg transition-shadow"
						style={{
							minHeight: '400px',
							transition: `all ${ANIMATION_DURATIONS.default} ease-out`
						}}
					>
						<ChartContainer className="h-[350px] w-full" config={chartConfig}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={chartData}
									margin={{ left: 10, right: 30, top: 20, bottom: 20 }}
									barCategoryGap="25%"
								>
									<CartesianGrid
										vertical={false}
										strokeDasharray="3 3"
										stroke="hsl(var(--muted-foreground))"
										opacity={0.2}
									/>
									<XAxis
										dataKey="month"
										tickLine={false}
										tickMargin={10}
										axisLine={false}
										fontSize={11}
										className="text-muted-foreground"
										tick={{ fontSize: 11 }}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tickMargin={10}
										tickFormatter={value => {
											if (value >= 1000000)
												return `$${(value / 1000000).toFixed(1)}M`
											if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
											return `$${value}`
										}}
										fontSize={11}
										className="text-muted-foreground"
										tick={{ fontSize: 11 }}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												hideLabel={false}
												labelFormatter={label => `${label} Financial Summary`}
												formatter={(value, name) => [
													formatCurrency(Number(value)),
													name === 'income'
														? 'Income'
														: name === 'expenses'
															? 'Expenses'
															: 'Scheduled'
												]}
											/>
										}
										cursor={{
											fill: 'hsl(var(--muted))',
											opacity: 0.1,
											radius: 4
										}}
									/>
									<Bar
										dataKey="income"
										fill={chartConfig.income?.color}
										radius={[4, 4, 0, 0]}
										name="Income"
									/>
									<Bar
										dataKey="expenses"
										fill={chartConfig.expenses?.color}
										radius={[0, 0, 0, 0]}
										name="Expenses"
									/>
									<Bar
										dataKey="scheduled"
										fill={chartConfig.scheduled?.color}
										radius={[0, 0, 4, 4]}
										name="Scheduled"
									/>
								</BarChart>
							</ResponsiveContainer>
						</ChartContainer>

						{/* Chart legend with enhanced styling */}
						<div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border/40">
							<div className="flex items-center gap-2">
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: chartConfig.income?.color }}
								/>
								<span className="text-xs font-medium text-muted-foreground">
									Income
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: chartConfig.expenses?.color }}
								/>
								<span className="text-xs font-medium text-muted-foreground">
									Expenses
								</span>
							</div>
							<div className="flex items-center gap-2">
								<div
									className="size-3 rounded-full"
									style={{ backgroundColor: chartConfig.scheduled?.color }}
								/>
								<span className="text-xs font-medium text-muted-foreground">
									Scheduled
								</span>
							</div>
						</div>
					</div>
				</section>
			</CardContent>
		</Card>
	)
}
