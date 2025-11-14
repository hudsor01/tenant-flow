'use client'

import type {
	LeaseLifecyclePoint,
	LeaseStatusBreakdown
} from '@repo/shared/types/lease-analytics'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

import { Badge } from '#components/ui/badge'
import { CardDescription } from '#components/ui/card'
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'

const lifecycleConfig = {
	renewals: {
		label: 'Renewals',
		color: 'oklch(0.65 0.14 150)'
	},
	expirations: {
		label: 'Expirations',
		color: 'oklch(0.68 0.12 30)'
	},
	notices: {
		label: 'Notices',
		color: 'oklch(0.72 0.09 220)'
	}
} satisfies ChartConfig

const statusConfig = {
	percentage: {
		label: 'Share',
		color: 'oklch(0.58 0.16 140)'
	}
} satisfies ChartConfig

type LeaseLifecycleChartProps = {
	points: LeaseLifecyclePoint[]
}

type LeaseStatusChartProps = {
	breakdown: LeaseStatusBreakdown[]
}

function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex h-60 flex-col items-center justify-center rounded-lg border border-dashed">
			<Badge variant="outline" className="mb-2">
				No data
			</Badge>
			<CardDescription className="max-w-sm text-center text-sm text-muted-foreground">
				{message}
			</CardDescription>
		</div>
	)
}

export function LeaseLifecycleChart({ points }: LeaseLifecycleChartProps) {
	if (!points || !Array.isArray(points) || points.length === 0) {
		return (
			<EmptyState message="No lifecycle events recorded for the selected leases." />
		)
	}

	const chartData = points.map(point => ({
		period: point.period,
		renewals: point.renewals,
		expirations: point.expirations,
		notices: point.noticesGiven
	}))

	return (
		<ChartContainer className="h-75" config={lifecycleConfig}>
			<AreaChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis dataKey="period" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} />
				<Tooltip content={<ChartTooltipContent />} />
				<Area
					type="monotone"
					dataKey="renewals"
					stroke="var(--color-renewals)"
					fill="var(--color-renewals)"
					fillOpacity={0.25}
				/>
				<Area
					type="monotone"
					dataKey="expirations"
					stroke="var(--color-expirations)"
					fill="var(--color-expirations)"
					fillOpacity={0.2}
				/>
				<Area
					type="monotone"
					dataKey="notices"
					stroke="var(--color-notices)"
					fill="var(--color-notices)"
					fillOpacity={0.2}
				/>
			</AreaChart>
		</ChartContainer>
	)
}

export function LeaseStatusChart({ breakdown }: LeaseStatusChartProps) {
	if (!breakdown || !Array.isArray(breakdown) || breakdown.length === 0) {
		return <EmptyState message="No lease status breakdown available." />
	}

	const chartData = breakdown.map(item => ({
		status: item.status,
		percentage: Number(item.percentage.toFixed?.(2) ?? item.percentage)
	}))

	return (
		<ChartContainer className="h-75" config={statusConfig}>
			<BarChart data={chartData}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} />
				<XAxis dataKey="status" tickLine={false} axisLine={false} />
				<YAxis tickLine={false} axisLine={false} unit="%" />
				<Tooltip content={<ChartTooltipContent />} />
				<Bar
					dataKey="percentage"
					fill="var(--color-percentage)"
					radius={[6, 6, 0, 0]}
				/>
			</BarChart>
		</ChartContainer>
	)
}
