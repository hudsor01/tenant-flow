'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { ChartLoadingSkeleton } from '#components/shared/chart-loading-skeleton'

const ChartAreaInteractive = dynamic(
	() =>
		import('#components/dashboard/chart-area-interactive').then(
			mod => mod.ChartAreaInteractive
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { EMPTY_PAYMENT_SUMMARY } from '#types/api-contracts'
import type { DashboardStats } from '#types/stats'
import type {
	DashboardSummary,
	PropertyPerformance
} from '#types/core'
import {
	Building2,
	Calendar,
	TrendingDown,
	TrendingUp,
	BarChart3
} from 'lucide-react'
import { OwnerPaymentSummary } from '#components/analytics/owner-payment-summary'
import { AnalyticsStatCards } from './analytics-stat-cards'

function AnalyticsSkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<Skeleton className="h-7 w-32 mb-2" />
					<Skeleton className="h-5 w-64" />
				</div>
				<div className="flex gap-2">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-16" />
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-48 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-40 mb-2" />
					<Skeleton className="h-4 w-36 mb-6" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-14 w-full" />
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

export default function AnalyticsPage() {
	const { data: overviewData, isLoading: overviewLoading } = useQuery(
		analyticsQueries.overviewPageData()
	)
	const { data: paymentSummary = EMPTY_PAYMENT_SUMMARY } = useQuery(
		analyticsQueries.ownerPaymentSummary()
	)

	if (overviewLoading) {
		return <AnalyticsSkeleton />
	}

	const { financial } = overviewData || {}
	const financialMetrics = financial?.metrics

	const stats = {
		revenue: { growth: financialMetrics?.revenueTrend ?? 0 },
		units: { occupancyChange: 0 }
	} as DashboardStats
	const financialStats = {
		avgRoi:
			financialMetrics?.netIncome && financialMetrics?.totalRevenue
				? (financialMetrics.netIncome / financialMetrics.totalRevenue) * 100
				: 0
	} as DashboardSummary
	const properties = [] as PropertyPerformance[]

	const revenueGrowth = stats?.revenue?.growth ?? 0
	const occupancyChange = stats?.units?.occupancyChange ?? 0
	const avgRoi = financialStats?.avgRoi ?? 0
	const occupancyRate = stats?.units?.occupancyRate ?? 0
	const activeTenants = stats?.units?.occupied ?? 0
	const tenantsChange = Math.max(0, Math.round(occupancyChange * 10))
	const monthlyRevenue = (stats?.revenue?.monthly ?? 0) * 100

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
						<p className="text-muted-foreground">Portfolio performance and insights.</p>
					</div>
					<div className="flex gap-2">
						<Select defaultValue="30_days">
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="Time range" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="30_days">Last 30 Days</SelectItem>
								<SelectItem value="3_months">Last 3 Months</SelectItem>
								<SelectItem value="6_months">Last 6 Months</SelectItem>
								<SelectItem value="12_months">Last 12 Months</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</BlurFade>

			<AnalyticsStatCards
				occupancyRate={occupancyRate}
				occupancyChange={occupancyChange}
				activeTenants={activeTenants}
				tenantsChange={tenantsChange}
				monthlyRevenue={monthlyRevenue}
				revenueGrowth={revenueGrowth}
				avgRoi={avgRoi}
				openMaintenance={0}
				maintenanceChange={0}
			/>

			<BlurFade delay={0.55} inView>
				<div className="mb-8">
					<OwnerPaymentSummary summary={paymentSummary} />
				</div>
			</BlurFade>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Revenue & Expenses Trend</h3>
								<p className="text-sm text-muted-foreground">6-month performance overview</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<div className="flex items-center gap-4 mb-4">
							<div className="flex items-center gap-2">
								<div className="size-3 rounded-sm bg-chart-3" />
								<span className="text-sm text-muted-foreground">Revenue</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="size-3 rounded-sm bg-chart-5" />
								<span className="text-sm text-muted-foreground">Expenses</span>
							</div>
						</div>
						<ChartAreaInteractive />
					</div>
				</BlurFade>

				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Top Performing Properties</h3>
								<p className="text-sm text-muted-foreground">Ranked by monthly revenue</p>
							</div>
							<Button variant="ghost" size="sm">
								<Calendar className="size-4 mr-2" />
								This Month
							</Button>
						</div>
						<div className="space-y-3">
							{properties.length > 0 ? (
								properties.slice(0, 5).map((property, index: number) => (
									<BlurFade key={property.property ?? `property-${index}`} delay={0.8 + index * 0.05} inView>
										<div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
											<div className="flex items-center gap-3">
												<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Building2 className="w-5 h-5 text-primary" />
												</div>
												<div>
													<p className="font-medium text-foreground">{property.property || 'Unknown Property'}</p>
													<p className="text-sm text-muted-foreground">{property.occupiedUnits || 0}/{property.totalUnits || 0} units occupied</p>
												</div>
											</div>
											<Badge variant={(property.occupancyRate || 0) >= 90 ? 'default' : 'destructive'} className="text-xs">
												{(property.occupancyRate || 0) >= 90 ? <TrendingUp className="size-3 mr-1" /> : <TrendingDown className="size-3 mr-1" />}
												{property.occupancyRate ? `${property.occupancyRate.toFixed(1)}%` : '0.0%'}
											</Badge>
										</div>
									</BlurFade>
								))
							) : (
								<div className="text-center text-muted-foreground py-8">
									No property data available yet.
								</div>
							)}
						</div>
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
