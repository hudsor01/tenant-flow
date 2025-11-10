'use client'

import { Badge } from '#components/ui/badge'
import { Skeleton } from '#components/ui/skeleton'
import { useDashboardPageDataUnified } from '#hooks/api/use-dashboard'
import { formatCurrency, formatPercentage } from '@repo/shared/utils/currency'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function SectionCards() {
	const { data, isLoading, error } = useDashboardPageDataUnified()
	const stats = data?.stats
	const isError = !!error

	// Show loading skeletons
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="rounded-xl border bg-card p-5">
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
			<div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
				<div className="rounded-xl border bg-card p-5">
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
		<div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			{/* Revenue Card */}
			<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50">
				<div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="relative p-5">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-medium text-muted-foreground">
							Monthly Revenue
						</p>
						<Badge
							variant={isPositiveGrowth ? 'default' : 'secondary'}
							className={`transition-all duration-200 ${isPositiveGrowth ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'}`}
						>
							{isPositiveGrowth ? (
								<TrendingUp className="mr-1 h-3 w-3" />
							) : (
								<TrendingDown className="mr-1 h-3 w-3" />
							)}
							{formatPercentage(revenueGrowth)}
						</Badge>
					</div>
					<div className="space-y-2">
						<h3 className="text-3xl font-bold tracking-tight transition-colors group-hover:text-primary">
							{formatCurrency(totalRevenue)}
						</h3>
						<p className="text-xs text-muted-foreground flex items-center gap-1.5">
							{isPositiveGrowth ? (
								<>
									<TrendingUp className="h-3 w-3" />
									Trending up this month
								</>
							) : (
								<>
									<TrendingDown className="h-3 w-3" />
									Down this month
								</>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Tenants Card */}
			<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/50">
				<div className="absolute inset-0 bg-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="relative p-5">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-medium text-muted-foreground">
							Active Tenants
						</p>
						<Badge
							variant="outline"
							className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 transition-all duration-200"
						>
							<TrendingUp className="mr-1 h-3 w-3" />
							{totalTenants} total
						</Badge>
					</div>
					<div className="space-y-2">
						<h3 className="text-3xl font-bold tracking-tight transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
							{activeTenants}
						</h3>
						<p className="text-xs text-muted-foreground">
							{activeTenants > 0
								? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active rate`
								: 'No active tenants yet'}
						</p>
					</div>
				</div>
			</div>

			{/* Properties Card */}
			<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:border-purple-500/50">
				<div className="absolute inset-0 bg-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="relative p-5">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-medium text-muted-foreground">
							Total Properties
						</p>
						<Badge
							variant="outline"
							className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 transition-all duration-200"
						>
							<TrendingUp className="mr-1 h-3 w-3" />
							{stats.properties?.occupied || 0} occupied
						</Badge>
					</div>
					<div className="space-y-2">
						<h3 className="text-3xl font-bold tracking-tight transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
							{totalProperties}
						</h3>
						<p className="text-xs text-muted-foreground">
							{totalProperties > 0
								? `${stats.properties?.occupied || 0} generating revenue`
								: 'Add your first property'}
						</p>
					</div>
				</div>
			</div>

			{/* Occupancy Rate Card */}
			<div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/50">
				<div className="absolute inset-0 bg-amber-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
				<div className="relative p-5">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-medium text-muted-foreground">
							Occupancy Rate
						</p>
						<Badge
							variant={isExcellentOccupancy ? 'default' : 'secondary'}
							className={`transition-all duration-200 ${isExcellentOccupancy ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'}`}
						>
							{isExcellentOccupancy ? (
								<TrendingUp className="mr-1 h-3 w-3" />
							) : (
								<TrendingDown className="mr-1 h-3 w-3" />
							)}
							{isExcellentOccupancy ? 'Excellent' : 'Good'}
						</Badge>
					</div>
					<div className="space-y-2">
						<h3 className="text-3xl font-bold tracking-tight transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
							{occupancyRate.toFixed(1)}%
						</h3>
						<p className="text-xs text-muted-foreground">
							{stats.units?.occupied || 0} of {stats.units?.total || 0} units
							filled
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
