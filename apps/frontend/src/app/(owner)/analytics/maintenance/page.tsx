'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '#components/ui/stat'
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
import { formatNumber } from '#lib/formatters/currency'
import { Wrench, CheckCircle, Clock, DollarSign, BarChart3 } from 'lucide-react'
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
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col gap-2 mb-6">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-5 w-80" />
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-40 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
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
	const hasData =
		metrics.openRequests > 0 ||
		metrics.inProgressRequests > 0 ||
		metrics.completedRequests > 0 ||
		trends.length > 0 ||
		categoryBreakdown.length > 0

	if (!hasData) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col gap-2 mb-6">
						<h1 className="text-2xl font-semibold text-foreground">
							Maintenance Insights
						</h1>
						<p className="text-muted-foreground">
							Track volumes, costs, and response times for maintenance
							operations.
						</p>
					</div>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Empty className="min-h-96 border rounded-lg">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Wrench />
							</EmptyMedia>
							<EmptyTitle>No maintenance data yet</EmptyTitle>
							<EmptyDescription>
								Maintenance requests from tenants will appear here once
								submitted.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col gap-2 mb-6">
					<h1 className="text-2xl font-semibold text-foreground">
						Maintenance Insights
					</h1>
					<p className="text-muted-foreground">
						Track volumes, costs, and response times for maintenance operations.
					</p>
				</div>
			</BlurFade>

			{/* Overview Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						{metrics.openRequests > 3 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Open requests</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={metrics.openRequests} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Wrench />
						</StatIndicator>
						<StatDescription>Awaiting assignment</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>In progress</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={metrics.inProgressRequests} duration={1200} />
						</StatValue>
						<StatIndicator variant="icon" color="info">
							<Clock />
						</StatIndicator>
						<StatDescription>Currently being serviced</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Completed this month</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={metrics.completedRequests} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<CheckCircle />
						</StatIndicator>
						<StatDescription>Resolved work orders</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total cost</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={metrics.totalCost / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatTrend trend="neutral">
							<span className="text-muted-foreground">
								Avg response {formatNumber(metrics.averageResponseTimeHours)} hrs
							</span>
						</StatTrend>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Maintenance trends
								</h3>
								<p className="text-sm text-muted-foreground">
									Completed vs pending requests
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<MaintenanceTrendChart points={trends} />
					</div>
				</BlurFade>

				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Cost breakdown</h3>
								<p className="text-sm text-muted-foreground">
									Spending by category
								</p>
							</div>
							<DollarSign className="w-5 h-5 text-muted-foreground" />
						</div>
						<MaintenanceCostChart entries={costBreakdown} />
					</div>
				</BlurFade>
			</div>

			{/* Category Breakdown Table */}
			<BlurFade delay={0.8} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Category breakdown</h3>
							<p className="text-sm text-muted-foreground">
								Request volume by maintenance type
							</p>
						</div>
						<Wrench className="w-5 h-5 text-muted-foreground" />
					</div>
					<CategoryBreakdownTable items={categoryBreakdown} />
				</div>
			</BlurFade>
		</div>
	)
}
