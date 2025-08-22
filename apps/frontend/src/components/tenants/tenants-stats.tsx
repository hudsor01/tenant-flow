'use client'

import { useTenantStats } from '@/hooks/api/use-tenants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Users, UserCheck, UserX, Calendar, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TenantsStats() {
	const { data: stats, isLoading, error } = useTenantStats()

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
				<AlertTitle>Error loading tenants</AlertTitle>
				<AlertDescription>
					There was a problem loading your tenants data.
				</AlertDescription>
			</Alert>
		)
	}

	// Use backend-calculated statistics
	const totalTenants = stats?.total || 0
	const activeTenants = stats?.active || 0
	const inactiveTenants = stats?.inactive || 0
	const withActiveLeases = stats?.withActiveLeases || 0

	const statsCards = [
		{
			title: 'Total Tenants',
			value: totalTenants,
			description: 'All registered tenants',
			icon: Users,
			color: 'text-primary'
		},
		{
			title: 'Active Tenants',
			value: activeTenants,
			description: 'Currently active',
			icon: UserCheck,
			color: 'text-green-600'
		},
		{
			title: 'Inactive Tenants',
			value: inactiveTenants,
			description: 'Not currently active',
			icon: UserX,
			color: 'text-yellow-600'
		},
		{
			title: 'With Active Leases',
			value: withActiveLeases,
			description: 'Have active leases',
			icon: Calendar,
			color: 'text-blue-600'
		}
	]

	return (
		<div className="grid gap-4 md:grid-cols-4">
			{statsCards.map(stat => {
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
	)
}
