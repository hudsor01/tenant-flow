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

	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			<CardLayout
				title="Monthly Revenue"
				description={formatCurrency(totalRevenue)}
				className="@container/card"
			>
				<div className="flex flex-col gap-2">
					<Badge variant="outline">
						{revenueGrowth >= 0 ? (
							<TrendingUp className="mr-1" />
						) : (
							<TrendingDown className="mr-1" />
						)}
						{formatPercentage(revenueGrowth)}
					</Badge>
					<div className="text-sm text-muted-foreground">
						{revenueGrowth >= 0 ? 'Trending up this month' : 'Down this month'}
					</div>
				</div>
			</CardLayout>

			<CardLayout
				title="Active Tenants"
				description={`${activeTenants} active`}
				className="@container/card"
			>
				<div className="flex flex-col gap-2">
					<Badge variant="outline">
						<TrendingUp className="mr-1" />
						{totalTenants} total
					</Badge>
					<div className="text-sm text-muted-foreground">
						{activeTenants} active of {totalTenants} total
					</div>
				</div>
			</CardLayout>

			<CardLayout
				title="Total Properties"
				description={`${totalProperties}`}
				className="@container/card"
			>
				<div className="flex flex-col gap-2">
					<Badge variant="outline">
						<TrendingUp className="mr-1" />
						{stats.properties?.occupied || 0} active
					</Badge>
					<div className="text-sm text-muted-foreground">
						Properties under management
					</div>
				</div>
			</CardLayout>

			<CardLayout
				title="Occupancy Rate"
				description={`${occupancyRate.toFixed(1)}%`}
				className="@container/card"
			>
				<div className="flex flex-col gap-2">
					<Badge variant="outline">
						{occupancyRate >= 90 ? (
							<TrendingUp className="mr-1" />
						) : (
							<TrendingDown className="mr-1" />
						)}
						{occupancyRate >= 90 ? 'Excellent' : 'Good'}
					</Badge>
					<div className="text-sm text-muted-foreground">
						{stats.units?.occupied || 0} of {stats.units?.total || 0} units
						occupied
					</div>
				</div>
			</CardLayout>
		</div>
	)
}
