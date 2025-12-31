'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { TrendingUp, Building2 } from 'lucide-react'
import { OccupancyTrendChart, VacancySummaryList } from './property-charts'

export function PropertyInsightsSkeleton() {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-48 mb-6" />
					<Skeleton className="h-64 w-full" />
				</div>
				<div className="bg-card border border-border rounded-lg p-6">
					<Skeleton className="h-5 w-32 mb-2" />
					<Skeleton className="h-4 w-40 mb-6" />
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

export function PropertyInsightsSection() {
	const { data, isLoading } = useQuery(analyticsQueries.occupancyPageData())

	if (isLoading) {
		return <PropertyInsightsSkeleton />
	}

	const { trends = [], vacancyAnalysis = [] } = data || {}

	return (
		<div className="space-y-6">
			{/* Charts Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<BlurFade delay={0.1} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Occupancy trends</h3>
								<p className="text-sm text-muted-foreground">
									Portfolio occupancy rate over time
								</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>
						<OccupancyTrendChart data={trends} />
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Vacancy hotspots</h3>
								<p className="text-sm text-muted-foreground">
									Properties with highest vacancy days
								</p>
							</div>
							<Building2 className="w-5 h-5 text-muted-foreground" />
						</div>
						<VacancySummaryList entries={vacancyAnalysis} />
					</div>
				</BlurFade>
			</div>
		</div>
	)
}
