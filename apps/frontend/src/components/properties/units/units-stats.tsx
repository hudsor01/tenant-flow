'use client'

import { useUnitStats } from '@/hooks/api/use-units'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { UnitStats } from '@repo/shared'

function UnitsStatsSkeleton() {
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

interface UnitsStatsUIProps {
	stats: UnitStats
}

function UnitsStatsUI({ stats }: UnitsStatsUIProps) {

	const formatPercentage = (rate: number) => {
		return `${Math.round(rate * 100)}%`
	}

	const statItems = [
		{
			title: 'Total Units',
			value: stats.totalUnits,
			description: 'All property units',
			icon: 'i-lucide-home',
			color: 'text-primary'
		},
		{
			title: 'Occupied Units',
			value: stats.occupiedUnits,
			description: `${formatPercentage(stats.occupancyRate)} occupancy`,
			icon: 'i-lucide-home',
			color: 'text-green-6'
		},
		{
			title: 'Available Units',
			value: stats.availableUnits,
			description: 'Ready for tenants',
			icon: 'i-lucide-home',
			color: 'text-blue-6'
		},
		{
			title: 'In Maintenance',
			value: stats.maintenanceUnits,
			description: 'Under repair',
			icon: 'i-lucide-wrench',
			color: 'text-orange-6'
		}
	]

	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-4">
				{statItems.map(stat => (
					<Card
						key={stat.title}
						className="transition-all hover:shadow-md"
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								{stat.title}
							</CardTitle>
							<i className={cn('inline-block h-4 w-4', stat.icon, stat.color)} />
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
				))}
			</div>

		</div>
	)
}

export function UnitsStats() {
	const { data: stats, isLoading, error } = useUnitStats()

	// Loading state
	if (isLoading) {
		return <UnitsStatsSkeleton />
	}

	// Error handling - throw to be caught by error boundary
	if (error) {
		throw error
	}

	// Ensure we have stats data
	if (!stats) {
		return <UnitsStatsSkeleton />
	}

	return <UnitsStatsUI stats={stats} />
}
