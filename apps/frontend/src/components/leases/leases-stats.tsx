'use client'

import { useLeases } from '@/hooks/api/use-leases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, CheckCircle, Calendar, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lease } from '@repo/shared'

function LeasesStatsSkeleton() {
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

function calculateLeaseStats(leases: Lease[]) {
	const totalLeases = leases.length
	const activeLeases = leases.filter(
		lease => lease.status === 'ACTIVE'
	).length

	// Calculate leases expiring within 30 days
	const expiringSoon = leases.filter(lease => {
		if (lease.status !== 'ACTIVE') {
			return false
		}
		const endDate = new Date(lease.endDate)
		const thirtyDaysFromNow = new Date()
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
		return endDate <= thirtyDaysFromNow && endDate > new Date()
	}).length

	// Calculate total monthly rent from active leases
	const totalMonthlyRent = leases.reduce((total, lease) => {
		if (lease.status === 'ACTIVE') {
			return total + (lease.rentAmount ?? 0)
		}
		return total
	}, 0)

	return {
		totalLeases,
		activeLeases,
		expiringSoon,
		totalMonthlyRent
	}
}

interface LeasesStatsUIProps {
	stats: {
		totalLeases: number
		activeLeases: number
		expiringSoon: number
		totalMonthlyRent: number
	}
}

function LeasesStatsUI({ stats }: LeasesStatsUIProps) {
	const statItems = [
		{
			title: 'Total Leases',
			value: stats.totalLeases,
			description: `${stats.activeLeases} currently active`,
			icon: FileText,
			color: 'text-primary'
		},
		{
			title: 'Active Leases',
			value: stats.activeLeases,
			description: 'Currently in effect',
			icon: CheckCircle,
			color: 'text-green-600'
		},
		{
			title: 'Expiring Soon',
			value: stats.expiringSoon,
			description: 'Within 30 days',
			icon: Calendar,
			color: stats.expiringSoon > 0 ? 'text-orange-600' : 'text-gray-600'
		},
		{
			title: 'Monthly Revenue',
			value: `$${stats.totalMonthlyRent.toLocaleString()}`,
			description: 'From active leases',
			icon: DollarSign,
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
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

export function LeasesStats() {
	const { data: leases, isLoading, error } = useLeases()

	// Loading state
	if (isLoading) {
		return <LeasesStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Calculate stats using pure function
	const stats = calculateLeaseStats(leases || [])

	return <LeasesStatsUI stats={stats} />
}
