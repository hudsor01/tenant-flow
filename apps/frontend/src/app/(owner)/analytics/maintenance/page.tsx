'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { Badge } from '#components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import { Wrench } from 'lucide-react'
import {
	MaintenanceCostChart,
	MaintenanceTrendChart
} from './maintenance-charts'

function MaintenanceSkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>Maintenance Insights</h1>
						<p className="text-muted-foreground">
							Track volumes, costs, and response times for maintenance operations.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</CardHeader>
								<CardContent className="pt-0">
									<Skeleton className="h-8 w-20" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-48" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-40" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</div>
	)
}

export default function MaintenanceInsightsPage() {
	const { data, isLoading } = useQuery(analyticsQueries.maintenancePageData())

	if (isLoading) {
		return <MaintenanceSkeleton />
	}

	const {
		metrics = {
			openRequests: 0,
			inProgressRequests: 0,
			completedRequests: 0,
			totalCost: 0,
			averageResponseTimeHours: 0
		},
		costBreakdown = [],
		trends = [],
		categoryBreakdown = []
	} = data || {}

	// Show empty state when no meaningful data exists
	const hasData = metrics.openRequests > 0 ||
		metrics.inProgressRequests > 0 ||
		metrics.completedRequests > 0 ||
		trends.length > 0 ||
		categoryBreakdown.length > 0

	if (!hasData) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Maintenance Insights</h1>
							<p className="text-muted-foreground">
								Track volumes, costs, and response times for maintenance operations.
							</p>
						</div>
					</div>
				</section>
				<section className="flex-1 p-6">
					<div className="mx-auto max-w-400 px-4 lg:px-6">
						<Empty className="min-h-96 border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Wrench />
								</EmptyMedia>
								<EmptyTitle>No maintenance data yet</EmptyTitle>
								<EmptyDescription>
									Maintenance requests from tenants will appear here once submitted.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				</section>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-(--color-fill-tertiary)"
			>
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>
							Maintenance Insights
						</h1>
						<p className="text-muted-foreground">
							Track volumes, costs, and response times for maintenance
							operations.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader>
								<CardTitle>Open requests</CardTitle>
								<CardDescription>Awaiting assignment</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.openRequests)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>In progress</CardTitle>
								<CardDescription>Currently being serviced</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.inProgressRequests)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Completed this month</CardTitle>
								<CardDescription>Resolved work orders</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.completedRequests)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Total cost</CardTitle>
								<CardDescription>Year-to-date</CardDescription>
							</CardHeader>
							<CardContent className="flex items-end justify-between pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(metrics.totalCost)}
								</p>
								<Badge variant="outline" className="text-xs">
									Avg response {formatNumber(metrics.averageResponseTimeHours)}{' '}
									hrs
								</Badge>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Maintenance trends</CardTitle>
								<CardDescription>Completed vs pending requests</CardDescription>
							</CardHeader>
							<CardContent>
								<MaintenanceTrendChart points={trends} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Cost breakdown</CardTitle>
								<CardDescription>Spending by category</CardDescription>
							</CardHeader>
							<CardContent>
								<MaintenanceCostChart entries={costBreakdown} />
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Category breakdown</CardTitle>
							<CardDescription>
								Request volume by maintenance type
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Category</TableHead>
										<TableHead className="text-right">Requests</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{categoryBreakdown.slice(0, 10).map(item => (
										<TableRow key={item.category}>
											<TableCell className="font-medium">
												{item.category}
											</TableCell>
											<TableCell className="text-right">
												{formatNumber(item.count)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
