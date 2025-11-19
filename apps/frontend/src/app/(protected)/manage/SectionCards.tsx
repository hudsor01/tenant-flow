'use client'

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
			<div className="dashboard-cards-container grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div
						key={i}
						className="dashboard-widget rounded-xl border bg-card p-5"
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
			<div className="dashboard-cards-container grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				<div className="dashboard-widget rounded-xl border bg-card p-5">
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
		<div className="dashboard-cards-container grid grid-cols-1 gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			{/* Revenue Card */}
			<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
							Monthly Revenue
						</p>
						<div
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${isPositiveGrowth ? 'bg-success/10 text-success border border-success/20 dark:bg-success/20 dark:text-success dark:border-success/30' : 'bg-destructive/10 text-destructive border border-destructive/20 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/30'}`}
						>
							{isPositiveGrowth ? (
								<TrendingUp className="h-3 w-3" />
							) : (
								<TrendingDown className="h-3 w-3" />
							)}
							{formatPercentage(revenueGrowth)}
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-corporate-blue-600 dark:group-hover:text-corporate-blue-400">
							{formatCurrency(totalRevenue)}
						</h3>
						<p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
							{isPositiveGrowth ? (
								<>
									<TrendingUp className="h-4 w-4 text-success" />
									<span>Trending up this month</span>
								</>
							) : (
								<>
									<TrendingDown className="h-4 w-4 text-destructive" />
									<span>Down this month</span>
								</>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Tenants Card */}
			<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
							Active Tenants
						</p>
						<div className="badge badge-professional-gray">
							<TrendingUp className="h-3 w-3" />
							{totalTenants} total
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-muted-foreground">
							{activeTenants}
						</h3>
						<p className="text-sm text-muted-foreground font-medium">
							{activeTenants > 0
								? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active rate`
								: 'No active tenants yet'}
						</p>
					</div>
				</div>
			</div>

			{/* Properties Card */}
			<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
							Total Properties
						</p>
						<div className="badge badge-clean-accent">
							<TrendingUp className="h-3 w-3" />
							{stats.properties?.occupied || 0} occupied
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-muted-foreground">
							{totalProperties}
						</h3>
						<p className="text-sm text-muted-foreground font-medium">
							{totalProperties > 0
								? `${stats.properties?.occupied || 0} generating revenue`
								: 'Add your first property'}
						</p>
					</div>
				</div>
			</div>

			{/* Occupancy Rate Card */}
			<div className="dashboard-widget group relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-background via-muted/30 to-card shadow-sm transition-all duration-500 hover:shadow-lg hover:border-border hover:scale-[1.02]">
				<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-muted-foreground/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
							Occupancy Rate
						</p>
						<div
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${isExcellentOccupancy ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'}`}
						>
							{isExcellentOccupancy ? (
								<TrendingUp className="h-3 w-3" />
							) : (
								<TrendingDown className="h-3 w-3" />
							)}
							{isExcellentOccupancy ? 'Excellent' : 'Good'}
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-muted-foreground">
							{occupancyRate}%
						</h3>
						<p className="text-sm text-muted-foreground">
							{occupancyRate >= 90
								? "Excellent occupancy - you're doing great!"
								: occupancyRate >= 75
								? "Good occupancy - room for improvement"
								: "Low occupancy - focus on tenant acquisition"}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
