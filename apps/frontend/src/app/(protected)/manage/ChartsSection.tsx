'use client'

import { ModernExplodedPieChart } from '@/components/charts/modern-exploded-pie-chart'
import { PropertyPerformanceBarChart } from '@/components/charts/property-performance-bar-chart'
import {
	usePropertyPerformance,
	usePropertyStats
} from '@/hooks/api/use-dashboard'
// TODO: add empty state component as null fallback

export function ChartsSection() {
	const { data: propertyPerformanceData } = usePropertyPerformance()
	const { data: propertyStats } = usePropertyStats()

	// Don't show charts section if there's no data
	if (!propertyPerformanceData || propertyPerformanceData.length === 0) {
		return null
	}

	// Transform PropertyPerformance to PropertyPerformanceData format for bar charts
	const chartData = propertyPerformanceData.map(property => ({
		name: property.property,
		occupancy: property.occupancyRate,
		revenue: property.monthlyRevenue,
		units: property.totalUnits,
		maintenance: 0 // TODO: Add maintenance count from backend when available
	}))

	// Transform property stats for pie chart
	const pieChartData = propertyStats
		? [
				{
					name: 'occupied',
					value: propertyStats.occupiedUnits || 0,
					fill: 'var(--color-system-green)'
				},
				{
					name: 'vacant',
					value: propertyStats.vacantUnits || 0,
					fill: 'var(--color-system-orange)'
				},
				{
					name: 'maintenance',
					value: propertyStats.maintenanceUnits || 0,
					fill: 'hsl(var(--destructive))'
				}
			].filter(item => item.value > 0)
		: []

	return (
		<div
			className="w-full"
			style={{
				padding: 'var(--dashboard-content-padding)',
				gap: 'var(--dashboard-card-gap)'
			}}
		>
			<div
				className="mx-auto max-w-[1600px]"
				style={{
					paddingTop: 'var(--spacing-4)',
					paddingBottom: 'var(--spacing-4)'
				}}
			>
				<div
					className="grid grid-cols-1 @3xl/main:grid-cols-3 gap-8"
					style={{ gap: 'var(--dashboard-card-gap)' }}
				>
					<div className="@3xl/main:col-span-2">
						<PropertyPerformanceBarChart
							data={chartData}
							metric="occupancy"
							height={400}
							className="h-full"
						/>
					</div>

					<div className="@3xl/main:col-span-1">
						<ModernExplodedPieChart
							data={pieChartData}
							height={400}
							title="Property Status"
							description="Current occupancy breakdown"
							className="h-full"
						/>
					</div>
				</div>

				<div
					className="grid grid-cols-1 @2xl/main:grid-cols-2 mt-8"
					style={{ gap: 'var(--dashboard-card-gap)' }}
				>
					<PropertyPerformanceBarChart
						data={chartData}
						metric="revenue"
						height={300}
					/>
					<PropertyPerformanceBarChart
						data={chartData}
						metric="maintenance"
						height={300}
					/>
				</div>
			</div>
		</div>
	)
}
