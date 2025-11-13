'use client'

import { Avatar, AvatarFallback } from '#components/ui/avatar'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { usePropertyPerformance } from '#hooks/api/use-dashboard'
import {
	getOccupancyBadgeClass,
	getTrendColorClass
} from '#lib/utils/color-helpers'
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { formatCurrency } from '@repo/shared/utils/currency'


const getTrendIcon = (trend: string) => {
	switch (trend) {
		case 'up':
			return <TrendingUp className="size-3" />
		case 'down':
			return <TrendingDown className="size-3" />
		default:
			return <Minus className="size-3" />
	}
}

const getOccupancyBadge = (rate: number) => {
	const label =
		rate >= 90
			? 'Excellent'
			: rate >= 80
				? 'Good'
				: rate >= 70
					? 'Fair'
					: 'Poor'
	return (
		<Badge variant="outline" className={getOccupancyBadgeClass(rate)}>
			{label}
		</Badge>
	)
}

export function PropertyPerformanceTable() {
	const { data: properties, isLoading, error } = usePropertyPerformance()

	if (isLoading) {
		return (
			<div className="dashboard-empty-state">
				<Spinner className="size-5 animate-spin" />
				<p className="text-sm font-medium text-muted-foreground">
					Loading property performance...
				</p>
			</div>
		)
	}

	if (error) {
		return (
			<div className="dashboard-empty-state">
				<p className="text-sm font-medium text-muted-foreground">
					Failed to load property performance data
				</p>
				<p className="text-xs text-muted-foreground">
					Please refresh to try again.
				</p>
			</div>
		)
	}

	if (!properties || properties.length === 0) {
		return (
			<div className="dashboard-empty-state">
				<p className="text-sm font-medium text-muted-foreground">
					No property data available
				</p>
				<p className="text-xs text-muted-foreground">
					Add properties to see performance insights.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div className="dashboard-table-wrapper">
				<Table className="dashboard-table">
					<TableHeader>
						<TableRow>
							<TableHead>Property</TableHead>
							<TableHead>Units</TableHead>
							<TableHead>Occupancy</TableHead>
							<TableHead>Revenue</TableHead>
							<TableHead>Trend</TableHead>
							<TableHead className="w-12"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{properties.map(property => {
							// Generate avatar initials from property name
							const avatar = property.property
								.split(' ')
								.map(word => word[0])
								.join('')
								.slice(0, 2)
								.toUpperCase()

							return (
								<TableRow key={property.propertyId}>
									<TableCell>
										<div className="flex items-center gap-3">
											<Avatar className="size-11">
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
											<div className="text-sm text-muted-foreground">
												occupied
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="font-medium">
												{property.occupancyRate?.toFixed(1)}%
											</div>
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
										<div
											className={`flex items-center gap-1 text-sm font-medium ${getTrendColorClass(property.trend || 'stable')}`}
										>
											{getTrendIcon(property.trend || 'stable')}
											{property.trendPercentage?.toFixed(1) ?? '0.0'}%
										</div>
									</TableCell>
									<TableCell>
										<Button variant="ghost" size="icon" className="size-11">
											<ArrowUpRight className="size-4" />
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
			<Button variant="outline" className="w-full min-h-11">
				View All Properties
			</Button>
		</div>
	)
}
