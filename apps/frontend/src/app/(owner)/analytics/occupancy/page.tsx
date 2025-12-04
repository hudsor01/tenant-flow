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
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import { formatNumber, formatPercentage } from '#lib/formatters/currency'
import { OccupancyTrendChart, VacancySummaryList } from './occupancy-charts'
import { Building2 } from 'lucide-react'

function OccupancySkeleton() {
	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section className="border-b bg-background p-6 border-fill-tertiary">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1>Occupancy Trends</h1>
						<p className="text-muted-foreground">
							Monitor occupancy rates, vacancy durations, and seasonal peaks.
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
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-4 w-48" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-64 w-full" />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}

export default function OccupancyAnalyticsPage() {
	const { data, isLoading } = useQuery(analyticsQueries.occupancyPageData())

	if (isLoading) {
		return <OccupancySkeleton />
	}

	const {
		metrics = {
			currentOccupancy: 0,
			averageVacancyDays: 0,
			seasonalPeakOccupancy: 0,
			trend: 0
		},
		trends = [],
		vacancyAnalysis = []
	} = data || {}

	// Show empty state when no meaningful data exists
	const hasData = metrics.currentOccupancy > 0 ||
		metrics.seasonalPeakOccupancy > 0 ||
		trends.length > 0 ||
		vacancyAnalysis.length > 0

	if (!hasData) {
		return (
			<div className="@container/main flex min-h-screen w-full flex-col">
				<section className="border-b bg-background p-6 border-fill-tertiary">
					<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
						<div className="flex flex-col gap-2">
							<h1>Occupancy Trends</h1>
							<p className="text-muted-foreground">
								Monitor occupancy rates, vacancy durations, and seasonal peaks.
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
								<EmptyTitle>No occupancy data yet</EmptyTitle>
								<EmptyDescription>
									Add properties and units to start tracking occupancy trends across your portfolio.
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
							Occupancy Trends
						</h1>
						<p className="text-muted-foreground">
							Monitor occupancy rates, vacancy durations, and seasonal peaks.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardHeader>
								<CardTitle>Current occupancy</CardTitle>
								<CardDescription>Portfolio-wide average</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatPercentage(metrics.currentOccupancy)}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Average vacancy</CardTitle>
								<CardDescription>Days units remain vacant</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(metrics.averageVacancyDays)} days
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Seasonal peak</CardTitle>
								<CardDescription>Highest occupancy observed</CardDescription>
							</CardHeader>
							<CardContent className="flex items-end justify-between pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatPercentage(metrics.seasonalPeakOccupancy)}
								</p>
								<Badge
									variant={metrics.trend >= 0 ? 'outline' : 'destructive'}
									className="text-xs"
								>
									{metrics.trend >= 0 ? '+' : ''}
									{formatPercentage(metrics.trend)} trend
								</Badge>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Vacancy insights</CardTitle>
								<CardDescription>Properties needing attention</CardDescription>
							</CardHeader>
							<CardContent className="pt-0">
								<p className="text-3xl font-semibold tabular-nums">
									{formatNumber(vacancyAnalysis.length)} flagged
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<section className="flex-1 p-6 pt-6 pb-6">
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<Card>
						<CardHeader>
							<CardTitle>Occupancy trend</CardTitle>
							<CardDescription>
								Occupancy percentage over the last periods
							</CardDescription>
						</CardHeader>
						<CardContent>
							<OccupancyTrendChart data={trends} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Vacancy hotspots</CardTitle>
							<CardDescription>
								Properties with recurring vacancy challenges
							</CardDescription>
						</CardHeader>
						<CardContent>
							<VacancySummaryList entries={vacancyAnalysis} />
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
