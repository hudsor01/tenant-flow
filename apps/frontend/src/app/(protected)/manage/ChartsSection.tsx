'use client'

import { ChartSkeleton } from '#components/charts/chart-skeleton'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'

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
	// ✅ React 19 pattern: TanStack Query instead of useState + useEffect + fetch
	const { data: occupancyData, isLoading } = useQuery({
		queryKey: ['dashboard', 'occupancy-trends', 12],
		queryFn: async () => {
			const res = await fetch('/api/v1/manage/occupancy-trends?months=12', {
				credentials: 'include'
			})
			if (!res.ok) {
				throw new Error('Failed to fetch occupancy trends')
			}
			return res.json()
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})

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
