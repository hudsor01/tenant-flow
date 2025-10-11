'use client'

import type {
	BillingInsightsTimeline,
	MonthlyFinancialMetric,
	NetOperatingIncomeByProperty
} from '@repo/shared/types/financial-analytics'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

import { Badge } from '@/components/ui/badge'
import { CardDescription } from '@/components/ui/card'
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '@/components/ui/chart'

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
		<div className="flex h-[280px] flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="text-center text-sm text-muted-foreground">
				{message}
			</CardDescription>
		</div>
	)
}

export function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
	if (!data || data.length === 0) {
		return (
			<EmptyState message="We couldn't find monthly financial data for this period." />
		)
	}

	const chartData = data.map(item => ({
		month: item.month,
		revenue: item.revenue,
		expenses: item.expenses,
		netIncome: item.netIncome
	}))

	return (
		<ChartContainer className="h-[320px]" config={revenueExpenseConfig}>
			<AreaChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="month" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent />} />
				<Legend />
				<Area
					type="monotone"
					dataKey="revenue"
					stackId="1"
					stroke="var(--color-revenue)"
					fill="var(--color-revenue)"
					fillOpacity={0.25}
				/>
				<Area
					type="monotone"
					dataKey="expenses"
					stackId="2"
					stroke="var(--color-expenses)"
					fill="var(--color-expenses)"
					fillOpacity={0.2}
				/>
				<Area
					type="monotone"
					dataKey="netIncome"
					stroke="var(--color-netIncome)"
					fill="var(--color-netIncome)"
					fillOpacity={0.3}
				/>
			</AreaChart>
		</ChartContainer>
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
		<ChartContainer className="h-[320px]" config={noiConfig}>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis
					dataKey="property"
					tickLine={false}
					axisLine={false}
					interval={0}
					angle={-30}
					textAnchor="end"
					height={80}
				/>
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent />} />
				<Bar dataKey="noi" fill="var(--color-noi)" radius={[6, 6, 0, 0]} />
			</BarChart>
		</ChartContainer>
	)
}

export function BillingTimelineChart({ data }: BillingTimelineChartProps) {
	const timeline = data?.points ?? []
	if (!timeline.length) {
		return (
			<EmptyState message="We couldn't find billing activity for the selected period." />
		)
	}

	const chartData = timeline.map(point => ({
		period: point.period,
		invoiced: point.invoiced,
		paid: point.paid,
		overdue: point.overdue
	}))

	return (
		<ChartContainer className="h-[320px]" config={billingTimelineConfig}>
			<LineChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Legend />
				<Tooltip content={<ChartTooltipContent indicator="line" />} />
				<Line
					type="monotone"
					dataKey="invoiced"
					stroke="var(--color-invoiced)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="paid"
					stroke="var(--color-paid)"
					strokeWidth={2}
					dot={false}
				/>
				<Line
					type="monotone"
					dataKey="overdue"
					stroke="var(--color-overdue)"
					strokeWidth={2}
					dot={false}
				/>
			</LineChart>
		</ChartContainer>
	)
}
