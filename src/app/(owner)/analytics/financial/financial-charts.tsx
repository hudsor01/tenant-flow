'use client'

import { useState } from 'react'
import type {
	BillingInsightsTimeline,
	NetOperatingIncomeByProperty
} from '#types/analytics'
import {
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

const billingTimelineConfig = {
	invoiced: { label: 'Invoiced', color: 'oklch(0.72 0.08 45)' },
	paid: { label: 'Paid', color: 'oklch(0.55 0.18 140)' },
	overdue: { label: 'Overdue', color: 'oklch(0.72 0.15 30)' }
} satisfies ChartConfig

const noiConfig = {
	noi: { label: 'NOI', color: 'oklch(0.68 0.1 255)' }
} satisfies ChartConfig

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-70 flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="text-center text-muted-foreground">
				{message}
			</CardDescription>
		</div>
	)
}

type NetOperatingIncomeChartProps = { data: NetOperatingIncomeByProperty[] }

export function NetOperatingIncomeChart({ data }: NetOperatingIncomeChartProps) {
	if (!data || data.length === 0) {
		return <EmptyState message="We couldn't find NOI data for your properties." />
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
				<ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
				<Bar dataKey="noi" fill="var(--color-noi)" radius={[6, 6, 0, 0]} />
			</BarChart>
		</ChartContainer>
	)
}

type BillingTimelineChartProps = { data: BillingInsightsTimeline }

export function BillingTimelineChart({ data }: BillingTimelineChartProps) {
	const [timeRange, setTimeRange] = useState('all')

	const chartData = (() => {
		const timeline = data?.points ?? []
		if (!timeline.length) return []
		return timeline.map(point => ({
			period: point.period,
			invoiced: point.invoiced,
			paid: point.paid,
			overdue: point.overdue
		}))
	})()

	const filteredData = (() => {
		if (timeRange === 'all' || chartData.length <= 3) return chartData
		const periods = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : chartData.length
		return chartData.slice(-periods)
	})()

	const timeline = data?.points ?? []
	if (!timeline.length) {
		return <EmptyState message="We couldn't find billing activity for the selected period." />
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
			<ChartContainer className="aspect-auto h-80 w-full" config={billingTimelineConfig}>
				<LineChart data={filteredData}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
					<YAxis tickLine={false} axisLine={false} />
					<ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={value => value} indicator="line" />} />
					<Line type="natural" dataKey="invoiced" stroke="var(--color-invoiced)" strokeWidth={2} dot={false} />
					<Line type="natural" dataKey="paid" stroke="var(--color-paid)" strokeWidth={2} dot={false} />
					<Line type="natural" dataKey="overdue" stroke="var(--color-overdue)" strokeWidth={2} dot={false} />
					<ChartLegend content={<ChartLegendContent />} />
				</LineChart>
			</ChartContainer>
		</div>
	)
}
