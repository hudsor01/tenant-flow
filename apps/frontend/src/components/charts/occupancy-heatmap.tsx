'use client'

import { cn } from '@/lib/utils'
import {
	APPLE_DURATIONS,
	APPLE_EASINGS,
	// PROPERTY_ANALYTICS_COLORS,
	APPLE_GRADIENTS,
	APPLE_SYSTEM_COLORS
} from '@repo/shared'
import {
	Building,
	Clock,
	Eye,
	EyeOff,
	Filter,
	Home,
	MapPin,
	Sparkles,
	Target,
	TrendingUp,
	Users
} from 'lucide-react'
import * as React from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'



// =============================================================================
// MOCK DATA - REALISTIC PROPERTY OCCUPANCY
// =============================================================================

const occupancyData = [
	{
		id: 'prop-001',
		name: 'Sunset Gardens',
		type: 'Multi-Family',
		location: 'Downtown',
		totalUnits: 48,
		occupiedUnits: 46,
		occupancyRate: 95.8,
		avgRent: 2100,
		waitlistCount: 12,
		turnoverRate: 8,
		satisfaction: 4.2,
		lastUpdate: '2 hours ago',
		coordinates: { lat: 40.7128, lng: -74.006 }
	},
	{
		id: 'prop-002',
		name: 'Riverside Commons',
		type: 'Apartment Complex',
		location: 'Westside',
		totalUnits: 72,
		occupiedUnits: 68,
		occupancyRate: 94.4,
		avgRent: 1850,
		waitlistCount: 8,
		turnoverRate: 12,
		satisfaction: 4.0,
		lastUpdate: '1 hour ago',
		coordinates: { lat: 40.7589, lng: -73.9851 }
	},
	{
		id: 'prop-003',
		name: 'Oak Hill Residences',
		type: 'Townhouse',
		location: 'Suburbs',
		totalUnits: 24,
		occupiedUnits: 24,
		occupancyRate: 100,
		avgRent: 2450,
		waitlistCount: 18,
		turnoverRate: 5,
		satisfaction: 4.6,
		lastUpdate: '30 mins ago',
		coordinates: { lat: 40.6782, lng: -73.9442 }
	},
	{
		id: 'prop-004',
		name: 'Metro Heights',
		type: 'High-Rise',
		location: 'Financial District',
		totalUnits: 96,
		occupiedUnits: 89,
		occupancyRate: 92.7,
		avgRent: 2800,
		waitlistCount: 15,
		turnoverRate: 15,
		satisfaction: 3.8,
		lastUpdate: '45 mins ago',
		coordinates: { lat: 40.7074, lng: -74.0113 }
	},
	{
		id: 'prop-005',
		name: 'Green Valley Apartments',
		type: 'Garden Style',
		location: 'Northside',
		totalUnits: 36,
		occupiedUnits: 34,
		occupancyRate: 94.4,
		avgRent: 1650,
		waitlistCount: 6,
		turnoverRate: 10,
		satisfaction: 4.3,
		lastUpdate: '1.5 hours ago',
		coordinates: { lat: 40.7831, lng: -73.9712 }
	},
	{
		id: 'prop-006',
		name: 'Harbor View Lofts',
		type: 'Loft',
		location: 'Waterfront',
		totalUnits: 18,
		occupiedUnits: 16,
		occupancyRate: 88.9,
		avgRent: 3200,
		waitlistCount: 4,
		turnoverRate: 18,
		satisfaction: 4.1,
		lastUpdate: '3 hours ago',
		coordinates: { lat: 40.6892, lng: -74.0445 }
	}
]

// =============================================================================
// ANALYTICS CALCULATIONS
// =============================================================================

const calculateOccupancyAnalytics = (data: typeof occupancyData) => {
	const totalUnits = data.reduce((sum, prop) => sum + prop.totalUnits, 0)
	const totalOccupied = data.reduce((sum, prop) => sum + prop.occupiedUnits, 0)
	const avgOccupancyRate = (totalOccupied / totalUnits) * 100

	const totalWaitlist = data.reduce((sum, prop) => sum + prop.waitlistCount, 0)
	const avgTurnover =
		data.reduce((sum, prop) => sum + prop.turnoverRate, 0) / data.length
	const avgSatisfaction =
		data.reduce((sum, prop) => sum + prop.satisfaction, 0) / data.length

	const highPerformers = data.filter(prop => prop.occupancyRate >= 95).length
	const needsAttention = data.filter(prop => prop.occupancyRate < 90).length

	const revenueProjection = data.reduce(
		(sum, prop) => sum + prop.occupiedUnits * prop.avgRent,
		0
	)

	const occupancyDistribution = {
		excellent: data.filter(prop => prop.occupancyRate >= 98).length,
		good: data.filter(
			prop => prop.occupancyRate >= 95 && prop.occupancyRate < 98
		).length,
		fair: data.filter(
			prop => prop.occupancyRate >= 90 && prop.occupancyRate < 95
		).length,
		poor: data.filter(prop => prop.occupancyRate < 90).length
	}

	return {
		totalUnits,
		totalOccupied,
		avgOccupancyRate,
		totalWaitlist,
		avgTurnover,
		avgSatisfaction,
		highPerformers,
		needsAttention,
		revenueProjection,
		occupancyDistribution
	}
}

// =============================================================================
// PROPERTY CARD COMPONENT
// =============================================================================

const PropertyCard = ({
	property,
	isExpanded,
	onToggle,
	analytics: _analytics
}: {
	property: (typeof occupancyData)[0]
	isExpanded: boolean
	onToggle: () => void
	analytics: ReturnType<typeof calculateOccupancyAnalytics>
}) => {
	const getOccupancyColor = (rate: number) => {
		if (rate >= 98) return APPLE_SYSTEM_COLORS.systemGreen
		if (rate >= 95) return APPLE_SYSTEM_COLORS.systemBlue
		if (rate >= 90) return APPLE_SYSTEM_COLORS.systemOrange
		return APPLE_SYSTEM_COLORS.systemRed
	}

	const getPerformanceBadge = (rate: number) => {
		if (rate >= 98) return { label: 'Excellent', color: 'systemGreen' }
		if (rate >= 95) return { label: 'Good', color: 'systemBlue' }
		if (rate >= 90) return { label: 'Fair', color: 'systemOrange' }
		return { label: 'Needs Attention', color: 'systemRed' }
	}

	const performance = getPerformanceBadge(property.occupancyRate)
	const occupancyColor = getOccupancyColor(property.occupancyRate)

	return (
		<div
			className={cn(
				'relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group',
				isExpanded
					? 'border-primary/30 shadow-lg bg-primary/5'
					: 'border-border/50 hover:border-primary/20 hover:shadow-md'
			)}
			onClick={onToggle}
			style={{
				transition: `all ${APPLE_DURATIONS['duration-medium']} ${APPLE_EASINGS['ease-out-expo']}`,
				transform: isExpanded ? 'translateY(-2px)' : 'translateY(0)'
			}}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex-1">
					<div className="flex items-center gap-2 mb-1">
						<h3 className="font-semibold text-sm truncate">{property.name}</h3>
						<Badge
							variant="outline"
							className="text-xs px-1.5 py-0.5"
							style={{
								color:
									APPLE_SYSTEM_COLORS[
										performance.color as keyof typeof APPLE_SYSTEM_COLORS
									],
								borderColor:
									APPLE_SYSTEM_COLORS[
										performance.color as keyof typeof APPLE_SYSTEM_COLORS
									] + '40'
							}}
						>
							{performance.label}
						</Badge>
					</div>
					<div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
						<MapPin className="w-3 h-3" />
						<span>{property.location}</span>
						<span>•</span>
						<span>{property.type}</span>
					</div>
				</div>

				<div className="text-right">
					<div
						className="text-lg font-bold mb-1"
						style={{ color: occupancyColor }}
					>
						{property.occupancyRate.toFixed(1)}%
					</div>
					<div className="text-xs text-muted-foreground">
						{property.occupiedUnits}/{property.totalUnits} units
					</div>
				</div>
			</div>

			{/* Progress bar */}
			<div className="mb-3">
				<Progress
					value={property.occupancyRate}
					className="h-2"
					style={{
						backgroundColor: `${occupancyColor}20`
					}}
				/>
			</div>

			{/* Quick stats */}
			<div className="grid grid-cols-3 gap-2 text-xs">
				<div className="text-center">
					<div className="font-medium">${property.avgRent}</div>
					<div className="text-muted-foreground">Avg Rent</div>
				</div>
				<div className="text-center">
					<div className="font-medium">{property.waitlistCount}</div>
					<div className="text-muted-foreground">Waitlist</div>
				</div>
				<div className="text-center">
					<div className="font-medium">{property.satisfaction}/5</div>
					<div className="text-muted-foreground">Rating</div>
				</div>
			</div>

			{/* Expanded details */}
			{isExpanded && (
				<div
					className="mt-4 pt-4 border-t space-y-3"
					style={{
						animation: `slideInFromTop 300ms ${APPLE_EASINGS['ease-out-expo']}`
					}}
				>
					{/* Revenue projection */}
					<div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
						<span className="text-xs font-medium">Monthly Revenue</span>
						<span className="text-sm font-bold text-primary">
							${(property.occupiedUnits * property.avgRent).toLocaleString()}
						</span>
					</div>

					{/* Key metrics */}
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Turnover Rate</span>
							<span
								className={cn(
									'font-medium',
									property.turnoverRate > 15
										? 'text-destructive'
										: property.turnoverRate > 10
											? 'text-accent'
											: 'text-primary'
								)}
							>
								{property.turnoverRate}%
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Last Updated</span>
							<span className="font-medium">{property.lastUpdate}</span>
						</div>
					</div>

					{/* Action hints */}
					<div className="flex items-center justify-between pt-2">
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Sparkles className="w-3 h-3" />
							<span>Click metrics for insights</span>
						</div>
						{property.occupancyRate < 95 && (
							<Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
								<Target className="w-3 h-3 mr-1" />
								Optimize
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function OccupancyHeatmap() {
	const [viewMode, setViewMode] = React.useState<'grid' | 'chart'>('grid')
	const [showInsights, setShowInsights] = React.useState(false)
	const [expandedProperty, setExpandedProperty] = React.useState<string | null>(
		null
	)
	const [sortBy, setSortBy] = React.useState<
		'occupancy' | 'revenue' | 'satisfaction'
	>('occupancy')

	const analytics = React.useMemo(
		() => calculateOccupancyAnalytics(occupancyData),
		[]
	)

	const sortedProperties = React.useMemo(() => {
		return [...occupancyData].sort((a, b) => {
			switch (sortBy) {
				case 'occupancy':
					return b.occupancyRate - a.occupancyRate
				case 'revenue':
					return b.occupiedUnits * b.avgRent - a.occupiedUnits * a.avgRent
				case 'satisfaction':
					return b.satisfaction - a.satisfaction
				default:
					return 0
			}
		})
	}, [sortBy])

	const distributionData = [
		{
			name: 'Excellent (98%+)',
			value: analytics.occupancyDistribution.excellent,
			color: APPLE_SYSTEM_COLORS.systemGreen
		},
		{
			name: 'Good (95-98%)',
			value: analytics.occupancyDistribution.good,
			color: APPLE_SYSTEM_COLORS.systemBlue
		},
		{
			name: 'Fair (90-95%)',
			value: analytics.occupancyDistribution.fair,
			color: APPLE_SYSTEM_COLORS.systemOrange
		},
		{
			name: 'Needs Attention (<90%)',
			value: analytics.occupancyDistribution.poor,
			color: APPLE_SYSTEM_COLORS.systemRed
		}
	].filter(item => item.value > 0)

	return (
		<Card
			className={cn(
				'shadow-xl hover:shadow-2xl border-2 border-primary/10',
				'bg-gradient-to-br from-background via-muted/5 to-background',
				'transition-all duration-300 ease-out'
			)}
		>
			<CardHeader>
				<div className="flex flex-col space-y-4">
					{/* Header with controls */}
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<div
								className="p-3 rounded-xl transition-all duration-200"
								style={{
									background: APPLE_GRADIENTS.occupancy,
									transition: `all ${APPLE_DURATIONS['duration-fast']} ${APPLE_EASINGS['ease-out-expo']}`
								}}
							>
								<Building
									className="w-6 h-6"
									style={{ color: APPLE_SYSTEM_COLORS.systemGreen }}
								/>
							</div>

							<div className="space-y-1">
								<CardTitle className="text-2xl font-bold tracking-tight">
									Occupancy Overview
								</CardTitle>
								<CardDescription className="text-base">
									{analytics.avgOccupancyRate.toFixed(1)}% avg •{' '}
									{analytics.totalOccupied}/{analytics.totalUnits} units
									occupied
								</CardDescription>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowInsights(!showInsights)}
								className={cn(
									'h-8 w-8 p-0 transition-all duration-200',
									showInsights && 'bg-primary/10 text-primary'
								)}
							>
								{showInsights ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</Button>

							<div className="flex bg-muted rounded-lg p-1">
								<Button
									variant={viewMode === 'grid' ? 'default' : 'ghost'}
									size="sm"
									onClick={() => setViewMode('grid')}
									className="h-7 px-3 text-xs"
								>
									<Home className="w-3 h-3 mr-1" />
									Grid
								</Button>
								<Button
									variant={viewMode === 'chart' ? 'default' : 'ghost'}
									size="sm"
									onClick={() => setViewMode('chart')}
									className="h-7 px-3 text-xs"
								>
									<Users className="w-3 h-3 mr-1" />
									Chart
								</Button>
							</div>
						</div>
					</div>

					{/* Insights panel */}
					{showInsights && (
						<div
							className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl transition-all duration-300"
							style={{
								background: APPLE_GRADIENTS.glass,
								border: `1px solid ${APPLE_SYSTEM_COLORS.systemGreen}20`,
								animation: `slideInFromTop 300ms ${APPLE_EASINGS['ease-out-expo']}`
							}}
						>
							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemGreen}20`
										}}
									>
										<TrendingUp
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemGreen }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemGreen }}
								>
									{analytics.highPerformers}
								</p>
								<p className="text-xs text-muted-foreground">High Performers</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemBlue}20`
										}}
									>
										<Users
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemBlue }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemBlue }}
								>
									{analytics.totalWaitlist}
								</p>
								<p className="text-xs text-muted-foreground">Total Waitlist</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemPurple}20`
										}}
									>
										<Target
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemPurple }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemPurple }}
								>
									{analytics.avgSatisfaction.toFixed(1)}
								</p>
								<p className="text-xs text-muted-foreground">
									Avg Satisfaction
								</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemOrange}20`
										}}
									>
										<Clock
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemOrange }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemOrange }}
								>
									{analytics.avgTurnover.toFixed(1)}%
								</p>
								<p className="text-xs text-muted-foreground">Avg Turnover</p>
							</div>
						</div>
					)}

					{/* Sort controls */}
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-2">
							<Filter className="w-4 h-4 text-muted-foreground" />
							<span className="text-sm font-medium">Sort by:</span>
						</div>
						<div className="flex gap-1">
							{(['occupancy', 'revenue', 'satisfaction'] as const).map(sort => (
								<Button
									key={sort}
									variant={sortBy === sort ? 'default' : 'ghost'}
									size="sm"
									onClick={() => setSortBy(sort)}
									className="h-7 px-3 text-xs capitalize"
								>
									{sort}
								</Button>
							))}
						</div>
					</div>
				</div>
			</CardHeader>

			<CardContent className="px-6 pt-6">
				{viewMode === 'grid' ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{sortedProperties.map(property => (
							<PropertyCard
								key={property.id}
								property={property}
								isExpanded={expandedProperty === property.id}
								onToggle={() =>
									setExpandedProperty(
										expandedProperty === property.id ? null : property.id
									)
								}
								analytics={analytics}
							/>
						))}
					</div>
				) : (
					<div className="space-y-6">
						{/* Distribution pie chart */}
						<div className="flex items-center gap-8">
							<div className="h-[200px] w-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={distributionData}
											cx="50%"
											cy="50%"
											innerRadius={40}
											outerRadius={80}
											paddingAngle={5}
											dataKey="value"
										>
											{distributionData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip
											formatter={(value: number | string, name: string) => [
												`${value} properties`,
												name
											]}
										/>
									</PieChart>
								</ResponsiveContainer>
							</div>

							<div className="flex-1 space-y-2">
								{distributionData.map((item, index) => (
									<div key={index} className="flex items-center gap-3">
										<div
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: item.color }}
										/>
										<span className="text-sm flex-1">{item.name}</span>
										<span className="font-medium">{item.value}</span>
									</div>
								))}
							</div>
						</div>

						{/* Property performance bar chart */}
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={sortedProperties}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={APPLE_SYSTEM_COLORS.systemGray + '30'}
									/>
									<XAxis
										dataKey="name"
										tick={{
											fontSize: 10,
											fill: APPLE_SYSTEM_COLORS.systemGray
										}}
										angle={-45}
										textAnchor="end"
										height={80}
									/>
									<YAxis
										tick={{
											fontSize: 12,
											fill: APPLE_SYSTEM_COLORS.systemGray
										}}
										domain={[80, 100]}
									/>
									<Tooltip
										formatter={(value: number | string, _name: string) => [
											`${typeof value === 'number' ? value.toFixed(1) : value}%`,
											'Occupancy Rate'
										]}
										labelFormatter={(label: string | number) =>
											`Property: ${label}`
										}
									/>
									<Bar
										dataKey="occupancyRate"
										fill={APPLE_SYSTEM_COLORS.systemBlue}
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
