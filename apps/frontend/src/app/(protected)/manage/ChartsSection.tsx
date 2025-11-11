'use client'

import { ChartSkeleton } from '#components/charts/chart-skeleton'
import { useSpring, animated } from '@react-spring/web'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type {
	OccupancyTrendResponse,
	RevenueTrendResponse
} from '@repo/shared/types/database-rpc'

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
		from: { opacity: 0, transform: 'translateY(20px)' },
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
			} catch {
				// TODO: Add structured logging
			} finally {
				setIsLoading(false)
			}
		}

		fetchData()
	}, [])

	return (
		<div className="w-full p-6 gap-4">
			<div className="mx-auto py-4">
				<div className="grid grid-cols-1 @3xl/main:grid-cols-3 gap-4">
					<div className="@3xl/main:col-span-2">
						<div className="grid gap-6 @3xl/main:grid-cols-3">
							{/* Occupancy Trends Chart */}
							<animated.div
								style={chartAnimation}
								className="@3xl/main:col-span-2"
							>
								{isLoading ? (
									<ChartSkeleton />
								) : occupancyData && occupancyData.length > 0 ? (
									<OccupancyTrendsAreaChart
										data={occupancyData}
										height={400}
										className="h-full"
									/>
								) : (
									<div className="flex h-96 items-center justify-center rounded-lg border border-dashed bg-muted/20">
										<div className="text-center space-y-2">
											<p className="text-sm font-medium text-muted-foreground">
												No occupancy data available
											</p>
											<p className="text-xs text-muted-foreground">
												Data will appear once you have properties with occupancy
												tracking
											</p>
											{occupancyData !== undefined && (
												<div className="text-xs text-muted-foreground mt-4 p-2 bg-muted rounded">
													<p>
														<strong>Debug Info:</strong>
													</p>
													<p>Data type: {typeof occupancyData}</p>
													<p>
														Data length:{' '}
														{Array.isArray(occupancyData)
															? occupancyData.length
															: 'N/A'}
													</p>
													<p>
														Raw data: {JSON.stringify(occupancyData, null, 2)}
													</p>
												</div>
											)}
										</div>
									</div>
								)}
							</animated.div>
						</div>
					</div>

					<div className="@3xl/main:col-span-1">
						{/* Property Status Pie Chart */}
						<animated.div
							style={chartAnimation}
							className="@3xl/main:col-span-1"
						>
							<ModernExplodedPieChart
								height={400}
								title="Property Status"
								description="Current occupancy breakdown"
								className="h-full"
							/>
						</animated.div>
					</div>
				</div>

				{/* Property Performance Charts */}
				<animated.div
					style={chartAnimation}
					className="grid grid-cols-1 @2xl/main:grid-cols-2 mt-8 gap-4"
				>
					<PropertyPerformanceBarChart metric="revenue" height={300} />
					<PropertyPerformanceBarChart metric="maintenance" height={300} />
				</animated.div>
			</div>
		</div>
	)
}
