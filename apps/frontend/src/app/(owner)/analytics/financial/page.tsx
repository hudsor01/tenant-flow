'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { RefreshableAnalytics } from '#app/(owner)/analytics/refreshable-analytics'
import { ExportButtons } from '#components/export/export-buttons'
import { BlurFade } from '#components/ui/blur-fade'
import { BarChart3, FileDown, PieChart } from 'lucide-react'
import { OwnerPaymentSummary } from '#components/analytics/owner-payment-summary'
import { EMPTY_PAYMENT_SUMMARY } from '@repo/shared/types/api-contracts'
import {
	BillingTimelineChart,
	NetOperatingIncomeChart,
	RevenueExpenseChart
} from './financial-charts'
import { FinancialAnalyticsSkeleton } from './_components/financial-analytics-skeleton'
import { FinancialOverviewStats } from './_components/financial-overview-stats'
import { BreakdownList } from './_components/breakdown-list'
import { LeaseTable } from './_components/lease-table'
import { InvoiceSummaryList } from './_components/invoice-summary-list'

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
			totalExpenses: 0,
			netIncome: 0,
			cashFlow: 0
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
				<FinancialOverviewStats metrics={metrics} />

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
							<InvoiceSummaryList invoiceSummary={invoiceSummary} />
						</div>
					</BlurFade>
				</div>
			</div>
		</RefreshableAnalytics>
	)
}
