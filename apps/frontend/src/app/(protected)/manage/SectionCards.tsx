'use client'

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
		<div className="grid grid-cols-1 gap-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			{/* Revenue Card */}
			<div className="group relative overflow-hidden rounded-premium-lg border-2 border-slate-200/60 bg-linear-to-br from-white via-slate-50/30 to-slate-100/20 shadow-premium-sm transition-all duration-500 hover:shadow-premium-xl hover:border-slate-300/80 hover:scale-[1.02] dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 dark:hover:border-slate-600/80">
				<div className="absolute inset-0 bg-linear-to-br from-corporate-blue-500/5 via-transparent to-professional-gray-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-corporate-blue-400/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
							Monthly Revenue
						</p>
						<div
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${isPositiveGrowth ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' : 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'}`}
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
						<h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-corporate-blue-600 dark:group-hover:text-corporate-blue-400">
							{formatCurrency(totalRevenue)}
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 font-medium">
							{isPositiveGrowth ? (
								<>
									<TrendingUp className="h-4 w-4 text-emerald-500" />
									<span>Trending up this month</span>
								</>
							) : (
								<>
									<TrendingDown className="h-4 w-4 text-red-500" />
									<span>Down this month</span>
								</>
							)}
						</p>
					</div>
				</div>
			</div>

			{/* Tenants Card */}
			<div className="group relative overflow-hidden rounded-premium-lg border-2 border-slate-200/60 bg-linear-to-br from-white via-slate-50/30 to-slate-100/20 shadow-premium-sm transition-all duration-500 hover:shadow-premium-xl hover:border-slate-300/80 hover:scale-[1.02] dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 dark:hover:border-slate-600/80">
				<div className="absolute inset-0 bg-linear-to-br from-professional-gray-500/5 via-transparent to-slate-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-professional-gray-400/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
							Active Tenants
						</p>
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 transition-all duration-300">
							<TrendingUp className="h-3 w-3" />
							{totalTenants} total
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-professional-gray-600 dark:group-hover:text-professional-gray-400">
							{activeTenants}
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
							{activeTenants > 0
								? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active rate`
								: 'No active tenants yet'}
						</p>
					</div>
				</div>
			</div>

			{/* Properties Card */}
			<div className="group relative overflow-hidden rounded-premium-lg border-2 border-slate-200/60 bg-linear-to-br from-white via-slate-50/30 to-slate-100/20 shadow-premium-sm transition-all duration-500 hover:shadow-premium-xl hover:border-slate-300/80 hover:scale-[1.02] dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 dark:hover:border-slate-600/80">
				<div className="absolute inset-0 bg-linear-to-br from-clean-accent-500/5 via-transparent to-slate-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-clean-accent-400/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
							Total Properties
						</p>
						<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 transition-all duration-300">
							<TrendingUp className="h-3 w-3" />
							{stats.properties?.occupied || 0} occupied
						</div>
					</div>
					<div className="space-y-3">
						<h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-clean-accent-600 dark:group-hover:text-clean-accent-400">
							{totalProperties}
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
							{totalProperties > 0
								? `${stats.properties?.occupied || 0} generating revenue`
								: 'Add your first property'}
						</p>
					</div>
				</div>
			</div>

			{/* Occupancy Rate Card */}
			<div className="group relative overflow-hidden rounded-premium-lg border-2 border-slate-200/60 bg-linear-to-br from-white via-slate-50/30 to-slate-100/20 shadow-premium-sm transition-all duration-500 hover:shadow-premium-xl hover:border-slate-300/80 hover:scale-[1.02] dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20 dark:hover:border-slate-600/80">
				<div className="absolute inset-0 bg-linear-to-br from-slate-500/5 via-transparent to-corporate-blue-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
				<div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-slate-400/10 to-transparent rounded-full -translate-y-16 translate-x-16 transition-transform duration-500 group-hover:scale-110" />
				<div className="relative p-6">
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-bold text-slate-600 dark:text-slate-400 tracking-wide uppercase">
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
						<h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-slate-600 dark:group-hover:text-slate-400">
							{occupancyRate.toFixed(1)}%
						</h3>
						<p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
							{stats.units?.occupied || 0} of {stats.units?.total || 0} units
							filled
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
