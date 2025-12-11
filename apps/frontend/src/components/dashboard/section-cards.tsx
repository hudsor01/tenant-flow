'use client'

import { Skeleton } from '#components/ui/skeleton'
import { NumberTicker } from '#components/ui/number-ticker'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
import { DollarSign, Users, Building2, Percent } from 'lucide-react'

export function SectionCards() {
	return (
		<ErrorBoundary
			fallback={
				<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
					<div className="stat-card-professional p-6">
						<p className="text-muted">Unable to load dashboard stats</p>
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

	if (isLoading) {
		return (
			<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="stat-card-professional p-6">
						<div className="flex items-start gap-4">
							<Skeleton className="size-11 rounded-xl shrink-0" />
							<div className="flex-1 space-y-3">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-8 w-32" />
								<Skeleton className="h-3 w-full" />
							</div>
						</div>
					</div>
				))}
			</div>
		)
	}

	if (isError || !stats) {
		return (
			<div className="dashboard-cards-container grid grid-cols-1 xl:grid-cols-2 5xl:grid-cols-4 gap-6">
				<div className="stat-card-professional p-6">
					<p className="text-muted">Unable to load stats</p>
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
			<div className="stat-card-professional p-6" data-testid="stat-card">
				<div className="flex items-start gap-4">
					<div className="size-11 rounded-xl bg-muted flex-center shrink-0">
						<DollarSign className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="typography-small text-muted-foreground">Monthly Revenue</p>
						<p className="typography-h3 tracking-tight mt-1">
							$<NumberTicker value={totalRevenue / 100} decimalPlaces={2} />
						</p>
						<p className="text-xs text-muted-foreground mt-2">Revenue for this month</p>
					</div>
				</div>
			</div>

			{/* Tenants Card */}
			<div className="stat-card-professional p-6" data-testid="stat-card">
				<div className="flex items-start gap-4">
					<div className="size-11 rounded-xl bg-muted flex-center shrink-0">
						<Users className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="typography-small text-muted-foreground">Active Tenants</p>
						<p className="typography-h3 tracking-tight mt-1">
							<NumberTicker value={activeTenants} />
						</p>
						<p className="text-xs text-muted-foreground mt-2">{totalTenants} total tenants registered</p>
					</div>
				</div>
			</div>

			{/* Properties Card */}
			<div className="stat-card-professional p-6" data-testid="stat-card">
				<div className="flex items-start gap-4">
					<div className="size-11 rounded-xl bg-muted flex-center shrink-0">
						<Building2 className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="typography-small text-muted-foreground">Total Properties</p>
						<p className="typography-h3 tracking-tight mt-1">
							<NumberTicker value={totalProperties} />
						</p>
						<p className="text-xs text-muted-foreground mt-2">{stats.properties?.occupied || 0} properties occupied</p>
					</div>
				</div>
			</div>

			{/* Occupancy Rate Card */}
			<div className="stat-card-professional p-6" data-testid="stat-card">
				<div className="flex items-start gap-4">
					<div className="size-11 rounded-xl bg-muted flex-center shrink-0">
						<Percent className="size-5 text-muted-foreground" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="typography-small text-muted-foreground">Occupancy Rate</p>
						<p className="typography-h3 tracking-tight mt-1">
							<NumberTicker value={occupancyRate} />%
						</p>
						<p className="text-xs text-muted-foreground mt-2">Current property utilization</p>
					</div>
				</div>
			</div>
		</div>
	)
}
