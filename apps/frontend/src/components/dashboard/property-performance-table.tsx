'use client'

import { Avatar, AvatarFallback } from '#components/ui/avatar'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Spinner } from '#components/ui/loading-spinner'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import { ErrorBoundary } from '#components/ui/error-boundary'
import { useOwnerDashboardData } from '#hooks/api/use-owner-dashboard'
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '#lib/formatters/currency'

// Inline helpers using CSS classes from globals.css
const getOccupancyBadgeClass = (rate: number): string => {
	if (rate >= 90) return 'text-[var(--color-success)] border-[var(--color-success)]/20'
	if (rate >= 80) return 'text-[var(--color-info)] border-[var(--color-info)]/20'
	return 'text-[var(--color-warning)] border-[var(--color-warning)]/20'
}

const getTrendColorClass = (trend: 'up' | 'down' | 'stable' | string): string => {
	if (trend === 'up') return 'text-[var(--color-success)]'
	if (trend === 'down') return 'text-[var(--color-warning)]'
	return 'text-muted-foreground'
}

const getTrendIcon = (trend: string) => {
	switch (trend) {
		case 'up':
			return <TrendingUp className="w-[var(--spacing-3)] h-[var(--spacing-3)]" />
		case 'down':
			return <TrendingDown className="w-[var(--spacing-3)] h-[var(--spacing-3)]" />
		default:
			return <Minus className="w-[var(--spacing-3)] h-[var(--spacing-3)]" />
	}
}

const getOccupancyBadge = (rate: number) => {
	const label = rate >= 90 ? 'Excellent' : rate >= 80 ? 'Good' : rate >= 70 ? 'Fair' : 'Poor'
	return (
		<Badge variant="outline" className={getOccupancyBadgeClass(rate)}>
			{label}
		</Badge>
	)
}

export function PropertyPerformanceTable() {
	return (
		<ErrorBoundary
			fallback={
				<div className="dashboard-empty-state">
					<p className="text-sm font-medium text-muted-foreground">
						Unable to load property performance
					</p>
					<p className="text-caption">
						Please refresh to try again.
					</p>
				</div>
			}
		>
			<PropertyPerformanceTableContent />
		</ErrorBoundary>
	)
}

function PropertyPerformanceTableContent() {
	const { data, isLoading, error } = useOwnerDashboardData()
	const properties = data?.propertyPerformance

	if (isLoading) {
		return (
			<div className="dashboard-empty-state">
				<Spinner className="w-[var(--spacing-5)] h-[var(--spacing-5)] animate-spin" />
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
				<p className="text-caption">
					Please refresh to try again.
				</p>
			</div>
		)
	}

	if (!properties || !Array.isArray(properties) || properties.length === 0) {
		return (
			<div className="dashboard-empty-state">
				<p className="text-sm font-medium text-muted-foreground">
					No property data available
				</p>
				<p className="text-caption">
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
							<TableHead className="w-[var(--spacing-12)]"></TableHead>
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
								<TableRow key={property.property_id}>
									<TableCell>
										<div className="flex items-center gap-[var(--spacing-3)]">
								<Avatar className="size-[var(--spacing-11)]">
												<AvatarFallback className="text-xs font-medium">
													{avatar}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium">{property.property}</div>
												<div className="text-muted">
													{property.address_line1}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<div>
											<div className="font-medium">
												{property.occupiedUnits}/{property.totalUnits}
											</div>
											<div className="text-muted">
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
										<div className="text-muted">monthly</div>
									</TableCell>
									<TableCell>
										<div
											className={`flex items-center gap-[var(--spacing-1)] text-sm font-medium ${getTrendColorClass(property.trend || 'stable')}`}
										>
											{getTrendIcon(property.trend || 'stable')}
											{property.trendPercentage?.toFixed(1) ?? '0.0'}%
										</div>
									</TableCell>
									<TableCell>
								<Button variant="ghost" size="icon" className="w-[var(--spacing-11)] h-[var(--spacing-11)]">
											<ArrowUpRight className="w-[var(--spacing-4)] h-[var(--spacing-4)]" />
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
			<Button variant="outline" className="w-full min-h-[var(--spacing-11)]">
				View All Properties
			</Button>
		</div>
	)
}
