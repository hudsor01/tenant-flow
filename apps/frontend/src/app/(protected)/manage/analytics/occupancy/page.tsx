import { Badge } from '#components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { getOccupancyAnalyticsPageData } from '#lib/api/analytics-server'
import { formatNumber, formatPercentage } from '@repo/shared/utils/currency'
import { OccupancyTrendChart, VacancySummaryList } from './occupancy-charts'

export default async function OccupancyAnalyticsPage() {
	const data = await getOccupancyAnalyticsPageData()
	const { metrics, trends, vacancyAnalysis } = data

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<section
				className="border-b bg-background p-6 border-(--color-fill-tertiary)"
			>
				<div className="mx-auto flex max-w-400 flex-col gap-6 px-4 lg:px-6">
					<div className="flex flex-col gap-2">
						<h1 className="text-3xl font-semibold tracking-tight">
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
