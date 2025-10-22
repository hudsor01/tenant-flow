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
import { getLeaseAnalyticsPageData } from '@/lib/api/analytics-server'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { LeaseLifecycleChart, LeaseStatusChart } from './lease-charts'

export default async function LeaseAnalyticsPage() {
	const data = await getLeaseAnalyticsPageData()
	const { metrics, profitability, lifecycle, statusBreakdown } = data

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
			>
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
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
									{formatCurrency(metrics.totalMonthlyRent)}
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
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
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
									{profitability.slice(0, 8).map(lease => (
										<TableRow key={lease.leaseId}>
											<TableCell className="font-medium">
												{lease.leaseId}
											</TableCell>
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
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
