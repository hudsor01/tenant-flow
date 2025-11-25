'use client'

import { StatCard } from '#components/dashboard/stat-card'
import { Skeleton } from '#components/ui/skeleton'
import { useOwnerDashboardPageData } from '#hooks/api/use-owner-dashboard'
import { formatCurrency, formatPercentage } from '@repo/shared/utils/currency'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function SectionCards() {
	const { data, isLoading, error } = useOwnerDashboardPageData()
	const stats = data?.stats
	const isError = !!error

	// Show loading skeletons
	if (isLoading) {
		return (
			<div className="dashboard-cards-container grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 gap-(--layout-gap-items)">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="dashboard-widget rounded-xl border bg-card p-(--layout-content-padding-compact)"
					>
						<Skeleton className="h-5 w-32 mb-4" />
						<Skeleton className="h-9 w-24 mb-2" />
						<Skeleton className="h-4 w-full" />
					</div>
				))}
			</div>
		)
	}

	// Show empty state if error or no data
	if (isError || !stats) {
		return (
			<div className="dashboard-cards-container grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 gap-(--layout-gap-items)">
				<div className="dashboard-widget rounded-xl border bg-card p-(--layout-content-padding-compact)">
					<p className="text-sm text-muted-foreground">Unable to load stats</p>
				</div>
			</div>
		)
	}

	const totalRevenue = stats.revenue?.monthly || 0
	const revenueGrowth = stats.revenue?.growth || 0
	const totalTenants = stats.tenants?.total || 0
	const activeTenants = stats.tenants?.active || 0
	const totalProperties = stats.properties?.total || 0
	const occupancyRate = stats.units?.occupancyRate || 0

	const isPositiveGrowth = revenueGrowth >= 0
	const isExcellentOccupancy = occupancyRate >= 90

	return (
		<div className="dashboard-cards-container grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 gap-(--layout-gap-group)">
			{/* Revenue Card */}
			<StatCard
				title="Monthly Revenue"
				value={formatCurrency(totalRevenue)}
				description={
					isPositiveGrowth ? 'Trending up this month' : 'Down this month'
				}
				badge={
					<div
						className={`status-badge ${isPositiveGrowth ? 'status-badge-success' : 'status-badge-destructive'}`}
					>
						{isPositiveGrowth ? (
							<TrendingUp className="h-3 w-3" />
						) : (
							<TrendingDown className="h-3 w-3" />
						)}
						{formatPercentage(revenueGrowth)}
					</div>
				}
				icon={isPositiveGrowth ? TrendingUp : TrendingDown}
			/>

			{/* Tenants Card */}
			<StatCard
				title="Active Tenants"
				value={activeTenants}
				description={
					activeTenants > 0
						? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active rate`
						: 'No active tenants yet'
				}
				badge={
					<div className="badge badge-professional-gray">
						<TrendingUp className="h-3 w-3" />
						{totalTenants} total
					</div>
				}
			/>

			{/* Properties Card */}
			<StatCard
				title="Total Properties"
				value={totalProperties}
				description={
					totalProperties > 0
						? `${stats.properties?.occupied || 0} generating revenue`
						: 'Add your first property'
				}
				badge={
					<div className="badge badge-clean-accent">
						<TrendingUp className="h-3 w-3" />
						{stats.properties?.occupied || 0} occupied
					</div>
				}
			/>

			{/* Occupancy Rate Card */}
			<StatCard
				title="Occupancy Rate"
				value={`${occupancyRate}%`}
				description={
					occupancyRate >= 90
						? "Excellent occupancy - you're doing great!"
						: occupancyRate >= 75
						? 'Good occupancy - room for improvement'
						: 'Low occupancy - focus on tenant acquisition'
				}
				badge={
					<div
						className={`status-badge ${isExcellentOccupancy ? 'status-badge-success' : 'status-badge-warning'}`}
					>
						{isExcellentOccupancy ? (
							<TrendingUp className="h-3 w-3" />
						) : (
							<TrendingDown className="h-3 w-3" />
						)}
						{isExcellentOccupancy ? 'Excellent' : 'Good'}
					</div>
				}
			/>
		</div>
	)
}
