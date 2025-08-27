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
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(amount)
	}

	const formatPercentage = (rate: number) => {
		return `${Math.round(rate * 100)}%`
	}

	const statItems = [
		{
			title: 'Total Units',
			value: stats.total,
			description: 'All property units',
			icon: Home,
			color: 'text-primary'
		},
		{
			title: 'Occupied Units',
			value: stats.occupied,
			description: `${formatPercentage(stats.occupancyRate)} occupancy`,
			icon: HomeIcon,
			color: 'text-green-600'
		},
		{
			title: 'Available Units',
			value: stats.available,
			description: 'Ready for tenants',
			icon: Home,
			color: 'text-blue-600'
		},
		{
			title: 'In Maintenance',
			value: stats.maintenance,
			description: 'Under repair',
			icon: Wrench,
			color: 'text-orange-600'
		}
	]

	return (
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

			{/* Additional Revenue Stats */}
			<div className="grid gap-4 md:grid-cols-2">
				<Card className="transition-all hover:shadow-md">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Average Rent
						</CardTitle>
						<i className="i-lucide-dollar-sign inline-block h-4 w-4 text-green-600"  />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatCurrency(stats.averageRent)}
						</div>
						<p className="text-muted-foreground text-xs">
							Per unit monthly
						</p>
					</CardContent>
				</Card>

				<Card className="transition-all hover:shadow-md">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Monthly Revenue
						</CardTitle>
						<i className="i-lucide-dollar-sign inline-block h-4 w-4 text-green-600"  />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatCurrency(stats.totalActualRent)}
						</div>
						<p className="text-muted-foreground text-xs">
							Potential:{' '}
							{formatCurrency(stats.totalPotentialRent)}
						</p>
					</CardContent>
				</Card>
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
