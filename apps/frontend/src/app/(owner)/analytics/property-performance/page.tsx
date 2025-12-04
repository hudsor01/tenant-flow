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
import { formatCurrency, formatNumber, formatPercentage } from '#lib/formatters/currency'
import type {
	PropertyPerformanceSummary,
	PropertyPerformanceEntry,
	PropertyUnitDetail,
	UnitStatisticEntry,
	VisitorAnalyticsResponse
} from '@repo/shared/types/property-analytics'
import {
	PropertyOccupancyChart,
	VisitorAnalyticsChart
} from './property-charts'
import { Building2 } from 'lucide-react'

function PropertyPerformanceSkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>Property Performance</h1>
						<p className="text-muted-foreground">
							Monitor occupancy, revenue, and demand signals across your portfolio.
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
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Card className="xl:col-span-2">
							<CardHeader>
								<Skeleton className="h-5 w-48" />
								<Skeleton className="h-4 w-64" />
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
							<CardContent className="space-y-4 pt-0">
								{Array.from({ length: 4 }).map((_, i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</section>
		</div>
	)
}

export default function PropertyPerformancePage() {
	const { data, isLoading, isError } = useQuery(analyticsQueries.propertyPerformancePageData())

	if (isLoading) {
		return <PropertyPerformanceSkeleton />
	}

	if (isError) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Property Performance</h1>
							<p className="text-muted-foreground">
								Monitor occupancy, revenue, and demand signals across your portfolio.
							</p>
						</div>
						<Card className="border-destructive bg-destructive/10">
							<CardContent className="p-4">
								<p className="text-sm text-destructive">
									Unable to load property performance data. Please try again later.
								</p>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		)
	}

	// Type assertions for property performance data
	const metrics = (data?.metrics ?? {}) as PropertyPerformanceSummary
	const performance = (data?.performance ?? []) as PropertyPerformanceEntry[]
	const units = (data?.units ?? []) as PropertyUnitDetail[]
	const unitStats = (data?.unitStats ?? []) as UnitStatisticEntry[]
	const visitorAnalytics = (data?.visitorAnalytics ?? {
		summary: {
			totalVisits: 0,
			totalInquiries: 0,
			totalConversions: 0,
			conversionRate: 0
		},
		timeline: []
	}) as VisitorAnalyticsResponse

	// Show empty state when no meaningful data exists
	const hasData = metrics.totalProperties > 0 ||
		metrics.totalUnits > 0 ||
		performance.length > 0 ||
		units.length > 0

	if (!hasData) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-(--color-fill-tertiary)">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Property Performance</h1>
							<p className="text-muted-foreground">
								Monitor occupancy, revenue, and demand signals across your portfolio.
							</p>
						</div>
					</div>
				</section>
				<section className="flex-1 p-6">
					<div className="mx-auto max-w-400 px-4 lg:px-6">
						<Empty className="min-h-96 border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Building2 />
								</EmptyMedia>
								<EmptyTitle>No property performance data yet</EmptyTitle>
								<EmptyDescription>
									Add properties and units to start tracking performance metrics across your portfolio.
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
				className="border-b bg-background p-6 border-(--color-fill-tertiary)"
			>
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>
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
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
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
										className="flex-between rounded-lg border px-3 py-2 text-sm"
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
											<TableRow key={property.property_id}>
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
										<TableRow key={`${unit.property_id}-${unit.unit_id}`}>
											<TableCell>
												<div className="flex flex-col">
													<span className="font-medium">{unit.unit_number}</span>
													<span className="text-caption">
														{unit.property_id}
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
