import type { DashboardStats } from '@repo/shared/types/core'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'

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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}

	const formatPercentage = (value: number) => {
		return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
	}

	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Monthly Revenue</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{formatCurrency(totalRevenue)}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{revenueGrowth >= 0 ? <TrendingUp /> : <TrendingDown />}
							{formatPercentage(revenueGrowth)}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{revenueGrowth >= 0 ? 'Trending up this month' : 'Down this month'}{' '}
						{revenueGrowth >= 0 ? (
							<TrendingUp className="size-4" />
						) : (
							<TrendingDown className="size-4" />
						)}
					</div>
					<div className="text-muted-foreground">Total monthly collections</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Active Tenants</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{activeTenants}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<TrendingUp />
							{totalTenants} total
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						Strong tenant retention <TrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground">
						{activeTenants} active of {totalTenants} total
					</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Total Properties</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{totalProperties}
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							<TrendingUp />
							{stats.properties?.occupied || 0} active
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						Portfolio growing <TrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground">
						Properties under management
					</div>
				</CardFooter>
			</Card>
			<Card className="@container/card">
				<CardHeader>
					<CardDescription>Occupancy Rate</CardDescription>
					<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						{occupancyRate.toFixed(1)}%
					</CardTitle>
					<CardAction>
						<Badge variant="outline">
							{occupancyRate >= 90 ? <TrendingUp /> : <TrendingDown />}
							{occupancyRate >= 90 ? 'Excellent' : 'Good'}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1.5 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium">
						{occupancyRate >= 90 ? (
							<>
								Strong performance <TrendingUp className="size-4" />
							</>
						) : (
							<>
								Room for improvement <TrendingDown className="size-4" />
							</>
						)}
					</div>
					<div className="text-muted-foreground">
						{stats.units?.occupied || 0} of {stats.units?.total || 0} units
						occupied
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
