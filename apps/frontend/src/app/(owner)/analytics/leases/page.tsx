'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
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
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import { formatCurrency, formatNumber } from '#lib/formatters/currency'
import { FileText } from 'lucide-react'
import { LeaseLifecycleChart, LeaseStatusChart } from './lease-charts'

function LeaseAnalyticsSkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section className="border-b bg-background p-6 border-fill-tertiary">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>Lease Analytics</h1>
						<p className="text-muted-foreground">
							Understanding profitability, renewals, and upcoming expirations.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Card key={i}>
								<CardHeader>
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-32" />
								</CardHeader>
								<CardContent className="pt-0">
									<Skeleton className="h-8 w-20" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>
			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-48" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<Skeleton className="h-5 w-32" />
								<Skeleton className="h-4 w-40" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-64 w-full" />
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
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
	const hasData = metrics.totalLeases > 0 ||
		metrics.activeLeases > 0 ||
		profitability.length > 0 ||
		lifecycle.length > 0

	if (!hasData) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-fill-tertiary">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Lease Analytics</h1>
							<p className="text-muted-foreground">
								Understanding profitability, renewals, and upcoming expirations.
							</p>
						</div>
					</div>
				</section>
				<section className="flex-1 p-6">
					<div className="mx-auto max-w-400 px-4 lg:px-6">
						<Empty className="min-h-96 border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<FileText />
								</EmptyMedia>
								<EmptyTitle>No lease data yet</EmptyTitle>
								<EmptyDescription>
									Create leases for your tenants to start tracking analytics and profitability.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					</div>
				</section>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-fill-tertiary"
			>
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>
							Lease Analytics
						</h1>
						<p className="text-muted-foreground">
							Understand profitability, renewals, and upcoming expirations.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader>
								<CardTitle>Total leases</CardTitle>
								<CardDescription>Tracked agreements</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.totalLeases)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Active leases</CardTitle>
								<CardDescription>Currently generating rent</CardDescription>
							</CardHeader>
							<CardContent className="flex items-end justify-between pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.activeLeases)}
								</p>
								<Badge variant="outline" className="text-xs">
									{formatNumber(metrics.expiringSoon)} expiring soon
								</Badge>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Monthly rent</CardTitle>
								<CardDescription>Total recurring rent</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(metrics.totalrent_amount)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Average lease value</CardTitle>
								<CardDescription>Monthly rent per lease</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(metrics.averageLeaseValue)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Lease lifecycle</CardTitle>
								<CardDescription>
									Renewals, expirations, and notices over time
								</CardDescription>
							</CardHeader>
							<CardContent>
								<LeaseLifecycleChart points={lifecycle} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Status breakdown</CardTitle>
								<CardDescription>Distribution of lease states</CardDescription>
							</CardHeader>
							<CardContent>
								<LeaseStatusChart breakdown={statusBreakdown} />
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Lease profitability</CardTitle>
							<CardDescription>
								Revenue contribution and outstanding balances
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Lease</TableHead>
										<TableHead>Tenant</TableHead>
										<TableHead>Property</TableHead>
										<TableHead className="text-right">Monthly rent</TableHead>
										<TableHead className="text-right">Outstanding</TableHead>
										<TableHead className="text-right">Score</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{profitability && profitability.length > 0 ? (
										profitability.slice(0, 8).map(lease => (
											<TableRow key={lease.lease_id}>
												<TableCell className="font-medium">
													{lease.lease_id}
												</TableCell>
												<TableCell>{lease.tenantName}</TableCell>
												<TableCell>{lease.propertyName}</TableCell>
												<TableCell className="text-right">
													{formatCurrency(lease.rent_amount)}
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
										))
									) : (
										<TableRow>
											<TableCell colSpan={6} className="text-center text-muted-foreground">
												No lease profitability data available
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
