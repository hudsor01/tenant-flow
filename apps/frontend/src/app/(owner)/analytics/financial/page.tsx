'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { RefreshableAnalytics } from '#app/(owner)/analytics/refreshable-analytics'
import { ExportButtons } from '#components/export/export-buttons'
import { Badge } from '#components/ui/badge'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend
} from '#components/ui/stat'
import { AnimatedTrendIndicator } from '#components/ui/animated-trend-indicator'
import { DataTable } from '#components/data-table/data-table'
import { DataTableToolbar } from '#components/data-table/data-table-toolbar'
import { useDataTable } from '#hooks/use-data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Skeleton } from '#components/ui/skeleton'
import {
	formatCurrency,
	formatNumber,
	formatPercentage
} from '#lib/formatters/currency'
import type {
	FinancialBreakdownRow,
	LeaseFinancialInsight
} from '@repo/shared/types/analytics'
import {
	ArrowDownRight,
	ArrowUpRight,
	DollarSign,
	FileDown,
	TrendingUp,
	BarChart3,
	PieChart
} from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import {
	BillingTimelineChart,
	NetOperatingIncomeChart,
	RevenueExpenseChart
} from './financial-charts'
import { OwnerPaymentSummary } from '#components/analytics/owner-payment-summary'
import { EMPTY_PAYMENT_SUMMARY } from '@repo/shared/types/api-contracts'

function TrendPill({ value }: { value: number | null | undefined }) {
	if (value === null || value === undefined) {
		return null
	}

	const isPositive = value >= 0
	const Icon = isPositive ? ArrowUpRight : ArrowDownRight

	return (
		<Badge
			variant={isPositive ? 'outline' : 'destructive'}
			className="flex items-center gap-1 font-medium"
		>
			<Icon className="size-3" />
			{formatPercentage(Math.abs(value), { minimumFractionDigits: 1 })}
		</Badge>
	)
}

function BreakdownList({
	title,
	rows
}: {
	title: string
	rows: FinancialBreakdownRow[]
}) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground font-medium">{title}</p>
				<Link
					className="text-sm text-muted-foreground underline-offset-2 hover:underline"
					href="#"
				>
					View details
				</Link>
			</div>
			<div className="space-y-3">
				{rows.slice(0, 5).map(item => (
					<div
						key={`${title}-${item.label}`}
						className="flex items-center justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-sm">{item.label}</span>
							{item.change !== null && <TrendPill value={item.change} />}
						</div>
						<div className="text-muted-foreground">
							{formatCurrency(item.value)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function LeaseTable({ leases }: { leases: LeaseFinancialInsight[] }) {
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
				header: 'Monthly Rent',
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
				header: 'Profitability',
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
				pageSize: 6
			}
		}
	})

	if (!leases.length) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed">
				<p className="text-muted-foreground">
					No lease financial analytics available yet.
				</p>
			</div>
		)
	}

	return (
		<DataTable table={table}>
			<DataTableToolbar table={table} />
		</DataTable>
	)
}

function FinancialAnalyticsSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-7 w-48 mb-2" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-24" />
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-28 mb-2" />
						<Skeleton className="h-5 w-16" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-40 mb-2" />
					<Skeleton className="h-4 w-56 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="space-y-6">
					<div className="bg-card border border-border rounded-lg p-6">
						<Skeleton className="h-5 w-36 mb-2" />
						<Skeleton className="h-4 w-24 mb-4" />
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={j} className="h-4 w-full" />
							))}
						</div>
					</div>
					<div className="bg-card border border-border rounded-lg p-6">
						<Skeleton className="h-5 w-36 mb-2" />
						<Skeleton className="h-4 w-24 mb-4" />
						<div className="space-y-3">
							{Array.from({ length: 3 }).map((_, j) => (
								<Skeleton key={j} className="h-4 w-full" />
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function FinancialAnalyticsPage() {
	const { data, isLoading } = useQuery(analyticsQueries.financialPageData())
	const { data: paymentSummary = EMPTY_PAYMENT_SUMMARY } = useQuery(
		analyticsQueries.ownerPaymentSummary()
	)

	if (isLoading) {
		return <FinancialAnalyticsSkeleton />
	}

	const {
		metrics = {
			totalRevenue: 0,
			netIncome: 0,
			profitMargin: null,
			cashFlow: 0,
			revenueTrend: null,
			expenseTrend: null
		},
		breakdown = { revenue: [], expenses: [] },
		netOperatingIncome = [],
		billingInsights = {
			points: [],
			totals: { invoiced: 0, paid: 0, overdue: 0 }
		},
		invoiceSummary = [],
		monthlyMetrics = [],
		leaseAnalytics = []
	} = data || {}

	return (
		<RefreshableAnalytics cooldownSeconds={30}>
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header */}
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl font-semibold text-foreground">
								Financial Analytics
							</h1>
							<p className="text-muted-foreground">
								Track revenue, profitability, and portfolio cash flow in real
								time.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-3">
							<ExportButtons filename="financial-analytics" payload={data} />
							<a
								className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
								href="#"
							>
								<FileDown className="size-4" />
								Download insight summary
							</a>
						</div>
					</div>
				</BlurFade>

				{/* Overview Stats */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					<BlurFade delay={0.2} inView>
						<Stat className="relative overflow-hidden">
							<BorderBeam
								size={100}
								duration={10}
								colorFrom="var(--color-success)"
								colorTo="oklch(from var(--color-success) l c h / 0.3)"
							/>
							<StatLabel>Total Revenue</StatLabel>
							<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
								<span className="text-lg">$</span>
								<NumberTicker
									value={metrics.totalRevenue / 100}
									duration={1500}
								/>
							</StatValue>
							<StatIndicator variant="icon" color="success">
								<DollarSign />
							</StatIndicator>
							<StatTrend trend={metrics.revenueTrend && metrics.revenueTrend >= 0 ? 'up' : 'down'}>
								<AnimatedTrendIndicator
									value={metrics.revenueTrend ?? 0}
									size="sm"
									delay={500}
								/>
								<span className="text-muted-foreground">vs last period</span>
							</StatTrend>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.3} inView>
						<Stat className="relative overflow-hidden">
							<StatLabel>Net Income</StatLabel>
							<StatValue className="flex items-baseline gap-0.5">
								<span className="text-lg">$</span>
								<NumberTicker
									value={metrics.netIncome / 100}
									duration={1500}
								/>
							</StatValue>
							<StatIndicator variant="icon" color="primary">
								<TrendingUp />
							</StatIndicator>
							<StatTrend trend={metrics.profitMargin && metrics.profitMargin >= 0 ? 'up' : 'down'}>
								<AnimatedTrendIndicator
									value={metrics.profitMargin ?? 0}
									size="sm"
									delay={600}
								/>
								<span className="text-muted-foreground">profit margin</span>
							</StatTrend>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.4} inView>
						<Stat className="relative overflow-hidden">
							<StatLabel>Portfolio ROI</StatLabel>
							<StatValue className="flex items-baseline gap-0.5">
								<NumberTicker
									value={metrics.profitMargin ?? 0}
									duration={1500}
									decimalPlaces={1}
								/>
								<span className="text-lg">%</span>
							</StatValue>
							<StatIndicator variant="icon" color="info">
								<BarChart3 />
							</StatIndicator>
							<StatTrend trend={metrics.expenseTrend && metrics.expenseTrend >= 0 ? 'up' : 'down'}>
								<AnimatedTrendIndicator
									value={metrics.expenseTrend ?? 0}
									size="sm"
									delay={700}
								/>
								<span className="text-muted-foreground">expense trend</span>
							</StatTrend>
						</Stat>
					</BlurFade>

					<BlurFade delay={0.5} inView>
						<Stat className="relative overflow-hidden">
							<StatLabel>Cash Flow</StatLabel>
							<StatValue className="flex items-baseline gap-0.5">
								<span className="text-lg">$</span>
								<NumberTicker value={metrics.cashFlow / 100} duration={1500} />
							</StatValue>
							<StatIndicator variant="icon" color="success">
								<DollarSign />
							</StatIndicator>
							<StatTrend trend={metrics.revenueTrend && metrics.revenueTrend >= 0 ? 'up' : 'down'}>
								<AnimatedTrendIndicator
									value={metrics.revenueTrend ?? 0}
									size="sm"
									delay={800}
								/>
								<span className="text-muted-foreground">operating cash</span>
							</StatTrend>
						</Stat>
					</BlurFade>
				</div>

				{/* Payment Summary */}
				<BlurFade delay={0.55} inView>
					<div className="mb-8">
						<OwnerPaymentSummary summary={paymentSummary} />
					</div>
				</BlurFade>

				{/* Charts Row 1: Revenue & Expenses + Breakdowns */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
					<BlurFade delay={0.6} inView>
						<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="font-medium text-foreground">
										Revenue & Expenses
									</h3>
									<p className="text-sm text-muted-foreground">
										Monthly breakdown of income and costs
									</p>
								</div>
								<BarChart3 className="w-5 h-5 text-muted-foreground" />
							</div>
							<RevenueExpenseChart data={monthlyMetrics} />
						</div>
					</BlurFade>

					<div className="space-y-6">
						<BlurFade delay={0.7} inView>
							<div className="bg-card border border-border rounded-lg p-6">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="font-medium text-foreground">
											Revenue Breakdown
										</h3>
										<p className="text-sm text-muted-foreground">By category</p>
									</div>
									<PieChart className="w-5 h-5 text-muted-foreground" />
								</div>
								<BreakdownList title="Revenue Sources" rows={breakdown.revenue} />
							</div>
						</BlurFade>

						<BlurFade delay={0.8} inView>
							<div className="bg-card border border-border rounded-lg p-6">
								<div className="flex items-center justify-between mb-4">
									<div>
										<h3 className="font-medium text-foreground">
											Expense Breakdown
										</h3>
										<p className="text-sm text-muted-foreground">By category</p>
									</div>
									<PieChart className="w-5 h-5 text-muted-foreground" />
								</div>
								<BreakdownList
									title="Expense Categories"
									rows={breakdown.expenses}
								/>
							</div>
						</BlurFade>
					</div>
				</div>

				{/* Charts Row 2: NOI & Lease Profitability */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					<BlurFade delay={0.9} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="font-medium text-foreground">
										Net Operating Income
									</h3>
									<p className="text-sm text-muted-foreground">
										Revenue minus operating expenses over time
									</p>
								</div>
								<BarChart3 className="w-5 h-5 text-muted-foreground" />
							</div>
							<NetOperatingIncomeChart data={netOperatingIncome} />
						</div>
					</BlurFade>

					<BlurFade delay={1.0} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="font-medium text-foreground">
										Lease Profitability
									</h3>
									<p className="text-sm text-muted-foreground">
										Top performing leases by profitability score
									</p>
								</div>
							</div>
							<LeaseTable leases={leaseAnalytics} />
						</div>
					</BlurFade>
				</div>

				{/* Charts Row 3: Billing & Invoice Summary */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<BlurFade delay={1.1} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="font-medium text-foreground">
										Billing Timeline
									</h3>
									<p className="text-sm text-muted-foreground">
										Invoice status and payment patterns
									</p>
								</div>
								<BarChart3 className="w-5 h-5 text-muted-foreground" />
							</div>
							<BillingTimelineChart data={billingInsights} />
						</div>
					</BlurFade>

					<BlurFade delay={1.2} inView>
						<div className="bg-card border border-border rounded-lg p-6">
							<div className="flex items-center justify-between mb-6">
								<div>
									<h3 className="font-medium text-foreground">
										Invoice Summary
									</h3>
									<p className="text-sm text-muted-foreground">
										Status breakdown
									</p>
								</div>
							</div>
							<div className="space-y-4">
								{invoiceSummary.map((status, index) => (
									<BlurFade key={status.status} delay={1.3 + index * 0.05} inView>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="text-sm">{status.status}</span>
												<Badge variant="outline">{status.count}</Badge>
											</div>
											<p className="text-sm text-muted-foreground">
												{formatCurrency(status.amount)}
											</p>
										</div>
									</BlurFade>
								))}
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</RefreshableAnalytics>
	)
}
