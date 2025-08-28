'use client'

import { useMaintenanceStats } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { MaintenanceStats } from '@repo/shared/types/dashboard-stats'

function MaintenanceStatsSkeleton() {
	return (
		<div className="grid gap-4 md:grid-cols-4">
			{[...Array(4)].map((_, i) => (
				<Card key={i}>
					<CardHeader className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-8 w-32" />
					</CardHeader>
				</Card>
			))}
		</div>
	)
}

interface MaintenanceStatsUIProps {
	stats: MaintenanceStats
}

function MaintenanceStatsUI({ stats }: MaintenanceStatsUIProps) {
	const formatTime = (hours: number) => {
		if (hours < 24) {
			return `${Math.round(hours)}h`
		} else {
			const days = Math.floor(hours / 24)
			const remainingHours = Math.round(hours % 24)
			return remainingHours > 0
				? `${days}d ${remainingHours}h`
				: `${days}d`
		}
	}

	const statItems = [
		{
			title: 'Total Requests',
			value: stats.total,
			description: 'All maintenance requests',
			icon: 'i-lucide-clipboard-list',
			color: 'text-primary'
		},
		{
			title: 'Open Requests',
			value: stats.open,
			description: 'Awaiting action',
			icon: 'i-lucide-wrench',
			color: 'text-yellow-6'
		},
		{
			title: 'In Progress',
			value: stats.inProgress,
			description: 'Being worked on',
			icon: 'i-lucide-play-circle',
			color: 'text-blue-6'
		},
		{
			title: 'Completed',
			value: stats.completed,
			description: 'Successfully resolved',
			icon: 'i-lucide-check-circle',
			color: 'text-green-6'
		}
	]

	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-4">
				{statItems.map(stat => {
					return (
						<Card
							key={stat.title}
							className="transition-all hover:shadow-md"
						>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									{stat.title}
								</CardTitle>
								<i className={cn(stat.icon, 'inline-block h-4 w-4', stat.color)} />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{stat.value}
								</div>
								<p className="text-muted-foreground text-xs">
									{stat.description}
								</p>
							</CardContent>
						</Card>
					)
				})}
			</div>

			{/* Additional Metrics */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card className="transition-all hover:shadow-md">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Avg Resolution Time
						</CardTitle>
						<i className="i-lucide-clock h-4 w-4 text-blue-6"  />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatTime(stats.averageCompletionTime || 0)}
						</div>
						<p className="text-muted-foreground text-xs">
							Time to complete requests
						</p>
					</CardContent>
				</Card>

				<Card className="transition-all hover:shadow-md">
					<CardHeader>
						<CardTitle className="text-sm font-medium">
							Priority Breakdown
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Emergency
								</span>
								<span className="font-medium text-red-6">
									{0}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									High
								</span>
								<span className="font-medium text-orange-6">
									{0}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Medium
								</span>
								<span className="font-medium text-yellow-6">
									{0}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Low
								</span>
								<span className="font-medium text-green-6">
									{0}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

export function MaintenanceStats() {
	const { data: stats, isLoading, error } = useMaintenanceStats()

	// Loading state
	if (isLoading) {
		return <MaintenanceStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Ensure we have stats data
	if (!stats) {
		return <MaintenanceStatsSkeleton />
	}

	return <MaintenanceStatsUI stats={stats} />
}
