'use client'

import { MetricsCard } from '@/components/charts/metrics-card'
import { ModernExplodedPieChart } from '@/components/charts/modern-exploded-pie-chart'
import { PropertyPerformanceBarChart } from '@/components/charts/property-performance-bar-chart'
import { Building, DollarSign, TrendingUp, Users } from 'lucide-react'

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
					className="grid grid-cols-1 @xl/main:grid-cols-2 @4xl/main:grid-cols-4 mb-8"
					style={{ gap: 'var(--dashboard-card-gap)' }}
				>
					<MetricsCard
						title="Total Revenue"
						value="$152,000"
						description="Monthly recurring revenue"
						status="+12.5% from last month"
						icon={DollarSign}
						colorVariant="revenue"
						trend="up"
					/>
					<MetricsCard
						title="Active Properties"
						value={45}
						description="Properties under management"
						status="+8.2% from last month"
						icon={Building}
						colorVariant="property"
						trend="up"
					/>
					<MetricsCard
						title="Occupancy Rate"
						value="94%"
						description="Current occupancy percentage"
						status="-2.1% from last month"
						icon={TrendingUp}
						colorVariant="warning"
						trend="down"
					/>
					<MetricsCard
						title="Total Tenants"
						value={287}
						description="Active tenants across portfolio"
						status="+5.3% from last month"
						icon={Users}
						colorVariant="info"
						trend="up"
					/>
				</div>
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
