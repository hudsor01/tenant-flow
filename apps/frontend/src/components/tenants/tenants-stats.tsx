'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useTenantStats } from '@/hooks/api/use-tenants'
import type { TenantStats } from '@repo/shared'

function TenantsStatsSkeleton() {
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

// REMOVED: Client-side calculation replaced by backend server action
// Now using calculateTenantStats from tenant-stats-actions.ts
// This ensures data consistency and can access lease data when available

interface TenantsStatsUIProps {
	stats: TenantStats
}

function TenantsStatsUI({ stats }: TenantsStatsUIProps) {
	const statItems = [
		{
			title: 'Total Tenants',
			value: stats.totalTenants,
			description: 'All registered tenants',
			icon: 'i-lucide-users',
			color: 'text-primary'
		},
		{
			title: 'Accepted Invites',
			value: stats.acceptedInvitations,
			description: 'Active tenant accounts',
			icon: 'i-lucide-user-check',
			color: 'text-green-600'
		},
		{
			title: 'Pending Invites',
			value: stats.pendingInvitations,
			description: 'Awaiting acceptance',
			icon: 'i-lucide-user-x',
			color: 'text-yellow-600'
		},
		{
			title: 'Expiring Soon',
			value: stats.expiringLeases,
			description: 'Requires enhanced data',
			icon: 'i-lucide-calendar',
			color: 'text-gray-400'
		}
	]

	return (
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
							<i className={cn('h-4 w-4', stat.color, stat.icon)} />
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

export function TenantsStats() {
	const { data: stats, error, isLoading } = useTenantStats()

	// Loading state
	if (isLoading) {
		return <TenantsStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary  
	if (error) {
		throw error
	}

	// Stats fetched via hook
	return <TenantsStatsUI stats={stats} />
}
