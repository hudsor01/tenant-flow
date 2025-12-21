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
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
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
import { useMemo } from 'react'
import {
	MaintenanceCostChart,
	MaintenanceTrendChart
} from './maintenance-charts'

type CategoryBreakdownItem = {
	category: string
	count: number
}

function CategoryBreakdownTable({ items }: { items: CategoryBreakdownItem[] }) {
	const columns: ColumnDef<CategoryBreakdownItem>[] = useMemo(
		() => [
			{
				accessorKey: 'category',
				header: 'Category',
				meta: {
					label: 'Category',
					variant: 'text',
					placeholder: 'Search category...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.category}</span>
				)
			},
			{
				accessorKey: 'count',
				header: 'Requests',
				meta: {
					label: 'Request Count',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">{formatNumber(row.original.count)}</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: items,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 10
			}
		}
	})

	if (!items.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No category data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

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
								<p className="typography-h2 tabular-nums">
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
								<p className="typography-h2 tabular-nums">
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
								<p className="typography-h2 tabular-nums">
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
								<p className="typography-h2 tabular-nums">
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
							<CategoryBreakdownTable items={categoryBreakdown} />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
