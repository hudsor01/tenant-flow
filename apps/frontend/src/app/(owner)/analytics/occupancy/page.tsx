'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/queries/analytics-queries'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '#components/ui/stat'
import { AnimatedTrendIndicator } from '#components/ui/animated-trend-indicator'
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import { OccupancyTrendChart, VacancySummaryList } from './occupancy-charts'
import { Building2, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

function OccupancySkeleton() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col gap-2 mb-6">
				<Skeleton className="h-7 w-40" />
				<Skeleton className="h-5 w-80" />
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-sm border bg-card p-4 shadow-sm">
						<Skeleton className="h-4 w-24 mb-2" />
						<Skeleton className="h-8 w-20 mb-2" />
						<Skeleton className="h-4 w-32" />
					</div>
				))}
			</div>
			<div className="space-y-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-36 mb-2" />
					<Skeleton className="h-4 w-52 mb-6" />
					<div className="space-y-3">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				</div>
			</div>
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
	const hasData =
		metrics.currentOccupancy > 0 ||
		metrics.seasonalPeakOccupancy > 0 ||
		trends.length > 0 ||
		vacancyAnalysis.length > 0

	if (!hasData) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col gap-2 mb-6">
						<h1 className="text-2xl font-semibold text-foreground">
							Occupancy Trends
						</h1>
						<p className="text-muted-foreground">
							Monitor occupancy rates, vacancy durations, and seasonal peaks.
						</p>
					</div>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Empty className="min-h-96 border rounded-lg">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<Building2 />
							</EmptyMedia>
							<EmptyTitle>No occupancy data yet</EmptyTitle>
							<EmptyDescription>
								Add properties and units to start tracking occupancy trends
								across your portfolio.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col gap-2 mb-6">
					<h1 className="text-2xl font-semibold text-foreground">
						Occupancy Trends
					</h1>
					<p className="text-muted-foreground">
						Monitor occupancy rates, vacancy durations, and seasonal peaks.
					</p>
				</div>
			</BlurFade>

			{/* Overview Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-primary)"
							colorTo="oklch(from var(--color-primary) l c h / 0.3)"
						/>
						<StatLabel>Current occupancy</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<NumberTicker
								value={metrics.currentOccupancy}
								duration={1500}
								decimalPlaces={1}
							/>
							<span className="text-lg">%</span>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Building2 />
						</StatIndicator>
						<StatDescription>Portfolio-wide average</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Average vacancy</StatLabel>
						<StatValue className="flex items-baseline gap-1">
							<NumberTicker
								value={metrics.averageVacancyDays}
								duration={1500}
							/>
							<span className="text-lg">days</span>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Calendar />
						</StatIndicator>
						<StatDescription>Days units remain vacant</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Seasonal peak</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<NumberTicker
								value={metrics.seasonalPeakOccupancy}
								duration={1500}
								decimalPlaces={1}
							/>
							<span className="text-lg">%</span>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatTrend trend={metrics.trend >= 0 ? 'up' : 'down'}>
							<AnimatedTrendIndicator
								value={metrics.trend}
								size="sm"
								delay={500}
							/>
							<span className="text-muted-foreground">trend</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Vacancy insights</StatLabel>
						<StatValue className="flex items-baseline gap-1">
							<NumberTicker value={vacancyAnalysis.length} duration={1000} />
							<span className="text-lg">flagged</span>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<AlertCircle />
						</StatIndicator>
						<StatDescription>Properties needing attention</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts */}
			<div className="space-y-6">
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Occupancy trend</h3>
								<p className="text-sm text-muted-foreground">
									Occupancy percentage over the last periods
								</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>
						<OccupancyTrendChart data={trends} />
					</div>
				</BlurFade>

				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Vacancy hotspots</h3>
								<p className="text-sm text-muted-foreground">
									Properties with recurring vacancy challenges
								</p>
							</div>
							<AlertCircle className="w-5 h-5 text-muted-foreground" />
						</div>
						<VacancySummaryList entries={vacancyAnalysis} />
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
