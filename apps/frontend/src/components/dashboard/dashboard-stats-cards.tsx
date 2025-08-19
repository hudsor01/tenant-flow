'use client'

import { useOptimistic, useTransition } from 'react'
import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
	Building2,
	Users,
	FileText,
	Wrench,
	AlertTriangle,
	TrendingUp,
	TrendingDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@repo/shared'

/**
 * Dashboard Stats Cards Component with React 19 useOptimistic
 * Focused component for displaying key metrics with instant feedback
 * Extracted from massive dashboard client component
 */
export function DashboardStatsCards() {
	const { data: stats, isLoading, error } = useDashboardStats()
	const [isPending, _startTransition] = useTransition()

	// React 19 useOptimistic for instant feedback on metric updates
	const [optimisticStats, _updateOptimisticStats] = useOptimistic(
		stats,
		(
			currentStats: DashboardStats | undefined,
			optimisticUpdate: Partial<DashboardStats>
		) => {
			if (!currentStats) return undefined
			return {
				...currentStats,
				...optimisticUpdate
			}
		}
	)

	if (error) {
		return (
			<Alert variant="destructive" className="border-red-200 bg-red-50">
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
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i} className="card-modern">
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-4 rounded-full" />
						</CardHeader>
						<CardContent>
							<Skeleton className="mb-2 h-8 w-16" />
							<Skeleton className="h-3 w-32" />
						</CardContent>
					</Card>
				))}
			</div>
		)
	}

	// Use optimistic stats for instant feedback, fallback to regular stats
	const currentStats = optimisticStats || stats

	const statCards = [
		{
			title: 'Total Properties',
			value: currentStats?.properties?.totalProperties || 0,
			description: `${currentStats?.properties?.occupancyRate || 0}% occupancy`,
			icon: Building2,
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
			value: currentStats?.tenants?.totalTenants || 0,
			description: 'Active tenants',
			icon: Users,
			color: 'success',
			bgColor: 'bg-gradient-to-br from-green-50 to-green-100/50',
			iconColor: 'text-white',
			iconBg: 'bg-green-500',
			borderColor: 'border-green-200',
			trend: 'up',
			change: '+8%'
		},
		{
			title: 'Active Leases',
			value: currentStats?.leases?.totalLeases || 0,
			description: 'Active leases',
			icon: FileText,
			color: 'accent',
			bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100/50',
			iconColor: 'text-white',
			iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
			borderColor: 'border-teal-200',
			trend: 'up',
			change: '+5%'
		},
		{
			title: 'Maintenance',
			value: 0,
			description: 'Maintenance requests',
			icon: Wrench,
			color: 'warning',
			bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
			iconColor: 'text-white',
			iconBg: 'bg-orange-500',
			borderColor: 'border-orange-200',
			trend: 'down',
			change: '-15%'
		}
	]

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{statCards.map((stat, index) => {
				const Icon = stat.icon
				const TrendIcon =
					stat.trend === 'up' ? TrendingUp : TrendingDown

				return (
					<Card
						key={stat.title}
						className={cn(
							'group relative overflow-hidden transition-all duration-500',
							'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl',
							'border-2 shadow-sm backdrop-blur-sm',
							stat.borderColor,
							isPending && 'animate-pulse'
						)}
						style={{
							animationDelay: `${index * 100}ms`
						}}
					>
						{/* Gradient overlay for modern look */}
						<div
							className={cn(
								'absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-80',
								stat.bgColor
							)}
						/>

						<CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-3">
							<CardTitle className="text-heading-sm text-foreground/90 group-hover:text-foreground transition-colors">
								{stat.title}
							</CardTitle>
							<div
								className={cn(
									'rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
									'shadow-sm ring-1 ring-black/5 backdrop-blur-sm',
									'group-hover:shadow-md',
									stat.iconBg
								)}
							>
								<Icon
									className={cn(
										'h-4 w-4 transition-colors duration-300',
										stat.iconColor
									)}
								/>
							</div>
						</CardHeader>

						<CardContent className="relative z-10">
							<div className="space-y-2">
								<div className="text-display-lg text-foreground font-bold transition-all duration-300 group-hover:scale-105">
									{typeof stat.value === 'number'
										? stat.value.toLocaleString()
										: stat.value}
								</div>
								<div className="flex items-center justify-between">
									<p className="text-ui-sm text-muted-foreground font-medium">
										{stat.description}
									</p>
									<div
										className={cn(
											'flex items-center gap-1 rounded-full px-2 py-1 font-medium',
											'bg-white/80 shadow-sm backdrop-blur-sm',
											'text-ui-xs',
											stat.trend === 'up'
												? 'text-green-700 ring-1 ring-green-200'
												: 'text-red-700 ring-1 ring-red-200'
										)}
									>
										<TrendIcon className="h-3 w-3" />
										{stat.change}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}
