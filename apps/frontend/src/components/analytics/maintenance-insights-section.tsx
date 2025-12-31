'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { TrendingUp, DollarSign, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import type { MaintenanceCategoryBreakdown } from '@repo/shared/types/analytics'
import { MaintenanceTrendChart, MaintenanceCostChart } from './maintenance-charts'

export function MaintenanceInsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
			<div className="bg-card border border-border rounded-lg p-6">
				<Skeleton className="h-5 w-40 mb-2" />
				<Skeleton className="h-4 w-56 mb-6" />
				<Skeleton className="h-64 w-full" />
			</div>
		</div>
	)
}

function CategoryBreakdownTable({
	entries
}: {
	entries: MaintenanceCategoryBreakdown[]
}) {
	const columns: ColumnDef<MaintenanceCategoryBreakdown>[] = useMemo(
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
				header: 'Count',
				meta: {
					label: 'Count',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">{row.original.count}</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: entries,
		columns,
		pageCount: -1,
		enableAdvancedFilter: true,
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: 8
			}
		}
	})

	if (!entries.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No category breakdown data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

export function MaintenanceInsightsSection() {
	const { data, isLoading } = useQuery(analyticsQueries.maintenancePageData())

	if (isLoading) {
		return <MaintenanceInsightsSkeleton />
	}

	const { trends = [], costBreakdown = [], categoryBreakdown = [] } = data || {}

	return (
		<div className="space-y-6">
			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<BlurFade delay={0.1} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Request trends</h3>
								<p className="text-sm text-muted-foreground">
									Completed vs pending requests over time
								</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>
						<MaintenanceTrendChart points={trends} />
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Cost breakdown</h3>
								<p className="text-sm text-muted-foreground">
									Maintenance costs by category
								</p>
							</div>
							<DollarSign className="w-5 h-5 text-muted-foreground" />
						</div>
						<MaintenanceCostChart entries={costBreakdown} />
					</div>
				</BlurFade>
			</div>

			{/* Category Breakdown Table */}
			<BlurFade delay={0.3} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Category analysis</h3>
							<p className="text-sm text-muted-foreground">
								Request counts by category
							</p>
						</div>
						<Wrench className="w-5 h-5 text-muted-foreground" />
					</div>
					<CategoryBreakdownTable entries={categoryBreakdown} />
				</div>
			</BlurFade>
		</div>
	)
}
