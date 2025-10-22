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
import { getPropertyPerformancePageData } from '@/lib/api/analytics-server'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import {
	PropertyOccupancyChart,
	VisitorAnalyticsChart
} from './property-charts'

export default async function PropertyPerformancePage() {
	const data = await getPropertyPerformancePageData()
	const { metrics, performance, units, unitStats, visitorAnalytics } = data

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-[var(--color-fill-tertiary)]"
			>
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
							Property Performance
						</h1>
						<p className="text-muted-foreground">
							Monitor occupancy, revenue, and demand signals across your
							portfolio.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader>
								<CardTitle>Total properties</CardTitle>
								<CardDescription>Tracked in this workspace</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.totalProperties)}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Average occupancy</CardTitle>
								<CardDescription>Portfolio-wide</CardDescription>
							</CardHeader>
							<CardContent className="flex items-end justify-between pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatPercentage(metrics.averageOccupancy)}
								</p>
								<Badge variant="outline" className="text-xs">
									{formatNumber(metrics.occupiedUnits)} of{' '}
									{formatNumber(metrics.totalUnits)} units occupied
								</Badge>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Best performer</CardTitle>
								<CardDescription>Highest occupancy rate</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{metrics.bestPerformer ?? '—'}
								</p>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Monthly revenue</CardTitle>
								<CardDescription>Combined across properties</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatCurrency(metrics.totalRevenue)}
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 lg:px-6">
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Card className="xl:col-span-2">
							<CardHeader>
								<CardTitle>Occupancy & revenue by property</CardTitle>
								<CardDescription>
									Compare current performance across the portfolio
								</CardDescription>
							</CardHeader>
							<CardContent>
								<PropertyOccupancyChart data={performance} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Portfolio KPIs</CardTitle>
								<CardDescription>
									Highlights from unit-level statistics
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 pt-0">
								{unitStats.slice(0, 6).map(stat => (
									<div
										key={stat.label}
										className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
									>
										<span className="text-muted-foreground">{stat.label}</span>
										<span className="font-medium tabular-nums">
											{formatNumber(stat.value)}
											{stat.trend !== null && stat.trend !== undefined && (
												<Badge
													variant={stat.trend >= 0 ? 'outline' : 'destructive'}
													className="ml-2"
												>
													{formatPercentage(Math.abs(stat.trend))}
												</Badge>
											)}
										</span>
									</div>
								))}
							</CardContent>
						</Card>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Visitor analytics</CardTitle>
								<CardDescription>
									How prospective tenants engage with listings
								</CardDescription>
							</CardHeader>
							<CardContent>
								<VisitorAnalyticsChart data={visitorAnalytics} />
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Top properties</CardTitle>
								<CardDescription>
									Key metrics for high-performing assets
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3 pt-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Property</TableHead>
											<TableHead className="text-right">Occupancy</TableHead>
											<TableHead className="text-right">Units</TableHead>
											<TableHead className="text-right">
												Monthly revenue
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{performance.slice(0, 6).map(property => (
											<TableRow key={property.propertyId}>
												<TableCell>{property.propertyName}</TableCell>
												<TableCell className="text-right">
													{formatPercentage(property.occupancyRate)}
												</TableCell>
												<TableCell className="text-right">
													{formatNumber(property.occupiedUnits)}/
													{formatNumber(property.totalUnits)}
												</TableCell>
												<TableCell className="text-right">
													{formatCurrency(property.monthlyRevenue)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Active units</CardTitle>
							<CardDescription>
								Recently updated unit information
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Unit</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Bedrooms</TableHead>
										<TableHead className="text-right">Bathrooms</TableHead>
										<TableHead className="text-right">Rent</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{units.slice(0, 8).map(unit => (
										<TableRow key={`${unit.propertyId}-${unit.unitId}`}>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium">{unit.unitNumber}</span>
													<span className="text-xs text-muted-foreground">
														{unit.propertyId}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{unit.status}</Badge>
											</TableCell>
											<TableCell className="text-right">
												{unit.bedrooms !== null && unit.bedrooms !== undefined
													? formatNumber(unit.bedrooms)
													: '—'}
											</TableCell>
											<TableCell className="text-right">
												{unit.bathrooms !== null && unit.bathrooms !== undefined
													? formatNumber(unit.bathrooms)
													: '—'}
											</TableCell>
											<TableCell className="text-right">
												{unit.rent !== null && unit.rent !== undefined
													? formatCurrency(unit.rent)
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
