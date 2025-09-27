'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowUpRight, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePropertyPerformance } from '@/hooks/api/use-dashboard'

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(amount)
}

const getTrendIcon = (trend: string) => {
	switch (trend) {
		case 'up':
			return <TrendingUp className="h-3 w-3" />
		case 'down':
			return <TrendingDown className="h-3 w-3" />
		default:
			return <Minus className="h-3 w-3" />
	}
}

const getTrendColor = (trend: string) => {
	switch (trend) {
		case 'up':
			return 'text-green-600'
		case 'down':
			return 'text-red-600'
		default:
			return 'text-muted-foreground'
	}
}

const getOccupancyBadge = (rate: number) => {
	if (rate >= 90) {
		return <Badge variant="outline" className="text-green-600 border-green-200">Excellent</Badge>
	} else if (rate >= 80) {
		return <Badge variant="outline" className="text-blue-600 border-blue-200">Good</Badge>
	} else if (rate >= 70) {
		return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Fair</Badge>
	} else {
		return <Badge variant="outline" className="text-red-600 border-red-200">Poor</Badge>
	}
}

export function PropertyPerformanceTable() {
	const { data: properties, isLoading, error } = usePropertyPerformance()

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="ml-2 text-sm text-muted-foreground">Loading property performance...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">Failed to load property performance data</p>
			</div>
		)
	}

	if (!properties || properties.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-sm text-muted-foreground">No property data available</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Property</TableHead>
							<TableHead>Units</TableHead>
							<TableHead>Occupancy</TableHead>
							<TableHead>Revenue</TableHead>
							<TableHead>Trend</TableHead>
							<TableHead className="w-[50px]"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{properties.map((property) => {
							// Generate avatar initials from property name
							const avatar = property.property.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
							// Calculate trend - for now just show as stable since API doesn't provide trend data
							const trend = 'stable'
							const trendPercentage = 0

							return (
								<TableRow key={property.propertyId}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarFallback className="text-xs font-medium">
													{avatar}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium">{property.property}</div>
												<div className="text-sm text-muted-foreground">
													{property.address}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div>
											<div className="font-medium">
												{property.occupiedUnits}/{property.totalUnits}
											</div>
											<div className="text-sm text-muted-foreground">occupied</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium">{property.occupancyRate?.toFixed(1)}%</div>
											{getOccupancyBadge(property.occupancyRate || 0)}
										</div>
									</TableCell>
									<TableCell>
										<div className="font-medium">
											{formatCurrency(property.monthlyRevenue || 0)}
										</div>
										<div className="text-sm text-muted-foreground">monthly</div>
									</TableCell>
									<TableCell>
										<div className={cn(
											"flex items-center gap-1 text-sm font-medium",
											getTrendColor(trend)
										)}>
											{getTrendIcon(trend)}
											{Math.abs(trendPercentage)}%
										</div>
									</TableCell>
									<TableCell>
										<Button variant="ghost" size="icon" className="h-8 w-8">
											<ArrowUpRight className="h-4 w-4" />
											<span className="sr-only">View property details</span>
										</Button>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{/* View All Properties Button */}
			<Button variant="outline" className="w-full">
				View All Properties
			</Button>
		</div>
	)
}