
'use client'

import { ModernExplodedPieChart } from '@/components/charts/modern-exploded-pie-chart'
import { PropertyPerformanceBarChart } from '@/components/charts/property-performance-bar-chart'

export function ChartsSection() {
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
					className="grid grid-cols-1 @2xl/main:grid-cols-2 mt-8"
					style={{ gap: 'var(--dashboard-card-gap)' }}
				>
					<PropertyPerformanceBarChart metric="revenue" height={300} />
					<PropertyPerformanceBarChart metric="maintenance" height={300} />
				</div>
			</div>
		</div>
	)
}
