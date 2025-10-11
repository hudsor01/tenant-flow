import type { CSSProperties } from 'react'

import { ExportButtons } from '@/components/export/export-buttons'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { getFinancialAnalyticsPageData } from '@/lib/api/analytics-server'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import type {
	FinancialBreakdownRow,
	LeaseFinancialInsight
} from '@repo/shared/types/financial-analytics'
import { ArrowDownRight, ArrowUpRight, FileDown } from 'lucide-react'
import Link from 'next/link'
import {
	BillingTimelineChart,
	NetOperatingIncomeChart,
	RevenueExpenseChart
} from './financial-charts'

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
			<div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed">
				<p className="text-sm text-muted-foreground">
					We couldn't find leases with financial analytics yet.
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

export default async function FinancialAnalyticsPage() {
	const data = await getFinancialAnalyticsPageData()
	const {
		metrics,
		breakdown,
		netOperatingIncome,
		billingInsights,
		expenseSummary,
		invoiceSummary,
		monthlyMetrics,
		leaseSummary,
		leaseAnalytics
	} = data

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div
				className="border-b bg-background"
				style={{
					padding: 'var(--dashboard-content-padding)',
					borderColor: 'var(--color-fill-tertiary)'
				}}
			>
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
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

			<div
				className="flex-1"
				style={{
					padding: 'var(--dashboard-content-padding)',
					paddingTop: 'var(--dashboard-section-gap)',
					paddingBottom: 'var(--dashboard-section-gap)'
				}}
			>
				<div
					className="mx-auto max-w-[1600px] space-y-8 px-4 lg:px-6"
					style={
						{ '--space-y': 'var(--dashboard-section-gap)' } as CSSProperties
					}
				>
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Card className="xl:col-span-2">
							<CardHeader>
								<CardTitle>Revenue vs. Expenses</CardTitle>
								<CardDescription>Month-over-month performance</CardDescription>
							</CardHeader>
							<CardContent>
								<RevenueExpenseChart data={monthlyMetrics} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Top Properties by NOI</CardTitle>
								<CardDescription>Property performance</CardDescription>
							</CardHeader>
							<CardContent>
								<NetOperatingIncomeChart data={netOperatingIncome} />
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Revenue & Expense Breakdown</CardTitle>
								<CardDescription>
									Top categories contributing to performance
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<BreakdownList
									title="Revenue streams"
									rows={breakdown.revenue}
								/>
								<BreakdownList
									title="Expense drivers"
									rows={breakdown.expenses}
								/>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Billing timeline</CardTitle>
								<CardDescription>
									Invoices, payments, and overdue balances
								</CardDescription>
							</CardHeader>
							<CardContent>
								<BillingTimelineChart data={billingInsights} />
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Expense summary</CardTitle>
								<CardDescription>
									Year-to-date spending by category
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Category</TableHead>
											<TableHead className="text-right">Amount</TableHead>
											<TableHead className="text-right">Share</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{expenseSummary.categories.slice(0, 6).map(category => (
											<TableRow key={category.category}>
												<TableCell className="font-medium">
													{category.category}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(category.amount)}
												</TableCell>
												<TableCell className="text-right">
													{formatPercentage(category.percentage)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex items-center justify-between rounded-lg bg-muted/40 p-4 text-sm">
									<div>
										<p className="font-medium">Total expenses</p>
										<p className="text-muted-foreground">
											Monthly average{' '}
											{formatCurrency(
												expenseSummary?.totals?.monthlyAverage ?? 0
											)}
										</p>
									</div>
									<div className="text-right">
										<p className="font-semibold">
											{formatCurrency(expenseSummary?.totals?.amount ?? 0)}
										</p>
										{expenseSummary?.totals?.yearOverYearChange !== null &&
											expenseSummary?.totals?.yearOverYearChange !==
												undefined && (
												<TrendPill
													value={expenseSummary.totals.yearOverYearChange}
												/>
											)}
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Lease profitability</CardTitle>
								<CardDescription>
									Revenue contribution and outstanding balances
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div className="rounded-lg bg-muted/40 p-4">
										<p className="text-muted-foreground">Active leases</p>
										<p className="text-2xl font-semibold">
											{formatNumber(leaseSummary?.activeLeases ?? 0)}
										</p>
									</div>
									<div className="rounded-lg bg-muted/40 p-4">
										<p className="text-muted-foreground">Monthly rent</p>
										<p className="text-2xl font-semibold">
											{formatCurrency(leaseSummary?.totalMonthlyRent ?? 0)}
										</p>
									</div>
								</div>
								<LeaseTable leases={leaseAnalytics} />
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Invoice status</CardTitle>
							<CardDescription>
								Current distribution across the billing pipeline
							</CardDescription>
						</CardHeader>
						<CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
							{invoiceSummary.map(status => (
								<div
									key={status.status}
									className="rounded-lg border p-4 shadow-sm"
								>
									<p className="text-sm font-medium text-muted-foreground">
										{status.status}
									</p>
									<p className="text-2xl font-semibold">
										{formatCurrency(status.amount)}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatNumber(status.count)} invoices
									</p>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
