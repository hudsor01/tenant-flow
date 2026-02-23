'use client'

import { Badge } from '#components/ui/badge'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { TrendingUp } from 'lucide-react'
import type { ReportPaymentAnalytics, OccupancyMetrics } from '@repo/shared/types/reports'
import { formatCurrency } from '#lib/formatters/currency'

const formatWholeAmount = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const formatPercent = (value: number) => `${value.toFixed(1)}%`

interface AnalyticsStatsRowProps {
	paymentAnalytics: ReportPaymentAnalytics | undefined
	occupancyMetrics: OccupancyMetrics | undefined
	paymentsLoading: boolean
	occupancyLoading: boolean
}

export function AnalyticsStatsRow({
	paymentAnalytics,
	occupancyMetrics,
	paymentsLoading,
	occupancyLoading
}: AnalyticsStatsRowProps) {
	const isLoading = paymentsLoading || occupancyLoading

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
			{isLoading ? (
				<>
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
				</>
			) : (
				<>
					<Card className="@container/card">
						<CardHeader>
							<CardDescription>Total Revenue</CardDescription>
							<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
								{formatWholeAmount(paymentAnalytics?.totalRevenue || 0)}
							</CardTitle>
							<CardAction>
								<Badge variant="outline">
									<TrendingUp />
									All payments
								</Badge>
							</CardAction>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="line-clamp-1 flex gap-2 font-medium">
								Successful collections <TrendingUp className="size-4" />
							</div>
							<div className="text-muted-foreground">All successful payments</div>
						</CardFooter>
					</Card>

					<Card className="@container/card">
						<CardHeader>
							<CardDescription>Payment Success</CardDescription>
							<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
								{formatPercent(
									paymentAnalytics?.totalPayments
										? (paymentAnalytics.successfulPayments /
												paymentAnalytics.totalPayments) *
												100
										: 0
								)}
							</CardTitle>
							<CardAction>
								<Badge variant="outline">
									<TrendingUp />
									{paymentAnalytics?.totalPayments || 0} total
								</Badge>
							</CardAction>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="line-clamp-1 flex gap-2 font-medium">
								Strong performance <TrendingUp className="size-4" />
							</div>
							<div className="text-muted-foreground">
								{paymentAnalytics?.successfulPayments || 0} of{' '}
								{paymentAnalytics?.totalPayments || 0} payments
							</div>
						</CardFooter>
					</Card>

					<Card className="@container/card">
						<CardHeader>
							<CardDescription>Occupancy Rate</CardDescription>
							<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
								{formatPercent(occupancyMetrics?.occupancyRate || 0)}
							</CardTitle>
							<CardAction>
								<Badge variant="outline">
									<TrendingUp />
									{occupancyMetrics?.totalUnits || 0} units
								</Badge>
							</CardAction>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="line-clamp-1 flex gap-2 font-medium">
								Portfolio health <TrendingUp className="size-4" />
							</div>
							<div className="text-muted-foreground">
								{occupancyMetrics?.occupiedUnits || 0} of{' '}
								{occupancyMetrics?.totalUnits || 0} units occupied
							</div>
						</CardFooter>
					</Card>

					<Card className="@container/card">
						<CardHeader>
							<CardDescription>ACH Adoption</CardDescription>
							<CardTitle className="typography-h3 tabular-nums @[250px]/card:text-3xl">
								{formatPercent(
									paymentAnalytics?.totalPayments
										? (paymentAnalytics.paymentsByMethod.ach /
												paymentAnalytics.totalPayments) *
												100
										: 0
								)}
							</CardTitle>
							<CardAction>
								<Badge variant="outline">
									<TrendingUp />
									Lower fees
								</Badge>
							</CardAction>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="line-clamp-1 flex gap-2 font-medium">
								Cost savings <TrendingUp className="size-4" />
							</div>
							<div className="text-muted-foreground">
								Bank transfer vs card
							</div>
						</CardFooter>
					</Card>
				</>
			)}
		</div>
	)
}
