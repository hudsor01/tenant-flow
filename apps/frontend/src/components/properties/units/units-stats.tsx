'use client'

import { useUnitStats } from '@/hooks/api/use-units'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { handleStaticGenerationError } from '@/lib/utils/static-generation'
import type { UnitStats } from '@repo/shared'
import { Home , Wrench } from 'lucide-react'
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

	// NO CALCULATIONS - Backend provides percentages already calculated
	const formatPercentage = (rate: number) => {
		return `${rate}%` // Already a percentage from backend
	}

	const statItems = [
		{
			title: 'Total Units',
			value: stats.totalUnits,
			description: 'All property units',
			icon: Home,
			color: 'text-primary'
		},
		{
			title: 'Occupied Units',
			value: stats.occupiedUnits,
			description: `${formatPercentage(stats.occupancyRate)} occupancy`,
			icon: Home,
			color: 'text-green-600'
		},
		{
			title: 'Available Units',
			value: stats.availableUnits,
			description: 'Ready for tenants',
			icon: Home,
			color: 'text-blue-600'
		},
		{
			title: 'In Maintenance',
			value: stats.maintenanceUnits,
			description: 'Under repair',
			icon: Wrench,
			color: 'text-orange-600'
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
							<stat.icon className={cn('h-4 w-4', stat.color)} />
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

	// Error handling - graceful fallback for static generation
	if (error) {
		return handleStaticGenerationError(error, <UnitsStatsSkeleton />)
	}

	// Ensure we have stats data
	if (!stats) {
		return <UnitsStatsSkeleton />
	}

	return <UnitsStatsUI stats={stats} />
}
