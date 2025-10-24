'use client'

import { ChartSkeleton } from '@/components/charts/chart-skeleton'
import { dashboardApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { OccupancyTrendResponse } from '@repo/shared/types/database-rpc'

const logger = createLogger({ component: 'ChartsSection' })

const OccupancyTrendsAreaChart = dynamic(
	() =>
		import('@/components/charts/area-chart').then(
			mod => mod.OccupancyTrendsAreaChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

const PropertyPerformanceBarChart = dynamic(
	() =>
		import('@/components/charts/bar-chart').then(
			mod => mod.PropertyPerformanceBarChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

const ModernExplodedPieChart = dynamic(
	() =>
		import('@/components/charts/pie-chart').then(
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
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const fetchOccupancyTrends = async () => {
			try {
				setIsLoading(true)
				const data = await dashboardApi.getOccupancyTrends(12)
				setOccupancyData(data)
			} catch (error) {
				logger.error('Failed to fetch occupancy trends', {
					error: error instanceof Error ? error.message : String(error)
				})
			} finally {
				setIsLoading(false)
			}
		}

		fetchOccupancyTrends()
	}, [])

	return (
		<div className="w-full p-6 gap-4">
			<div className="mx-auto py-4">
				<div className="grid grid-cols-1 @3xl/main:grid-cols-3 gap-4">
					<div className="@3xl/main:col-span-2">
						{isLoading ? (
							<ChartSkeleton />
						) : occupancyData ? (
							<OccupancyTrendsAreaChart
								data={occupancyData}
								height={400}
								className="h-full"
							/>
						) : null}
					</div>

					<div className="@3xl/main:col-span-1">
						<ModernExplodedPieChart
							height={400}
							title="Property Status"
							description="Current occupancy breakdown"
							className="h-full"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 @2xl/main:grid-cols-2 mt-8 gap-4">
					<PropertyPerformanceBarChart metric="revenue" height={300} />
					<PropertyPerformanceBarChart metric="maintenance" height={300} />
				</div>
			</div>
		</div>
	)
}
