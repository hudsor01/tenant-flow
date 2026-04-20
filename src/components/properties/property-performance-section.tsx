'use client'

import { useQuery } from '@tanstack/react-query'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import {
	formatCurrency,
	formatPercentage
} from '#lib/utils/currency'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import {
	DollarSign,
	Receipt,
	Percent,
	TrendingUp
} from 'lucide-react'

interface PropertyPerformanceSectionProps {
	propertyId: string
}

export function PropertyPerformanceSection({
	propertyId
}: PropertyPerformanceSectionProps) {
	const { data, isLoading, isError } = useQuery(
		propertyQueries.performance(propertyId)
	)

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Performance (YTD)</CardTitle>
					<CardDescription>Year-to-date revenue, expenses, and occupancy</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-24 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	if (isError || !data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Performance (YTD)</CardTitle>
					<CardDescription>Year-to-date revenue, expenses, and occupancy</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						No performance data yet. Metrics will appear once you have recorded rent, expenses, or leases for this property.
					</p>
				</CardContent>
			</Card>
		)
	}

	const metrics = [
		{
			label: 'Revenue',
			value: formatCurrency(data.total_revenue ?? 0),
			icon: DollarSign,
			tone: 'text-success'
		},
		{
			label: 'Expenses',
			value: formatCurrency(data.total_expenses ?? 0),
			icon: Receipt,
			tone: 'text-destructive'
		},
		{
			label: 'Net Income',
			value: formatCurrency(data.net_income ?? 0),
			icon: TrendingUp,
			tone: (data.net_income ?? 0) >= 0 ? 'text-success' : 'text-destructive'
		},
		{
			label: 'Occupancy',
			value: formatPercentage((data.occupancy_rate ?? 0) * 100),
			icon: Percent,
			tone: 'text-info'
		}
	]

	return (
		<Card>
			<CardHeader>
				<CardTitle>Performance (YTD)</CardTitle>
				<CardDescription>Year-to-date revenue, expenses, and occupancy</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					{metrics.map(metric => {
						const Icon = metric.icon
						return (
							<div
								key={metric.label}
								className="rounded-lg border border-border bg-card p-4"
							>
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
										{metric.label}
									</span>
									<Icon className={`size-4 ${metric.tone}`} aria-hidden="true" />
								</div>
								<div className={`text-2xl font-semibold ${metric.tone}`}>
									{metric.value}
								</div>
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
