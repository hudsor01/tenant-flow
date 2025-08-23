'use client'

import { useTenants } from '@/hooks/api/use-tenants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserCheck, UserX, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tenant } from '@repo/shared'

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

function calculateTenantStats(tenants: Tenant[]) {
	const totalTenants = tenants.length
	const acceptedInvitations = tenants.filter(tenant => tenant.invitationStatus === 'ACCEPTED').length
	const pendingInvitations = tenants.filter(
		tenant => tenant.invitationStatus === 'PENDING' || tenant.invitationStatus === 'SENT'
	).length
	
	// Without access to lease data, we cannot calculate expiring leases
	// This would require using TenantWithLeases type from a different endpoint
	const expiringLeases = 0

	return {
		totalTenants,
		acceptedInvitations,
		pendingInvitations,
		expiringLeases
	}
}

interface TenantsStatsUIProps {
	stats: {
		totalTenants: number
		acceptedInvitations: number
		pendingInvitations: number
		expiringLeases: number
	}
}

function TenantsStatsUI({ stats }: TenantsStatsUIProps) {
	const statItems = [
		{
			title: 'Total Tenants',
			value: stats.totalTenants,
			description: 'All registered tenants',
			icon: Users,
			color: 'text-primary'
		},
		{
			title: 'Accepted Invites',
			value: stats.acceptedInvitations,
			description: 'Active tenant accounts',
			icon: UserCheck,
			color: 'text-green-600'
		},
		{
			title: 'Pending Invites',
			value: stats.pendingInvitations,
			description: 'Awaiting acceptance',
			icon: UserX,
			color: 'text-yellow-600'
		},
		{
			title: 'Expiring Soon',
			value: stats.expiringLeases,
			description: 'Requires enhanced data',
			icon: Calendar,
			color: 'text-gray-400'
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
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

export function TenantsStats() {
	const { data: tenants, isLoading, error } = useTenants()

	// Loading state
	if (isLoading) {
		return <TenantsStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Calculate stats using pure function
	const stats = calculateTenantStats(tenants || [])

	return <TenantsStatsUI stats={stats} />
}
