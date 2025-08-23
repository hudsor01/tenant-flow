'use client'

import { useMaintenanceRequests } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest } from '@repo/shared'

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
			description: 'Successfully resolved',
			icon: CheckCircle,
			color: 'text-green-600'
		}
	]

	return (
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
		</div>
	)
}

export function MaintenanceStats() {
	const {
		data: maintenanceRequests,
		isLoading,
		error
	} = useMaintenanceRequests()

	// Loading state
	if (isLoading) {
		return <MaintenanceStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Calculate stats using pure function
	const stats = calculateMaintenanceStats(maintenanceRequests || [])

	return <MaintenanceStatsUI stats={stats} />
}
