import { RefreshableAnalytics } from '#app/(protected)/manage/analytics/refreshable-analytics'
import { ExportButtons } from '#components/export/export-buttons'
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
import { getFinancialAnalyticsPageData } from '#lib/api/analytics-server'
import { serverFetch } from '#lib/api/server'
import { formatCurrency, formatNumber, formatPercentage } from '@repo/shared/utils/currency'
import type {
	FinancialBreakdownRow,
	LeaseFinancialInsight
} from '@repo/shared/types/financial-analytics'
import { ArrowDownRight, ArrowUpRight, FileDown } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'
import {
	BillingTimelineChart,
	NetOperatingIncomeChart,
	RevenueExpenseChart
} from './financial-charts'
import type { OwnerPaymentSummaryResponse } from '@repo/shared/types/api-contracts'
import { OwnerPaymentSummary } from '#components/analytics/owner-payment-summary'

// Next.js 16: Dynamic behavior is controlled by cacheComponents
// Remove force-dynamic as it's incompatible with cacheComponents

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
				<p className="text-sm font-medium text-muted-foreground">{title}</p>
				<Link
					className="text-xs text-muted-foreground underline-offset-2 hover:underline"
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
							<span className="text-sm font-medium">{item.label}</span>
							{item.change !== null && <TrendPill value={item.change} />}
						</div>
						<div className="text-sm text-muted-foreground">
							{formatCurrency(item.value)}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function LeaseTable({ leases }: { leases: LeaseFinancialInsight[] }) {
	if (!leases.length) {
		return (
			<div className="flex min-h-50 flex-col items-center justify-center rounded-lg border border-dashed">
				<p className="text-sm text-muted-foreground">
					We couldn&apos;t find leases with financial analytics yet.
				</p>
			</div>
		)
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Lease</TableHead>
					<TableHead>Tenant</TableHead>
					<TableHead>Property</TableHead>
					<TableHead className="text-right">Monthly Rent</TableHead>
					<TableHead className="text-right">Outstanding</TableHead>
					<TableHead className="text-right">Profitability</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{leases.slice(0, 6).map(lease => (
					<TableRow key={lease.leaseId}>
						<TableCell className="font-medium">{lease.leaseId}</TableCell>
						<TableCell>{lease.tenantName}</TableCell>
						<TableCell>{lease.propertyName}</TableCell>
						<TableCell className="text-right">
							{formatCurrency(lease.monthlyRent)}
						</TableCell>
						<TableCell className="text-right">
							{formatCurrency(lease.outstandingBalance)}
						</TableCell>
						<TableCell className="text-right">
							{lease.profitabilityScore !== null &&
							lease.profitabilityScore !== undefined
								? formatNumber(lease.profitabilityScore, {
										maximumFractionDigits: 1
									})
								: '—'}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

	async function FinancialAnalyticsContent() {
		const data = await getFinancialAnalyticsPageData()
		const paymentSummary = await serverFetch<OwnerPaymentSummaryResponse>(
			'/api/v1/tenants/payments/summary'
		)
	const {
		metrics,
		breakdown,
		netOperatingIncome,
		billingInsights,
		invoiceSummary,
		monthlyMetrics,
		leaseAnalytics
	} = data

	return (
		<RefreshableAnalytics cooldownSeconds={30}>
			<div className="@container/main flex min-h-screen w-full flex-col">
				<OwnerPaymentSummary summary={paymentSummary} />
				<div className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1 className="text-3xl font-semibold tracking-tight">
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
								className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
								href="#"
							>
								<FileDown className="size-4" />
								Download insight summary
							</a>
						</div>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
							<Card className="@container/card">
								<CardHeader>
									<CardTitle>Total Revenue</CardTitle>
									<CardDescription>Last 30 days</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-3xl font-semibold tabular-nums">
										{formatCurrency(metrics.totalRevenue)}
									</p>
									<TrendPill value={metrics.revenueTrend ?? null} />
								</CardContent>
							</Card>
							<Card className="@container/card">
								<CardHeader>
									<CardTitle>Net Income</CardTitle>
									<CardDescription>After expenses</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-3xl font-semibold tabular-nums">
										{formatCurrency(metrics.netIncome)}
									</p>
									<TrendPill value={metrics.profitMargin ?? null} />
								</CardContent>
							</Card>
							<Card className="@container/card">
								<CardHeader>
									<CardTitle>Portfolio ROI</CardTitle>
									<CardDescription>Trailing twelve months</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-3xl font-semibold tabular-nums">
										{metrics.profitMargin !== null &&
										metrics.profitMargin !== undefined
											? formatPercentage(metrics.profitMargin)
											: '—'}
									</p>
									<TrendPill value={metrics.expenseTrend ?? null} />
								</CardContent>
							</Card>
							<Card className="@container/card">
								<CardHeader>
									<CardTitle>Cash Flow</CardTitle>
									<CardDescription>Operating cash</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<p className="text-3xl font-semibold tabular-nums">
										{formatCurrency(metrics.cashFlow)}
									</p>
									<TrendPill value={metrics.revenueTrend ?? null} />
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
				<div className="flex-1 bg-muted/30 p-6">
					<div className="mx-auto max-w-400 space-y-6 px-4 lg:px-6">
						<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
							<div className="xl:col-span-2">
								<Card>
									<CardHeader>
										<CardTitle>Revenue & Expenses</CardTitle>
										<CardDescription>
											Monthly breakdown of income and costs
										</CardDescription>
									</CardHeader>
									<CardContent>
										<RevenueExpenseChart data={monthlyMetrics} />
									</CardContent>
								</Card>
							</div>
							<div className="space-y-6">
								<Card>
									<CardHeader>
										<CardTitle>Revenue Breakdown</CardTitle>
										<CardDescription>By category</CardDescription>
									</CardHeader>
									<CardContent>
										<BreakdownList
											title="Revenue Sources"
											rows={breakdown.revenue}
										/>
									</CardContent>
								</Card>
								<Card>
									<CardHeader>
										<CardTitle>Expense Breakdown</CardTitle>
										<CardDescription>By category</CardDescription>
									</CardHeader>
									<CardContent>
										<BreakdownList
											title="Expense Categories"
											rows={breakdown.expenses}
										/>
									</CardContent>
								</Card>
							</div>
						</div>
						<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Net Operating Income</CardTitle>
									<CardDescription>
										Revenue minus operating expenses over time
									</CardDescription>
								</CardHeader>
								<CardContent>
									<NetOperatingIncomeChart data={netOperatingIncome} />
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>Lease Profitability</CardTitle>
									<CardDescription>
										Top performing leases by profitability score
									</CardDescription>
								</CardHeader>
								<CardContent>
									<LeaseTable leases={leaseAnalytics} />
								</CardContent>
							</Card>
						</div>
						<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Billing Timeline</CardTitle>
									<CardDescription>
										Invoice status and payment patterns
									</CardDescription>
								</CardHeader>
								<CardContent>
									<BillingTimelineChart data={billingInsights} />
								</CardContent>
							</Card>
							<Card>
								<CardHeader>
									<CardTitle>Invoice Summary</CardTitle>
									<CardDescription>Status breakdown</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									{invoiceSummary.map(status => (
										<div
											key={status.status}
											className="flex items-center justify-between"
										>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">
													{status.status}
												</span>
												<Badge variant="outline">{status.count}</Badge>
											</div>
											<p className="text-xs text-muted-foreground">
												{formatCurrency(status.amount)}
											</p>
										</div>
									))}
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>
		</RefreshableAnalytics>
	)
}

function FinancialAnalyticsSkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
# Additional component after top metrics
			<div className="border-b bg-background p-6 border-(--color-fill-tertiary)">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Financial Analytics
						</h1>
						<p className="text-muted-foreground">
							Track revenue, profitability, and portfolio cash flow in real
							time.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i} className="@container/card">
								<CardHeader>
									<div className="h-4 bg-muted rounded animate-pulse" />
									<div className="h-3 bg-muted rounded animate-pulse w-2/3" />
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="h-8 bg-muted rounded animate-pulse" />
									<div className="h-5 bg-muted rounded animate-pulse w-1/2" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
			<OwnerPaymentSummary summary={null} />
			<div className="flex-1 bg-muted/30 p-6">
				<div className="mx-auto max-w-400 space-y-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<div className="xl:col-span-2">
							<Card>
								<CardHeader>
									<div className="h-5 bg-muted rounded animate-pulse" />
									<div className="h-4 bg-muted rounded animate-pulse w-3/4" />
								</CardHeader>
								<CardContent>
									<div className="h-64 bg-muted rounded animate-pulse" />
								</CardContent>
							</Card>
						</div>
						<div className="space-y-6">
							{Array.from({ length: 2 }).map((_, i) => (
								<Card key={i}>
									<CardHeader>
										<div className="h-5 bg-muted rounded animate-pulse" />
										<div className="h-4 bg-muted rounded animate-pulse w-1/2" />
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											{Array.from({ length: 3 }).map((_, j) => (
												<div key={j} className="h-4 bg-muted rounded animate-pulse" />
											))}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function FinancialAnalyticsPage() {
	return (
		<Suspense fallback={<FinancialAnalyticsSkeleton />}>
			<FinancialAnalyticsContent />
		</Suspense>
	)
}
