'use client'

import { useMemo, useState } from 'react'
import type {
	BillingInsightsTimeline,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty
} from '@repo/shared/types/analytics'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis
} from 'recharts'

import { Badge } from '#components/ui/badge'
import { CardDescription } from '#components/ui/card'
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'

const revenueExpenseConfig = {
	revenue: {
		label: 'Revenue',
		color: 'oklch(0.6 0.16 138)'
	},
	expenses: {
		label: 'Expenses',
		color: 'oklch(0.75 0.08 20)'
	},
	netIncome: {
		label: 'Net Income',
		color: 'oklch(0.64 0.19 162)'
	}
} satisfies ChartConfig

const billingTimelineConfig = {
	invoiced: {
		label: 'Invoiced',
		color: 'oklch(0.72 0.08 45)'
	},
	paid: {
		label: 'Paid',
		color: 'oklch(0.55 0.18 140)'
	},
	overdue: {
		label: 'Overdue',
		color: 'oklch(0.72 0.15 30)'
	}
} satisfies ChartConfig

const noiConfig = {
	noi: {
		label: 'NOI',
		color: 'oklch(0.68 0.1 255)'
	}
} satisfies ChartConfig

type RevenueExpenseChartProps = {
	data: MonthlyFinancialMetric[]
}

type NetOperatingIncomeChartProps = {
	data: NetOperatingIncomeByProperty[]
}

type BillingTimelineChartProps = {
	data: BillingInsightsTimeline
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-70 flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="text-center text-muted">
				{message}
			</CardDescription>
		</div>
	)
}

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
	const [timeRange, setTimeRange] = useState('all')

	// Move all hooks before early return to comply with Rules of Hooks
	const chartData = useMemo(() => {
		if (!data || data.length === 0) return []
		return data.map(item => ({
			month: item.month,
			revenue: item.revenue,
			expenses: item.expenses,
			netIncome: item.netIncome
		}))
	}, [data])

	// Filter data based on time range
	const filteredData = useMemo(() => {
		if (timeRange === 'all' || chartData.length <= 3) {
			return chartData
		}

		const months =
			timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : chartData.length
		return chartData.slice(-months)
	}, [chartData, timeRange])

	// No data - show empty state (check after hooks)
	if (!data || data.length === 0) {
		return (
			<EmptyState message="We couldn't find monthly financial data for this period." />
		)
	}

	return (
		<div className="space-y-4">
			{chartData.length > 3 && (
				<div className="flex justify-end">
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger className="w-[160px]" aria-label="Select time range">
							<SelectValue placeholder="All time" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All time</SelectItem>
							<SelectItem value="6m">Last 6 months</SelectItem>
							<SelectItem value="3m">Last 3 months</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}
			<ChartContainer
				className="aspect-auto h-80 w-full"
				config={revenueExpenseConfig}
			>
				<AreaChart data={filteredData}>
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
						<linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--color-expenses)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--color-expenses)"
								stopOpacity={0.1}
							/>
						</linearGradient>
						<linearGradient id="fillNetIncome" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor="var(--color-netIncome)"
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor="var(--color-netIncome)"
								stopOpacity={0.1}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="month"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={32}
					/>
					<YAxis tickLine={false} axisLine={false} />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								labelFormatter={value => value}
								indicator="dot"
							/>
						}
					/>
					<Area
						type="natural"
						dataKey="revenue"
						fill="url(#fillRevenue)"
						stroke="var(--color-revenue)"
						stackId="a"
					/>
					<Area
						type="natural"
						dataKey="expenses"
						fill="url(#fillExpenses)"
						stroke="var(--color-expenses)"
						stackId="b"
					/>
					<Area
						type="natural"
						dataKey="netIncome"
						fill="url(#fillNetIncome)"
						stroke="var(--color-netIncome)"
					/>
					<ChartLegend content={<ChartLegendContent />} />
				</AreaChart>
			</ChartContainer>
		</div>
	)
}

export function NetOperatingIncomeChart({
	data
}: NetOperatingIncomeChartProps) {
	if (!data || data.length === 0) {
		return (
			<EmptyState message="We couldn't find NOI data for your properties." />
		)
	}

	const chartData = data.map(item => ({
		property: item.propertyName,
		noi: item.noi
	}))

	return (
		<ChartContainer className="aspect-auto h-80 w-full" config={noiConfig}>
			<BarChart data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="property"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-30}
					textAnchor="end"
					height={80}
					tickMargin={8}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent hideLabel />}
				/>
				<Bar dataKey="noi" fill="var(--color-noi)" radius={[6, 6, 0, 0]} />
			</BarChart>
		</ChartContainer>
	)
}

export function BillingTimelineChart({ data }: BillingTimelineChartProps) {
	const [timeRange, setTimeRange] = useState('all')

	// Move all hooks before early return to comply with Rules of Hooks
	const chartData = useMemo(() => {
		const timeline = data?.points ?? []
		if (!timeline.length) return []
		return timeline.map(point => ({
			period: point.period,
			invoiced: point.invoiced,
			paid: point.paid,
			overdue: point.overdue
		}))
	}, [data?.points])

	// Filter data based on time range
	const filteredData = useMemo(() => {
		if (timeRange === 'all' || chartData.length <= 3) {
			return chartData
		}

		const periods =
			timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : chartData.length
		return chartData.slice(-periods)
	}, [chartData, timeRange])

	// No data - show empty state (check after hooks)
	const timeline = data?.points ?? []
	if (!timeline.length) {
		return (
			<EmptyState message="We couldn't find billing activity for the selected period." />
		)
	}

	return (
		<div className="space-y-4">
			{chartData.length > 3 && (
				<div className="flex justify-end">
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger className="w-[160px]" aria-label="Select time range">
							<SelectValue placeholder="All time" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All time</SelectItem>
							<SelectItem value="6m">Last 6 months</SelectItem>
							<SelectItem value="3m">Last 3 months</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}
			<ChartContainer
				className="aspect-auto h-80 w-full"
				config={billingTimelineConfig}
			>
				<LineChart data={filteredData}>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="period"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={32}
					/>
					<YAxis tickLine={false} axisLine={false} />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								labelFormatter={value => value}
								indicator="line"
							/>
						}
					/>
					<Line
						type="natural"
						dataKey="invoiced"
						stroke="var(--color-invoiced)"
						strokeWidth={2}
						dot={false}
					/>
					<Line
						type="natural"
						dataKey="paid"
						stroke="var(--color-paid)"
						strokeWidth={2}
						dot={false}
					/>
					<Line
						type="natural"
						dataKey="overdue"
						stroke="var(--color-overdue)"
						strokeWidth={2}
						dot={false}
					/>
					<ChartLegend content={<ChartLegendContent />} />
				</LineChart>
			</ChartContainer>
		</div>
	)
}
