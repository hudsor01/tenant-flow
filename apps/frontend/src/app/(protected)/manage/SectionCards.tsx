import type { DashboardStats } from '@repo/shared/types/core'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { CardLayout } from '@/components/ui/card-layout'
import { formatCurrency, formatPercentage } from '@/lib/utils'

interface SectionCardsProps {
	stats?: Partial<DashboardStats>
}

export function SectionCards({ stats = {} }: SectionCardsProps) {
	const totalRevenue = stats.revenue?.monthly || 0
	const revenueGrowth = stats.revenue?.growth || 0
	const totalTenants = stats.tenants?.total || 0
	const activeTenants = stats.tenants?.active || 0
	const totalProperties = stats.properties?.total || 0
	const occupancyRate = stats.units?.occupancyRate || 0

	const isPositiveGrowth = revenueGrowth >= 0
	const isExcellentOccupancy = occupancyRate >= 90

	return (
		<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			{/* Revenue Card */}
			<CardLayout
				title="Monthly Revenue"
				description={formatCurrency(totalRevenue)}
				className="@container/card group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-primary/5 to-card dark:bg-card border-2 hover:border-primary/30"
			>
				<div className="flex flex-col gap-3 pt-2">
					<Badge
						variant={isPositiveGrowth ? 'default' : 'secondary'}
						className={`w-fit ${isPositiveGrowth ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30'}`}
					>
						{isPositiveGrowth ? (
							<TrendingUp className="mr-1.5 h-3.5 w-3.5" />
						) : (
							<TrendingDown className="mr-1.5 h-3.5 w-3.5" />
						)}
						{formatPercentage(revenueGrowth)}
					</Badge>
					<div className="text-sm text-muted-foreground font-medium">
						{isPositiveGrowth
							? '📈 Trending up this month'
							: '📉 Down this month'}
					</div>
				</div>
			</CardLayout>

			{/* Tenants Card */}
			<CardLayout
				title="Active Tenants"
				description={`${activeTenants}`}
				className="@container/card group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-blue-500/5 to-card dark:bg-card border-2 hover:border-blue-500/30"
			>
				<div className="flex flex-col gap-3 pt-2">
					<Badge
						variant="outline"
						className="w-fit bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
					>
						<TrendingUp className="mr-1.5 h-3.5 w-3.5" />
						{totalTenants} total
					</Badge>
					<div className="text-sm text-muted-foreground font-medium">
						{activeTenants > 0
							? `${((activeTenants / totalTenants) * 100).toFixed(0)}% active`
							: 'No active tenants yet'}
					</div>
				</div>
			</CardLayout>

			{/* Properties Card */}
			<CardLayout
				title="Total Properties"
				description={`${totalProperties}`}
				className="@container/card group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-purple-500/5 to-card dark:bg-card border-2 hover:border-purple-500/30"
			>
				<div className="flex flex-col gap-3 pt-2">
					<Badge
						variant="outline"
						className="w-fit bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
					>
						<TrendingUp className="mr-1.5 h-3.5 w-3.5" />
						{stats.properties?.occupied || 0} occupied
					</Badge>
					<div className="text-sm text-muted-foreground font-medium">
						{totalProperties > 0
							? `${stats.properties?.occupied || 0} properties generating revenue`
							: 'Add your first property'}
					</div>
				</div>
			</CardLayout>

			{/* Occupancy Rate Card */}
			<CardLayout
				title="Occupancy Rate"
				description={`${occupancyRate.toFixed(1)}%`}
				className="@container/card group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-amber-500/5 to-card dark:bg-card border-2 hover:border-amber-500/30"
			>
				<div className="flex flex-col gap-3 pt-2">
					<Badge
						variant={isExcellentOccupancy ? 'default' : 'secondary'}
						className={`w-fit ${isExcellentOccupancy ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'}`}
					>
						{isExcellentOccupancy ? (
							<TrendingUp className="mr-1.5 h-3.5 w-3.5" />
						) : (
							<TrendingDown className="mr-1.5 h-3.5 w-3.5" />
						)}
						{isExcellentOccupancy ? 'Excellent' : 'Good'}
					</Badge>
					<div className="text-sm text-muted-foreground font-medium">
						{stats.units?.occupied || 0} of {stats.units?.total || 0} units
						filled
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
