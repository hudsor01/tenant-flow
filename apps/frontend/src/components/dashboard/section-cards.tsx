'use client'

import { StatCard } from '#components/dashboard/stat-card'
import { Skeleton } from '#components/ui/skeleton'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
import { formatCurrency } from '@repo/shared/utils/currency'
import { TrendingUp, UserPlus, Building } from 'lucide-react'

export function SectionCards() {
	return (
		<ErrorBoundary
			fallback={
				<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
					<div className="dashboard-widget rounded-xl border bg-card p-6">
						<p className="text-sm text-muted-foreground">Unable to load dashboard stats</p>
					</div>
				</div>
			}
		>
			<SectionCardsContent />
		</ErrorBoundary>
	)
}

function SectionCardsContent() {
	const { data, isLoading, error } = useOwnerDashboardData()
	const stats = data?.stats
	const isError = !!error

	// Show loading skeletons
	if (isLoading) {
		return (
			<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="dashboard-widget rounded-xl border bg-card p-6"
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
			<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
				<div className="dashboard-widget rounded-xl border bg-card p-6">
					<p className="text-sm text-muted-foreground">Unable to load stats</p>
				</div>
			</div>
		)
	}

	const totalRevenue = stats.revenue?.monthly || 0
	const totalTenants = stats.tenants?.total || 0
	const activeTenants = stats.tenants?.active || 0
	const totalProperties = stats.properties?.total || 0
	const occupancyRate = stats.units?.occupancyRate || 0

	return (
		<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
			{/* Revenue Card */}
			<StatCard
				title="Monthly Revenue"
				value={formatCurrency(totalRevenue)}
				description={`Revenue for this month`}
				icon={TrendingUp}
			/>

			{/* Tenants Card */}
			<StatCard
				title="Active Tenants"
				value={activeTenants}
				description={`${totalTenants} total tenants registered`}
				icon={UserPlus}
			/>

			{/* Properties Card */}
			<StatCard
				title="Total Properties"
				value={totalProperties}
				description={`${stats.properties?.occupied || 0} properties occupied`}
				icon={Building}
			/>

			{/* Occupancy Rate Card */}
			<StatCard
				title="Occupancy Rate"
				value={`${occupancyRate}%`}
				description="Current property utilization"
				icon={TrendingUp}
			/>
		</div>
	)
}
