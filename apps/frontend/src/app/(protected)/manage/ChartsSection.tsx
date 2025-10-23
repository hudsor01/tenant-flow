'use client'

import { ChartSkeleton } from '@/components/charts/chart-skeleton'
import dynamic from 'next/dynamic'

const PropertyPerformanceBarChart = dynamic(
	() =>
		import('@/components/charts/bar-chart').then(
			(mod) => mod.PropertyPerformanceBarChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

const ModernExplodedPieChart = dynamic(
	() =>
		import('@/components/charts/pie-chart').then(
			(mod) => mod.ModernExplodedPieChart
		),
	{
		ssr: false,
		loading: () => <ChartSkeleton />
	}
)

export function ChartsSection() {
	return (
		<div
			className="w-full p-6 gap-4"
		>
			<div
				className="mx-auto max-w-[1600px] py-4"
			>
				<div
					className="grid grid-cols-1 @3xl/main:grid-cols-3 gap-4"
				>
					<div className="@3xl/main:col-span-2">
						<PropertyPerformanceBarChart
							metric="occupancy"
							height={400}
							className="h-full"
						/>
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

				<div
					className="grid grid-cols-1 @2xl/main:grid-cols-2 mt-8 gap-4"
				>
					<PropertyPerformanceBarChart metric="revenue" height={300} />
					<PropertyPerformanceBarChart metric="maintenance" height={300} />
				</div>
			</div>
		</div>
	)
}
