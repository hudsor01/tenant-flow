'use client'

import { useOptimistic, useTransition } from 'react'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { 
	Stats, 
	StatsGrid, 
	StatsHeader, 
	StatsValue, 
	StatsTrend, 
	StatsSkeleton
} from '@/components/ui/stats'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@repo/shared'

/**
 * Dashboard Stats Cards Component with React 19 useOptimistic
 * Focused component for displaying key metrics with instant feedback
 * Extracted from massive dashboard client component
 */
export function DashboardStatsCards() {
	const { data: stats, isLoading, error } = useDashboardOverview()
	const [isPending, _startTransition] = useTransition()

	// React 19 useOptimistic for instant feedback on metric updates
	const [optimisticStats, _updateOptimisticStats] = useOptimistic(
		stats,
		(
			currentStats: DashboardStats | undefined,
			optimisticUpdate: Partial<DashboardStats>
		) => {
			if (!currentStats) {
				return undefined
			}
			return {
				...currentStats,
				...optimisticUpdate
			}
		}
	)

	if (error) {
		return (
			<Alert variant="destructive" className="border-red-2 bg-red-1">
				<i className="i-lucide-alert-triangle h-4 w-4"  />
				<AlertDescription>
					Failed to load dashboard statistics. Please try refreshing
					the page.
				</AlertDescription>
			</Alert>
		)
	}

	if (isLoading) {
		return (
			<StatsGrid columns={4}>
				{Array.from({ length: 4 }).map((_, i) => (
					<StatsSkeleton key={i} showTrend />
				))}
			</StatsGrid>
		)
	}

	// Use optimistic stats for instant feedback, fallback to regular stats
	const currentStats = optimisticStats || stats

	const statCards = [
		{
			title: 'Total Properties',
			value: currentStats?.properties?.total ?? 0,
			description: `${currentStats?.units?.occupancyRate ?? 0}% occupancy`,
			icon: 'i-lucide-building-2',
			color: 'primary',
			bgColor: 'bg-simplify-soft',
			iconColor: 'text-white',
			iconBg: 'bg-simplify',
			borderColor: 'border-primary/20',
			trend: 'up',
			change: '+12%'
		},
		{
			title: 'Active Tenants',
			value: currentStats?.tenants?.total ?? 0,
			description: 'Active tenants',
			icon: 'i-lucide-users',
			color: 'success',
			bgColor: 'bg-gradient-to-br from-green-50 to-green-1/50',
			iconColor: 'text-white',
			iconBg: 'bg-green-5',
			borderColor: 'border-green-2',
			trend: 'up',
			change: '+8%'
		},
		{
			title: 'Total Units',
			value: currentStats?.units?.total ?? 0,
			description: 'Total units',
			icon: 'i-lucide-file-text',
			color: 'accent',
			bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100/50',
			iconColor: 'text-white',
			iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
			borderColor: 'border-teal-2',
			trend: 'up',
			change: '+5%'
		},
		{
			title: 'Maintenance',
			value: currentStats?.maintenance?.total ?? 0,
			description: 'Maintenance requests',
			icon: 'i-lucide-wrench',
			color: 'warning',
			bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
			iconColor: 'text-white',
			iconBg: 'bg-orange-5',
			borderColor: 'border-orange-2',
			trend: 'down',
			change: '-15%'
		}
	]

	return (
		<StatsGrid columns={4} className={cn(isPending && 'opacity-75')}>
			{statCards.map((stat, index) => {
				return (
					<Stats
						key={stat.title}
						className={cn(
							'transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02]',
							stat.bgColor,
							stat.borderColor,
							isPending && 'animate-pulse'
						)}
						emphasis="elevated"
						interactive
						style={{
							animationDelay: `${index * 100}ms`
						}}
					>
						<StatsHeader
							title={stat.title}
							subtitle={stat.description}
							icon={
								<div className={cn(
									'rounded-xl p-2.5 shadow-sm ring-1 ring-black/5',
									stat.iconBg
								)}>
									<i className={cn(stat.icon, cn('h-4 w-4', stat.iconColor))} />
								</div>
							}
							action={
								stat.trend && (
									<StatsTrend
										value={stat.trend === 'up' ? 8 : -5}
										label={stat.change}
										className="text-xs"
									/>
								)
							}
						/>

						<div className="mt-4">
							<StatsValue 
								value={stat.value}
								size="lg"
								className="text-foreground"
							/>
						</div>
					</Stats>
				)
			})}
		</StatsGrid>
	)
}
