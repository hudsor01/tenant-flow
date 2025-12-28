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
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import { FileText, DollarSign, Calendar, BarChart3, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import type { LeaseFinancialInsight } from '@repo/shared/types/analytics'
import { LeaseLifecycleChart, LeaseStatusChart } from './lease-charts'

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

function LeaseAnalyticsSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col gap-2 mb-6">
				<Skeleton className="h-7 w-40" />
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
		</div>
	)
}

export default function LeaseAnalyticsPage() {
	const { data, isLoading } = useQuery(analyticsQueries.leasePageData())

	if (isLoading) {
		return <LeaseAnalyticsSkeleton />
	}

	const {
		metrics = {
			totalLeases: 0,
			activeLeases: 0,
			expiringSoon: 0,
			totalrent_amount: 0,
			averageLeaseValue: 0
		},
		profitability = [],
		lifecycle = [],
		statusBreakdown = []
	} = data || {}

	// Show empty state when no meaningful data exists
	const hasData =
		metrics.totalLeases > 0 ||
		metrics.activeLeases > 0 ||
		profitability.length > 0 ||
		lifecycle.length > 0

	if (!hasData) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col gap-2 mb-6">
						<h1 className="text-2xl font-semibold text-foreground">
							Lease Analytics
						</h1>
						<p className="text-muted-foreground">
							Understanding profitability, renewals, and upcoming expirations.
						</p>
					</div>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Empty className="min-h-96 border rounded-lg">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileText />
							</EmptyMedia>
							<EmptyTitle>No lease data yet</EmptyTitle>
							<EmptyDescription>
								Create leases for your tenants to start tracking analytics and
								profitability.
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
						Lease Analytics
					</h1>
					<p className="text-muted-foreground">
						Understand profitability, renewals, and upcoming expirations.
					</p>
				</div>
			</BlurFade>

			{/* Overview Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-primary)"
							colorTo="oklch(from var(--color-primary) l c h / 0.3)"
						/>
						<StatLabel>Total leases</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={metrics.totalLeases} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<FileText />
						</StatIndicator>
						<StatDescription>Tracked agreements</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Active leases</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							<NumberTicker value={metrics.activeLeases} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatTrend trend="neutral">
							<span className="text-amber-600 dark:text-amber-400 font-medium">
								{metrics.expiringSoon}
							</span>
							<span className="text-muted-foreground">expiring soon</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Monthly rent</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker
								value={metrics.totalrent_amount / 100}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<DollarSign />
						</StatIndicator>
						<StatDescription>Total recurring rent</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Average lease value</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker
								value={metrics.averageLeaseValue / 100}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>Monthly rent per lease</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.6} inView>
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

				<BlurFade delay={0.7} inView>
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
			<BlurFade delay={0.8} inView>
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
