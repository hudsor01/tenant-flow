'use client'

import { ChartSkeleton } from '#components/charts/chart-skeleton'
import { useSpring, animated } from '@react-spring/web'
import dynamic from 'next/dynamic'
import { useOwnerTimeSeries } from '#hooks/api/use-owner-dashboard'

const CombinedMetricsAreaChart = dynamic(
	() =>
		import('#components/charts/combined-metrics-area-chart').then(
			mod => mod.CombinedMetricsAreaChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

const PropertyPerformanceBarChart = dynamic(
	() =>
		import('#components/charts/bar-chart').then(
			mod => mod.PropertyPerformanceBarChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

export function ChartsSection() {
	// Fetch time series data for combined chart
	const { data: occupancyTimeSeries, isLoading: isOccupancyLoading } =
		useOwnerTimeSeries({ metric: 'occupancy_rate', days: 30 })
	const { data: revenueTimeSeries, isLoading: isRevenueLoading } =
		useOwnerTimeSeries({ metric: 'monthly_revenue', days: 30 })

	const isLoading = isOccupancyLoading || isRevenueLoading

	// Animation for chart containers
	const chartAnimation = useSpring({
		from: { opacity: 0, transform: 'translateY(var(--translate-slide-y))' },
		to: { opacity: 1, transform: 'translateY(0px)' },
		config: { tension: 280, friction: 60 }
	})

	return (
		<section className="dashboard-section">
			<div className="dashboard-section-header">
				<h2 className="dashboard-section-title">Portfolio Analytics</h2>
				<p className="dashboard-section-description">
					Track occupancy, revenue, and maintenance trends
				</p>
			</div>

			{/* Combined Metrics Area Chart - Beautiful dual-axis chart */}
			<animated.div style={chartAnimation}>
				{isLoading ? (
					<ChartSkeleton />
				) : (
					<CombinedMetricsAreaChart
						occupancyData={occupancyTimeSeries}
						revenueData={revenueTimeSeries}
						height={400}
					/>
				)}
			</animated.div>

			{/* Revenue and Maintenance Bar Charts */}
			<div className="dashboard-chart-grid">
				<animated.div style={chartAnimation} className="dashboard-chart-card">
					<div className="dashboard-chart-card-header">
						<p className="dashboard-chart-title">Revenue Trend</p>
						<p className="dashboard-chart-description">
							Compare revenue month over month
						</p>
					</div>
					<PropertyPerformanceBarChart metric="revenue" height={300} />
				</animated.div>
				<animated.div style={chartAnimation} className="dashboard-chart-card">
					<div className="dashboard-chart-card-header">
						<p className="dashboard-chart-title">Maintenance Spend</p>
						<p className="dashboard-chart-description">
							Track total maintenance costs
						</p>
					</div>
					<PropertyPerformanceBarChart metric="maintenance" height={300} />
				</animated.div>
			</div>
		</section>
	)
}
