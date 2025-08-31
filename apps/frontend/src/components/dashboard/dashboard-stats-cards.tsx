'use client'

import { useOptimistic, useTransition } from 'react'
import { Building2, Users, FileText, Wrench, AlertTriangle } from 'lucide-react'
import { useDashboardOverview } from '@/hooks/api/use-dashboard'
import { 
	Stats, 
	StatsGrid, 
	StatsHeader, 
	StatsTrend
} from '@/components/ui/stats'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkline } from './sparkline'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@repo/shared'

// Simple loading skeleton without complex animations
function StatsCardSkeleton() {
  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl p-6 border border-gray-100/50 dark:border-slate-800/50 shadow-sm">
      <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4 animate-pulse" />
      <div className="w-24 h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2 animate-pulse" />
      <div className="w-16 h-8 bg-gray-300 dark:bg-slate-600 rounded mb-2 animate-pulse" />
      <div className="w-20 h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
  )
}

/**
 * Simplified Dashboard Stats Cards Component
 * Focus on performance and clarity over complex animations
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
			<Alert variant="destructive" className="border-red-200 bg-red-100">
				<AlertTriangle className="h-4 w-4" />
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
					<StatsCardSkeleton key={i} />
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
			icon: Building2,
			trend: 'up',
			change: '+12%',
			sparklineData: [5, 8, 7, 10, 12, 15, 18]
		},
		{
			title: 'Active Tenants',
			value: currentStats?.tenants?.total ?? 0,
			description: 'Active tenants',
			icon: Users,
			trend: 'up',
			change: '+8%'
		},
		{
			title: 'Total Units',
			value: currentStats?.units?.total ?? 0,
			description: 'Total units',
			icon: FileText,
			trend: 'up',
			change: '+5%'
		},
		{
			title: 'Maintenance',
			value: currentStats?.maintenance?.total ?? 0,
			description: 'Maintenance requests',
			icon: Wrench,
			trend: 'down',
			change: '-15%'
		}
	]

	return (
		<StatsGrid columns={4} className={cn(isPending && 'opacity-75')}>
			{statCards.map((stat, index) => (
				<Stats
					key={stat.title}
					className={cn(
						'group relative cursor-pointer select-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-100/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200',
						isPending && 'animate-pulse'
					)}
					emphasis="elevated"
					interactive
				>
					<StatsHeader
						title={stat.title}
						subtitle={stat.description}
						icon={
							<div className="rounded-xl p-2.5 bg-blue-500 text-white shadow-sm">
								<stat.icon className="h-4 w-4" />
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

					<div className="mt-4 flex items-end justify-between">
						<div className="text-3xl font-bold text-foreground">
							{stat.value}
						</div>
						{'sparklineData' in stat && stat.sparklineData && (
							<div className="opacity-70">
								<Sparkline 
									data={stat.sparklineData}
									color="#3b82f6"
								/>
							</div>
						)}
					</div>
				</Stats>
			))}
		</StatsGrid>
	)
}
