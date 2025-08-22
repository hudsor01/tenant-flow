'use client'

import { useMaintenanceStats } from '@/hooks/api/use-maintenance'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MaintenanceStats() {
	const {
		data: stats,
		isLoading,
		error
	} = useMaintenanceStats()

	if (isLoading) {
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

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" />
				<AlertTitle>Error loading maintenance requests</AlertTitle>
				<AlertDescription>
					There was a problem loading your maintenance data.
				</AlertDescription>
			</Alert>
		)
	}

	// Use backend stats data
	const totalRequests = stats?.total || 0
	const openRequests = stats?.open || 0
	const inProgressRequests = (stats?.assigned || 0) + (stats?.inProgress || 0)
	const completedRequests = stats?.completed || 0
	const overdueRequests = stats?.overdue || 0

	const statCards = [
		{
			title: 'Total Requests',
			value: totalRequests,
			description: `${openRequests + inProgressRequests} active`,
			icon: Wrench,
			color: 'text-primary'
		},
		{
			title: 'Open',
			value: openRequests,
			description: 'Awaiting assignment',
			icon: Clock,
			color: 'text-orange-600'
		},
		{
			title: 'In Progress',
			value: inProgressRequests,
			description: 'Being worked on',
			icon: AlertTriangle,
			color: 'text-yellow-600'
		},
		{
			title: 'Completed',
			value: completedRequests,
			description: 'Successfully resolved',
			icon: CheckCircle,
			color: 'text-green-600'
		}
	]

	return (
		<div className="grid gap-4 md:grid-cols-4">
			{statCards.map(stat => {
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
							{stat.title === 'Open' && overdueRequests > 0 && (
								<div className="mt-1">
									<span className="text-xs font-medium text-red-600">
										{overdueRequests} overdue
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
