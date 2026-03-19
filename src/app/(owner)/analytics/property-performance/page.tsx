'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsQueries } from '#hooks/api/use-analytics'
import { BlurFade } from '#components/ui/blur-fade'
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription
} from '#components/ui/empty'
import type {
	PropertyPerformanceSummary,
	PropertyPerformanceEntry,
	PropertyUnitDetail,
	UnitStatisticEntry,
	VisitorAnalyticsResponse
} from '#types/analytics'
import dynamic from 'next/dynamic'
import { ChartLoadingSkeleton } from '#components/shared/chart-loading-skeleton'

const PropertyOccupancyChart = dynamic(
	() => import('./property-charts').then(mod => mod.PropertyOccupancyChart),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)
const VisitorAnalyticsChart = dynamic(
	() => import('./property-charts').then(mod => mod.VisitorAnalyticsChart),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)
import { TopPropertiesTable } from './top-properties-table'
import { ActiveUnitsTable } from './active-units-table'
import { PropertyPerformanceSkeleton } from './property-performance-skeleton'
import { PortfolioKPIs } from './portfolio-kpis'
import { PerformanceStatCards } from './performance-stat-cards'
import { Building2, TrendingUp, BarChart3, Users, Home } from 'lucide-react'

export default function PropertyPerformancePage() {
	const { data, isLoading, isError } = useQuery(analyticsQueries.propertyPerformancePageData())

	if (isLoading) return <PropertyPerformanceSkeleton />

	if (isError) {
		return (
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="text-center py-16 max-w-md">
					<p className="text-lg font-medium text-foreground mb-2">Unable to load property performance data</p>
					<p className="text-sm text-muted-foreground mb-4">There was a problem loading your property analytics. Please try again.</p>
					<button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2 min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">Refresh Page</button>
				</div>
			</div>
		)
	}

	const metrics = (data?.metrics ?? {}) as PropertyPerformanceSummary
	const performance = (data?.performance ?? []) as PropertyPerformanceEntry[]
	const units = (data?.units ?? []) as PropertyUnitDetail[]
	const unitStats = (data?.unitStats ?? []) as UnitStatisticEntry[]
	const visitorAnalytics = (data?.visitorAnalytics ?? { summary: { totalVisits: 0, totalInquiries: 0, totalConversions: 0, conversionRate: 0 }, timeline: [] }) as VisitorAnalyticsResponse

	const hasData = metrics.totalProperties > 0 || metrics.totalUnits > 0 || performance.length > 0 || units.length > 0

	if (!hasData) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<BlurFade delay={0.1} inView>
					<div className="flex flex-col gap-2 mb-6">
						<h1 className="typography-h1">Property Performance</h1>
						<p className="text-muted-foreground">Monitor occupancy, revenue, and demand signals across your portfolio.</p>
					</div>
				</BlurFade>
				<BlurFade delay={0.2} inView>
					<Empty className="min-h-96 border rounded-lg">
						<EmptyHeader>
							<EmptyMedia variant="icon"><Building2 /></EmptyMedia>
							<EmptyTitle>No property performance data yet</EmptyTitle>
							<EmptyDescription>Add properties and units to start tracking performance metrics across your portfolio.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</BlurFade>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col gap-2 mb-6">
					<h1 className="typography-h1">Property Performance</h1>
					<p className="text-muted-foreground">Monitor occupancy, revenue, and demand signals across your portfolio.</p>
				</div>
			</BlurFade>

			<PerformanceStatCards metrics={metrics} />

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				<BlurFade delay={0.6} inView>
					<div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Occupancy & revenue by property</h3>
								<p className="text-sm text-muted-foreground">Compare current performance across the portfolio</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>
						<PropertyOccupancyChart data={performance} />
					</div>
				</BlurFade>
				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Portfolio KPIs</h3>
								<p className="text-sm text-muted-foreground">Highlights from unit-level statistics</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>
						<PortfolioKPIs unitStats={unitStats} />
					</div>
				</BlurFade>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<BlurFade delay={0.8} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Visitor analytics</h3>
								<p className="text-sm text-muted-foreground">How prospective tenants engage with listings</p>
							</div>
							<Users className="w-5 h-5 text-muted-foreground" />
						</div>
						<VisitorAnalyticsChart data={visitorAnalytics} />
					</div>
				</BlurFade>
				<BlurFade delay={0.9} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Top properties</h3>
								<p className="text-sm text-muted-foreground">Key metrics for high-performing assets</p>
							</div>
							<Building2 className="w-5 h-5 text-muted-foreground" />
						</div>
						<TopPropertiesTable properties={performance} />
					</div>
				</BlurFade>
			</div>

			<BlurFade delay={1.0} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="font-medium text-foreground">Active units</h3>
							<p className="text-sm text-muted-foreground">Recently updated unit information</p>
						</div>
						<Home className="w-5 h-5 text-muted-foreground" />
					</div>
					<ActiveUnitsTable units={units} />
				</div>
			</BlurFade>
		</div>
	)
}
