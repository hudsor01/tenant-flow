'use client'

import { ChartSkeleton } from '#components/ui/charts/chart-skeleton'
import { ErrorBoundary } from '#components/ui/error-boundary'
import dynamic from 'next/dynamic'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'

const CombinedMetricsAreaChart = dynamic(
	() =>
		import('#components/ui/charts/combined-metrics-area-chart').then(
			mod => mod.CombinedMetricsAreaChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

const PropertyPerformanceBarChart = dynamic(
	() =>
		import('#components/ui/charts/bar-chart').then(
			mod => mod.PropertyPerformanceBarChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

export function ChartsSection() {
	// Use unified dashboard data - no additional API calls needed
	const { data, isLoading } = useOwnerDashboardData()
	const timeSeries = data?.timeSeries

	return (
		<ErrorBoundary
			fallback={
				<section className="dashboard-section">
					<div className="dashboard-section-header">
						<h2 className="dashboard-section-title">Portfolio Analytics</h2>
						<p className="dashboard-section-description">
							Unable to load analytics data
						</p>
					</div>
					<div className="flex items-center justify-center h-64 text-muted-foreground">
						Error loading portfolio analytics
					</div>
				</section>
			}
		>
			<section className="dashboard-section">
				<div className="dashboard-section-header">
					<h2 className="dashboard-section-title">Portfolio Analytics</h2>
					<p className="dashboard-section-description">
						Track occupancy, revenue, and maintenance trends
					</p>
				</div>

				{/* Combined Metrics Area Chart */}
				{isLoading ? (
					<ChartSkeleton />
				) : (
					<CombinedMetricsAreaChart
						occupancyData={timeSeries?.occupancyRate}
						revenueData={timeSeries?.monthlyRevenue}
						height={400}
					/>
				)}

				{/* Revenue and Maintenance Bar Charts */}
				<div className="dashboard-chart-grid">
					<div className="dashboard-chart-card">
						<div className="dashboard-chart-card-header">
							<p className="dashboard-chart-title">Revenue Trend</p>
							<p className="dashboard-chart-description">
								Compare revenue month over month
							</p>
						</div>
						<PropertyPerformanceBarChart metric="revenue" height={300} />
					</div>
					<div className="dashboard-chart-card">
						<div className="dashboard-chart-card-header">
							<p className="dashboard-chart-title">Maintenance Spend</p>
							<p className="dashboard-chart-description">
								Track total maintenance costs
							</p>
						</div>
						<PropertyPerformanceBarChart metric="maintenance" height={300} />
					</div>
				</div>
			</section>
		</ErrorBoundary>
	)
}
