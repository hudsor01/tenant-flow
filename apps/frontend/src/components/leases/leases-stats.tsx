'use client'

import { useLeaseStats } from '@/hooks/api/use-leases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	FileText,
	CheckCircle,
	AlertTriangle,
	Calendar,
	DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function LeasesStats() {
	const { data: stats, isLoading, error } = useLeaseStats()

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
				<AlertTitle>Error loading leases</AlertTitle>
				<AlertDescription>
					There was a problem loading your leases data.
				</AlertDescription>
			</Alert>
		)
	}

	// Use backend-calculated statistics
	const totalLeases = stats?.total || 0
	const activeLeases = stats?.active || 0
	const expiringSoon = stats?.expiringSoon || 0
	const totalMonthlyRent = stats?.totalMonthlyRent || 0

	const statsCards = [
		{
			title: 'Total Leases',
			value: totalLeases,
			description: `${activeLeases} currently active`,
			icon: FileText,
			color: 'text-primary'
		},
		{
			title: 'Active Leases',
			value: activeLeases,
			description: 'Currently in effect',
			icon: CheckCircle,
			color: 'text-green-600'
		},
		{
			title: 'Expiring Soon',
			value: expiringSoon,
			description: 'Within 30 days',
			icon: Calendar,
			color: expiringSoon > 0 ? 'text-orange-600' : 'text-gray-600'
		},
		{
			title: 'Monthly Revenue',
			value: `$${totalMonthlyRent.toLocaleString()}`,
			description: 'From active leases',
			icon: DollarSign,
			color: 'text-green-600'
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
