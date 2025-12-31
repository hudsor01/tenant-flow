'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import { Calendar, DollarSign, BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import type { LeaseFinancialInsight } from '@repo/shared/types/analytics'
import { LeaseLifecycleChart, LeaseStatusChart } from './lease-charts'

export function LeaseInsightsSkeleton() {
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

function ProfitabilityTable({ leases }: { leases: LeaseFinancialInsight[] }) {
	const columns: ColumnDef<LeaseFinancialInsight>[] = useMemo(
		() => [
			{
				accessorKey: 'lease_id',
				header: 'Lease',
				meta: {
					label: 'Lease ID',
					variant: 'text',
					placeholder: 'Search lease...'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<span className="font-medium">{row.original.lease_id}</span>
				)
			},
			{
				accessorKey: 'tenantName',
				header: 'Tenant',
				meta: {
					label: 'Tenant',
					variant: 'text',
					placeholder: 'Search tenant...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'propertyName',
				header: 'Property',
				meta: {
					label: 'Property',
					variant: 'text',
					placeholder: 'Search property...'
				},
				enableColumnFilter: true
			},
			{
				accessorKey: 'rent_amount',
				header: 'Monthly rent',
				meta: {
					label: 'Monthly Rent',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.rent_amount)}
					</div>
				)
			},
			{
				accessorKey: 'outstandingBalance',
				header: 'Outstanding',
				meta: {
					label: 'Outstanding Balance',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{formatCurrency(row.original.outstandingBalance)}
					</div>
				)
			},
			{
				accessorKey: 'profitabilityScore',
				header: 'Score',
				meta: {
					label: 'Profitability Score',
					variant: 'number'
				},
				enableColumnFilter: true,
				cell: ({ row }) => (
					<div className="text-right">
						{row.original.profitabilityScore !== null &&
						row.original.profitabilityScore !== undefined
							? formatNumber(row.original.profitabilityScore, {
									maximumFractionDigits: 1
								})
							: '-'}
					</div>
				)
			}
		],
		[]
	)

	const { table } = useDataTable({
		data: leases,
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

	if (!leases.length) {
		return (
			<div className="text-center text-muted-foreground py-8">
				No lease profitability data available
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

export function LeaseInsightsSection() {
	const { data, isLoading } = useQuery(analyticsQueries.leasePageData())

	if (isLoading) {
		return <LeaseInsightsSkeleton />
	}

	const { profitability = [], lifecycle = [], statusBreakdown = [] } = data || {}

	return (
		<div className="space-y-6">
			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<BlurFade delay={0.1} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Lease lifecycle</h3>
								<p className="text-sm text-muted-foreground">
									Renewals, expirations, and notices over time
								</p>
							</div>
							<Calendar className="w-5 h-5 text-muted-foreground" />
						</div>
						<LeaseLifecycleChart points={lifecycle} />
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Status breakdown</h3>
								<p className="text-sm text-muted-foreground">
									Distribution of lease states
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<LeaseStatusChart breakdown={statusBreakdown} />
					</div>
				</BlurFade>
			</div>

			{/* Profitability Table */}
			<BlurFade delay={0.3} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Lease profitability</h3>
							<p className="text-sm text-muted-foreground">
								Revenue contribution and outstanding balances
							</p>
						</div>
						<DollarSign className="w-5 h-5 text-muted-foreground" />
					</div>
					<ProfitabilityTable leases={profitability} />
				</div>
			</BlurFade>
		</div>
	)
}
