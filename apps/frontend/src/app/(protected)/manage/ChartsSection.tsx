'use client'

import { ChartSkeleton } from '#components/charts/chart-skeleton'
import { useSpring, animated } from '@react-spring/web'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type {
	OccupancyTrendResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'
import { logger } from '@repo/shared/lib/frontend-logger'

const OccupancyTrendsAreaChart = dynamic(
	() =>
		import('#components/charts/area-chart').then(
			mod => mod.OccupancyTrendsAreaChart
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

const ModernExplodedPieChart = dynamic(
	() =>
		import('#components/charts/pie-chart').then(
			mod => mod.ModernExplodedPieChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

export function ChartsSection() {
	const [occupancyData, setOccupancyData] = useState<
		OccupancyTrendResponse[] | undefined
	>()
	const [_revenueData, setRevenueData] = useState<
		RevenueTrendResponse[] | undefined
	>()
	const [isLoading, setIsLoading] = useState(true)

	// Animation for chart containers
	const chartAnimation = useSpring({
		from: { opacity: 0, transform: 'translateY(var(--translate-slide-y))' },
		to: { opacity: 1, transform: 'translateY(0px)' },
		config: { tension: 280, friction: 60 }
	})

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true)
				const [occupancyResponse, revenueResponse] = await Promise.all([
					fetch('/api/occupancy-trends'),
					fetch('/api/revenue-trends')
				])

				if (occupancyResponse.ok) {
					const occupancyResult = await occupancyResponse.json()
					setOccupancyData(occupancyResult.data)
				}

				if (revenueResponse.ok) {
					const revenueResult = await revenueResponse.json()
					setRevenueData(revenueResult.data)
				}
			} catch (error) {
				logger.error('Failed to fetch chart data', {
					component: 'ChartsSection',
					operation: 'fetchChartData',
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			} finally {
				setIsLoading(false)
			}
		}

		fetchData()
	}, [])

	return (
		<section className="dashboard-section">
			<div className="dashboard-section-header">
				<h2 className="dashboard-section-title">Portfolio Analytics</h2>
				<p className="dashboard-section-description">
					Visualize occupancy health and property mix in one view
				</p>
			</div>

			<div className="dashboard-chart-grid">
				<animated.div
					style={chartAnimation}
					className="dashboard-chart-card"
					data-layout="wide"
				>
					<div className="dashboard-chart-card-header">
						<p className="dashboard-chart-title">Occupancy Trends</p>
						<p className="dashboard-chart-description">
							Rolling 12-month performance
						</p>
					</div>
					{isLoading ? (
						<ChartSkeleton />
					) : occupancyData && occupancyData.length > 0 ? (
						<OccupancyTrendsAreaChart
							data={occupancyData}
							height={400}
							className="h-full"
						/>
					) : (
						<div className="dashboard-chart-placeholder">
							<div className="space-y-2">
								<p className="font-medium text-(--color-label-primary)">
									No occupancy data available
								</p>
								<p className="text-sm text-(--color-label-secondary)">
									Add properties with tracking enabled to see historical data.
								</p>
								{occupancyData !== undefined && (
									<pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-dashed border-border bg-background/60 p-3 text-left text-[0.7rem] text-muted-foreground">
										{JSON.stringify(occupancyData, null, 2)}
									</pre>
								)}
							</div>
						</div>
					)}
				</animated.div>

				<animated.div style={chartAnimation} className="dashboard-chart-card">
					<div className="dashboard-chart-card-header">
						<p className="dashboard-chart-title">Property Status</p>
						<p className="dashboard-chart-description">
							Current occupancy breakdown
						</p>
					</div>
					<ModernExplodedPieChart
						height={400}
						title="Property Status"
						description="Current occupancy breakdown"
						className="h-full"
					/>
				</animated.div>
			</div>

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
