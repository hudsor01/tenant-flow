'use client'

import { MetricsCard } from '@/components/charts/metrics-card'
import { ModernExplodedPieChart } from '@/components/charts/modern-exploded-pie-chart'
import { PropertyPerformanceBarChart } from '@/components/charts/property-performance-bar-chart'
import type { DashboardStats } from '@repo/shared/types/core'
import { Building, DollarSign, TrendingUp, Users } from 'lucide-react'

interface ChartsSectionProps {
	stats?: Partial<DashboardStats>
}

export function ChartsSection({ stats = {} }: ChartsSectionProps) {
	const totalRevenue = stats.revenue?.monthly || 0
	const revenueGrowth = stats.revenue?.growth || 0
	const totalProperties = stats.properties?.total || 0
	const occupancyRate = stats.units?.occupancyRate || 0
	const totalTenants = stats.tenants?.active || 0

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount)
	}

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
						value={formatCurrency(totalRevenue)}
						description="Monthly recurring revenue"
						status={`${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% from last month`}
						icon={DollarSign}
						colorVariant="revenue"
						trend={revenueGrowth >= 0 ? 'up' : 'down'}
					/>
					<MetricsCard
						title="Active Properties"
						value={totalProperties}
						description="Properties under management"
						status={`${stats.properties?.total || 0} total properties`}
						icon={Building}
						colorVariant="property"
						trend="up"
					/>
					<MetricsCard
						title="Occupancy Rate"
						value={`${occupancyRate.toFixed(1)}%`}
						description="Current occupancy percentage"
						status={`${stats.units?.occupied || 0} of ${stats.units?.total || 0} units`}
						icon={TrendingUp}
						colorVariant={occupancyRate >= 90 ? 'success' : 'warning'}
						trend={occupancyRate >= 90 ? 'up' : 'down'}
					/>
					<MetricsCard
						title="Total Tenants"
						value={totalTenants}
						description="Active tenants across portfolio"
						status={`${stats.tenants?.total || 0} total registered`}
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
