'use client'

<<<<<<< HEAD
import { useMaintenanceStats } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Wrench,
	ClipboardList,
	PlayCircle,
	CheckCircle,
	Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceStats } from '@repo/shared'
=======
import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest } from '@repo/shared'
>>>>>>> origin/main

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

<<<<<<< HEAD
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
			icon: ClipboardList,
			color: 'text-primary'
		},
		{
			title: 'Open Requests',
			value: stats.open,
			description: 'Awaiting action',
			icon: Wrench,
			color: 'text-yellow-600'
		},
		{
			title: 'In Progress',
			value: stats.inProgress,
			description: 'Being worked on',
			icon: PlayCircle,
			color: 'text-blue-600'
		},
		{
			title: 'Completed',
			value: stats.completed,
=======
function calculateMaintenanceStats(requests: MaintenanceRequest[]) {
	const safeRequests = Array.isArray(requests) ? requests : []
	const totalRequests = safeRequests.length
	const openRequests = safeRequests.filter(
		request => request.status === 'OPEN'
	).length
	const inProgressRequests = safeRequests.filter(
		request => request.status === 'IN_PROGRESS'
	).length
	const completedRequests = safeRequests.filter(
		request => request.status === 'COMPLETED'
	).length

	// Calculate urgent/high priority requests
	const urgentRequests = safeRequests.filter(
		request =>
			request.priority === 'EMERGENCY' &&
			['OPEN', 'IN_PROGRESS'].includes(request.status)
	).length

	return {
		totalRequests,
		openRequests,
		inProgressRequests,
		completedRequests,
		urgentRequests
	}
}

interface MaintenanceStatsUIProps {
	stats: {
		totalRequests: number
		openRequests: number
		inProgressRequests: number
		completedRequests: number
		urgentRequests: number
	}
}

function MaintenanceStatsUI({ stats }: MaintenanceStatsUIProps) {
	const statItems = [
		{
			title: 'Total Requests',
			value: stats.totalRequests,
			description: `${stats.openRequests + stats.inProgressRequests} active`,
			icon: Wrench,
			color: 'text-primary'
		},
		{
			title: 'Open',
			value: stats.openRequests,
			description: 'Awaiting assignment',
			icon: Clock,
			color: 'text-orange-600'
		},
		{
			title: 'In Progress',
			value: stats.inProgressRequests,
			description: 'Being worked on',
			icon: AlertTriangle,
			color: 'text-yellow-600'
		},
		{
			title: 'Completed',
			value: stats.completedRequests,
>>>>>>> origin/main
			description: 'Successfully resolved',
			icon: CheckCircle,
			color: 'text-green-600'
		}
	]

	return (
<<<<<<< HEAD
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-4">
				{statItems.map(stat => {
					const Icon = stat.icon
					return (
						<Card
							key={stat.title}
							className="transition-all hover:shadow-md"
						>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">
									{stat.title}
								</CardTitle>
								<Icon className={cn('h-4 w-4', stat.color)} />
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
						<Clock className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatTime(stats.avgResolutionTime)}
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
								<span className="font-medium text-red-600">
									{stats.byPriority.emergency}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									High
								</span>
								<span className="font-medium text-orange-600">
									{stats.byPriority.high}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Medium
								</span>
								<span className="font-medium text-yellow-600">
									{stats.byPriority.medium}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-muted-foreground">
									Low
								</span>
								<span className="font-medium text-green-600">
									{stats.byPriority.low}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
=======
		<div className="grid gap-4 md:grid-cols-4">
			{statItems.map(stat => {
				const Icon = stat.icon
				return (
					<Card
						key={stat.title}
						className="transition-all hover:shadow-md"
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<Icon className={cn('h-4 w-4', stat.color)} />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stat.value}
							</div>
							<p className="text-muted-foreground text-xs">
								{stat.description}
							</p>
							{stat.title === 'Open' &&
								stats.urgentRequests > 0 && (
									<div className="mt-1">
										<span className="text-xs font-medium text-red-600">
											{stats.urgentRequests} urgent
										</span>
									</div>
								)}
						</CardContent>
					</Card>
				)
			})}
>>>>>>> origin/main
		</div>
	)
}

export function MaintenanceStats() {
<<<<<<< HEAD
	const { data: stats, isLoading, error } = useMaintenanceStats()
=======
	const {
		data: maintenanceRequests,
		isLoading,
		error
	} = useMaintenanceRequests()
>>>>>>> origin/main

	// Loading state
	if (isLoading) {
		return <MaintenanceStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

<<<<<<< HEAD
	// Ensure we have stats data
	if (!stats) {
		return <MaintenanceStatsSkeleton />
	}
=======
	// Calculate stats using pure function
	const stats = calculateMaintenanceStats(maintenanceRequests || [])
>>>>>>> origin/main

	return <MaintenanceStatsUI stats={stats} />
}
