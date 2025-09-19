'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
	APPLE_DURATIONS,
	APPLE_EASINGS,
	// PROPERTY_ANALYTICS_COLORS,
	APPLE_GRADIENTS,
	APPLE_SYSTEM_COLORS
} from '@repo/shared'
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	Eye,
	EyeOff,
	Filter,
	// Timer,
	Star,
	Target,
	User,
	Wrench,
	// MapPin,
	// TrendingUp,
	// TrendingDown,
	Zap
} from 'lucide-react'
import * as React from 'react'
import {
	Area,
	// RadialBarChart,
	// RadialBar,
	AreaChart,
	Bar,
	CartesianGrid,
	Cell,
	ComposedChart,
	Line,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'




// =============================================================================
// MOCK DATA - REALISTIC MAINTENANCE ANALYTICS
// =============================================================================

const maintenanceData = [
	{
		id: 'req-001',
		title: 'Kitchen Faucet Leak',
		category: 'Plumbing',
		priority: 'High',
		status: 'In Progress',
		property: 'Sunset Gardens',
		unit: 'A-204',
		tenant: 'Sarah Johnson',
		created: '2024-01-15',
		updated: '2024-01-16',
		assignee: 'Mike Chen',
		estimatedCost: 150,
		actualCost: 180,
		satisfaction: 4,
		responseTime: 2, // hours
		completionTime: 8, // hours
		urgency: 8
	},
	{
		id: 'req-002',
		title: 'HVAC Not Heating',
		category: 'HVAC',
		priority: 'Urgent',
		status: 'Completed',
		property: 'Metro Heights',
		unit: 'B-1205',
		tenant: 'Robert Davis',
		created: '2024-01-12',
		updated: '2024-01-14',
		assignee: 'Lisa Wong',
		estimatedCost: 300,
		actualCost: 275,
		satisfaction: 5,
		responseTime: 0.5,
		completionTime: 24,
		urgency: 10
	},
	{
		id: 'req-003',
		title: 'Dishwasher Replacement',
		category: 'Appliances',
		priority: 'Medium',
		status: 'Scheduled',
		property: 'Oak Hill Residences',
		unit: 'C-08',
		tenant: 'Emma Wilson',
		created: '2024-01-18',
		updated: '2024-01-18',
		assignee: 'John Martinez',
		estimatedCost: 800,
		actualCost: null,
		satisfaction: null,
		responseTime: 4,
		completionTime: null,
		urgency: 5
	},
	{
		id: 'req-004',
		title: 'Light Fixture Flickering',
		category: 'Electrical',
		priority: 'Low',
		status: 'Completed',
		property: 'Green Valley Apartments',
		unit: 'D-302',
		tenant: 'Michael Brown',
		created: '2024-01-10',
		updated: '2024-01-11',
		assignee: 'Mike Chen',
		estimatedCost: 75,
		actualCost: 85,
		satisfaction: 4,
		responseTime: 6,
		completionTime: 12,
		urgency: 3
	},
	{
		id: 'req-005',
		title: 'Garbage Disposal Jam',
		category: 'Plumbing',
		priority: 'Medium',
		status: 'Pending',
		property: 'Riverside Commons',
		unit: 'E-105',
		tenant: 'Jennifer Taylor',
		created: '2024-01-20',
		updated: '2024-01-20',
		assignee: null,
		estimatedCost: 120,
		actualCost: null,
		satisfaction: null,
		responseTime: null,
		completionTime: null,
		urgency: 6
	}
]

const maintenanceTrends = [
	{
		month: 'Jul',
		requests: 28,
		completed: 25,
		avgTime: 18,
		cost: 4200,
		satisfaction: 4.2
	},
	{
		month: 'Aug',
		requests: 32,
		completed: 30,
		avgTime: 16,
		cost: 5100,
		satisfaction: 4.0
	},
	{
		month: 'Sep',
		requests: 24,
		completed: 24,
		avgTime: 14,
		cost: 3800,
		satisfaction: 4.4
	},
	{
		month: 'Oct',
		requests: 36,
		completed: 32,
		avgTime: 20,
		cost: 6200,
		satisfaction: 3.9
	},
	{
		month: 'Nov',
		requests: 29,
		completed: 28,
		avgTime: 15,
		cost: 4600,
		satisfaction: 4.3
	},
	{
		month: 'Dec',
		requests: 22,
		completed: 22,
		avgTime: 12,
		cost: 3200,
		satisfaction: 4.6
	}
]

// =============================================================================
// ANALYTICS CALCULATIONS
// =============================================================================

const calculateMaintenanceAnalytics = (data: typeof maintenanceData) => {
	const totalRequests = data.length
	const completedRequests = data.filter(
		req => req.status === 'Completed'
	).length
	const completionRate = (completedRequests / totalRequests) * 100

	const avgResponseTime =
		data.reduce((sum, req) => sum + (req.responseTime || 0), 0) /
		data.filter(req => req.responseTime).length

	const avgCompletionTime =
		data.reduce((sum, req) => sum + (req.completionTime || 0), 0) /
		data.filter(req => req.completionTime).length

	const avgSatisfaction =
		data.reduce((sum, req) => sum + (req.satisfaction || 0), 0) /
		data.filter(req => req.satisfaction).length

	const totalCost = data.reduce(
		(sum, req) => sum + (req.actualCost || req.estimatedCost || 0),
		0
	)

	const categoryBreakdown = data.reduce(
		(acc, req) => {
			acc[req.category] = (acc[req.category] || 0) + 1
			return acc
		},
		{} as Record<string, number>
	)

	const priorityBreakdown = data.reduce(
		(acc, req) => {
			acc[req.priority] = (acc[req.priority] || 0) + 1
			return acc
		},
		{} as Record<string, number>
	)

	const statusBreakdown = data.reduce(
		(acc, req) => {
			acc[req.status] = (acc[req.status] || 0) + 1
			return acc
		},
		{} as Record<string, number>
	)

	const avgUrgency =
		data.reduce((sum, req) => sum + req.urgency, 0) / data.length

	const topProperties = Object.entries(
		data.reduce(
			(acc, req) => {
				acc[req.property] = (acc[req.property] || 0) + 1
				return acc
			},
			{} as Record<string, number>
		)
	)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3)

	return {
		totalRequests,
		completedRequests,
		completionRate,
		avgResponseTime,
		avgCompletionTime,
		avgSatisfaction,
		totalCost,
		categoryBreakdown,
		priorityBreakdown,
		statusBreakdown,
		avgUrgency,
		topProperties
	}
}

// =============================================================================
// REQUEST DETAIL CARD
// =============================================================================

const RequestDetailCard = ({
	request,
	isExpanded,
	onToggle
}: {
	request: (typeof maintenanceData)[0]
	isExpanded: boolean
	onToggle: () => void
}) => {
	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'Urgent':
				return 'hsl(var(--accent))'
			case 'High':
				return 'hsl(var(--accent)/0.8)'
			case 'Medium':
				return 'hsl(var(--accent)/0.6)'
			case 'Low':
				return 'hsl(var(--primary))'
			default:
				return 'hsl(var(--muted-foreground))'
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'Completed':
				return 'hsl(var(--primary))'
			case 'In Progress':
				return 'hsl(var(--primary)/0.8)'
			case 'Scheduled':
				return 'hsl(var(--primary)/0.6)'
			case 'Pending':
				return 'hsl(var(--accent))'
			default:
				return 'hsl(var(--muted-foreground))'
		}
	}

	const getCategoryIcon = (category: string) => {
		switch (category) {
			case 'Plumbing':
				return Wrench
			case 'HVAC':
				return Zap
			case 'Electrical':
				return Zap
			case 'Appliances':
				return Target
			default:
				return Wrench
		}
	}

	const CategoryIcon = getCategoryIcon(request.category)
	const priorityColor = getPriorityColor(request.priority)
	const statusColor = getStatusColor(request.status)

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
					<div className="flex items-center gap-2 mb-2">
						<div
							className="w-8 h-8 rounded-lg flex items-center justify-center"
							style={{ backgroundColor: `${priorityColor}20` }}
						>
							<CategoryIcon
								className="w-4 h-4"
								style={{ color: priorityColor }}
							/>
						</div>
						<div>
							<h3 className="font-semibold text-sm">{request.title}</h3>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span>{request.property}</span>
								<span>•</span>
								<span>{request.unit}</span>
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-col items-end gap-1">
					<Badge
						variant="outline"
						className="text-xs px-2 py-0.5"
						style={{
							color: statusColor,
							borderColor: statusColor + '40'
						}}
					>
						{request.status}
					</Badge>
					<Badge
						variant="outline"
						className="text-xs px-2 py-0.5"
						style={{
							color: priorityColor,
							borderColor: priorityColor + '40'
						}}
					>
						{request.priority}
					</Badge>
				</div>
			</div>

			{/* Progress indicator */}
			<div className="mb-3">
				<Progress
					value={request.urgency * 10}
					className="h-1.5"
					style={{
						backgroundColor: `${priorityColor}20`
					}}
				/>
				<div className="flex justify-between text-xs text-muted-foreground mt-1">
					<span>Urgency: {request.urgency}/10</span>
					{request.responseTime && (
						<span>{request.responseTime}h response</span>
					)}
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
					{/* Tenant & assignee info */}
					<div className="grid grid-cols-2 gap-4 text-xs">
						<div className="flex items-center gap-2">
							<User className="w-3 h-3 text-muted-foreground" />
							<span className="text-muted-foreground">Tenant:</span>
							<span className="font-medium">{request.tenant}</span>
						</div>
						{request.assignee && (
							<div className="flex items-center gap-2">
								<Wrench className="w-3 h-3 text-muted-foreground" />
								<span className="text-muted-foreground">Assigned:</span>
								<span className="font-medium">{request.assignee}</span>
							</div>
						)}
					</div>

					{/* Cost information */}
					<div className="grid grid-cols-2 gap-4 text-xs">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Est. Cost:</span>
							<span className="font-medium">${request.estimatedCost}</span>
						</div>
						{request.actualCost && (
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Actual Cost:</span>
								<span
									className={cn(
										'font-medium',
										request.actualCost > request.estimatedCost
											? 'text-destructive'
											: 'text-primary'
									)}
								>
									${request.actualCost}
								</span>
							</div>
						)}
					</div>

					{/* Timeline */}
					<div className="flex items-center justify-between text-xs">
						<div className="flex items-center gap-1">
							<Calendar className="w-3 h-3 text-muted-foreground" />
							<span className="text-muted-foreground">Created:</span>
							<span>{new Date(request.created).toLocaleDateString()}</span>
						</div>
						{request.satisfaction && (
							<div className="flex items-center gap-1">
								<Star className="w-3 h-3 text-accent" />
								<span>{request.satisfaction}/5</span>
							</div>
						)}
					</div>

					{/* Performance metrics */}
					{request.status === 'Completed' && (
						<div className="grid grid-cols-2 gap-2 p-2 bg-background/50 rounded-lg">
							<div className="text-center">
								<div className="text-sm font-bold text-primary">
									{request.completionTime}h
								</div>
								<div className="text-xs text-muted-foreground">Completion</div>
							</div>
							<div className="text-center">
								<div className="text-sm font-bold text-primary">
									{request.satisfaction}/5
								</div>
								<div className="text-xs text-muted-foreground">Rating</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

const CustomTooltip = ({
	active,
	payload,
	label
}: {
	active?: boolean
	payload?: Array<{ value: number; name: string; color: string }>
	label?: string
}) => {
	if (!active || !payload || !payload.length) return null

	return (
		<div className="bg-background/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl rounded-xl p-4">
			<p className="font-semibold text-foreground mb-2">{label}</p>
			{payload.map(
				(
					entry: { value: number; name: string; color: string },
					index: number
				) => (
					<div key={index} className="flex items-center gap-2 text-sm">
						<div
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: entry.color }}
						/>
						<span className="text-muted-foreground">{entry.name}:</span>
						<span className="font-medium">{entry.value}</span>
					</div>
				)
			)}
		</div>
	)
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MaintenanceAnalytics() {
	const [viewMode, setViewMode] = React.useState<
		'overview' | 'requests' | 'trends'
	>('overview')
	const [showInsights, setShowInsights] = React.useState(false)
	const [expandedRequest, setExpandedRequest] = React.useState<string | null>(
		null
	)
	const [filterCategory, setFilterCategory] = React.useState<string>('all')
	const [filterStatus, setFilterStatus] = React.useState<string>('all')

	const analytics = React.useMemo(
		() => calculateMaintenanceAnalytics(maintenanceData),
		[]
	)

	const filteredRequests = React.useMemo(() => {
		return maintenanceData.filter(request => {
			const categoryMatch =
				filterCategory === 'all' || request.category === filterCategory
			const statusMatch =
				filterStatus === 'all' || request.status === filterStatus
			return categoryMatch && statusMatch
		})
	}, [filterCategory, filterStatus])

	const categoryData = Object.entries(analytics.categoryBreakdown).map(
		([name, value]) => ({
			name,
			value,
			color:
				{
					Plumbing: 'hsl(var(--primary))',
					HVAC: 'hsl(var(--primary)/0.8)',
					Electrical: 'hsl(var(--primary)/0.6)',
					Appliances: 'hsl(var(--accent))'
				}[name] || 'hsl(var(--muted-foreground))'
		})
	)

	const statusData = Object.entries(analytics.statusBreakdown).map(
		([name, value]) => ({
			name,
			value,
			color:
				{
					Completed: 'hsl(var(--primary))',
					'In Progress': 'hsl(var(--primary)/0.8)',
					Scheduled: 'hsl(var(--primary)/0.6)',
					Pending: 'hsl(var(--accent))'
				}[name] || 'hsl(var(--muted-foreground))'
		})
	)

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
									background: APPLE_GRADIENTS.maintenance,
									transition: `all ${APPLE_DURATIONS['duration-fast']} ${APPLE_EASINGS['ease-out-expo']}`
								}}
							>
								<Wrench className="w-6 h-6 text-accent" />
							</div>

							<div className="space-y-1">
								<CardTitle className="text-2xl font-bold tracking-tight">
									Maintenance Analytics
								</CardTitle>
								<CardDescription className="text-base">
									{analytics.completionRate.toFixed(1)}% completion rate •{' '}
									{analytics.avgResponseTime.toFixed(1)}h avg response
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
								{(['overview', 'requests', 'trends'] as const).map(mode => (
									<Button
										key={mode}
										variant={viewMode === mode ? 'default' : 'ghost'}
										size="sm"
										onClick={() => setViewMode(mode)}
										className="h-7 px-3 text-xs capitalize"
									>
										{mode}
									</Button>
								))}
							</div>
						</div>
					</div>

					{/* Insights panel */}
					{showInsights && (
						<div
							className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl transition-all duration-300"
							style={{
								background: APPLE_GRADIENTS.glass,
								border: `1px solid ${APPLE_SYSTEM_COLORS.systemOrange}20`,
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
										<CheckCircle
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemGreen }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemGreen }}
								>
									{analytics.completionRate.toFixed(0)}%
								</p>
								<p className="text-xs text-muted-foreground">Completion Rate</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemBlue}20`
										}}
									>
										<Clock
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemBlue }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemBlue }}
								>
									{analytics.avgResponseTime.toFixed(1)}h
								</p>
								<p className="text-xs text-muted-foreground">Avg Response</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemPurple}20`
										}}
									>
										<Star
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
								<p className="text-xs text-muted-foreground">Satisfaction</p>
							</div>

							<div className="text-center">
								<div className="flex items-center justify-center mb-2">
									<div
										className="w-8 h-8 rounded-lg flex items-center justify-center"
										style={{
											backgroundColor: `${APPLE_SYSTEM_COLORS.systemRed}20`
										}}
									>
										<AlertTriangle
											className="w-4 h-4"
											style={{ color: APPLE_SYSTEM_COLORS.systemRed }}
										/>
									</div>
								</div>
								<p
									className="text-lg font-bold"
									style={{ color: APPLE_SYSTEM_COLORS.systemRed }}
								>
									${analytics.totalCost}
								</p>
								<p className="text-xs text-muted-foreground">Total Cost</p>
							</div>
						</div>
					)}

					{/* Filters for requests view */}
					{viewMode === 'requests' && (
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Filter className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm font-medium">Filters:</span>
							</div>

							<Select value={filterCategory} onValueChange={setFilterCategory}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Categories</SelectItem>
									<SelectItem value="Plumbing">Plumbing</SelectItem>
									<SelectItem value="HVAC">HVAC</SelectItem>
									<SelectItem value="Electrical">Electrical</SelectItem>
									<SelectItem value="Appliances">Appliances</SelectItem>
								</SelectContent>
							</Select>

							<Select value={filterStatus} onValueChange={setFilterStatus}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Status</SelectItem>
									<SelectItem value="Pending">Pending</SelectItem>
									<SelectItem value="Scheduled">Scheduled</SelectItem>
									<SelectItem value="In Progress">In Progress</SelectItem>
									<SelectItem value="Completed">Completed</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent className="px-6 pt-6">
				{viewMode === 'overview' && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Category breakdown */}
						<div className="space-y-4">
							<h3 className="font-semibold">Request Categories</h3>
							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={categoryData}
											cx="50%"
											cy="50%"
											innerRadius={40}
											outerRadius={80}
											paddingAngle={5}
											dataKey="value"
										>
											{categoryData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip content={<CustomTooltip />} />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Status breakdown */}
						<div className="space-y-4">
							<h3 className="font-semibold">Request Status</h3>
							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={statusData}
											cx="50%"
											cy="50%"
											innerRadius={40}
											outerRadius={80}
											paddingAngle={5}
											dataKey="value"
										>
											{statusData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip content={<CustomTooltip />} />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				)}

				{viewMode === 'requests' && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						{filteredRequests.map(request => (
							<RequestDetailCard
								key={request.id}
								request={request}
								isExpanded={expandedRequest === request.id}
								onToggle={() =>
									setExpandedRequest(
										expandedRequest === request.id ? null : request.id
									)
								}
							/>
						))}
					</div>
				)}

				{viewMode === 'trends' && (
					<div className="space-y-6">
						{/* Requests over time */}
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={maintenanceTrends}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={APPLE_SYSTEM_COLORS.systemGray + '30'}
									/>
									<XAxis
										dataKey="month"
										tick={{
											fontSize: 12,
											fill: APPLE_SYSTEM_COLORS.systemGray
										}}
									/>
									<YAxis
										yAxisId="left"
										tick={{
											fontSize: 12,
											fill: APPLE_SYSTEM_COLORS.systemGray
										}}
									/>
									<YAxis
										yAxisId="right"
										orientation="right"
										tick={{
											fontSize: 12,
											fill: APPLE_SYSTEM_COLORS.systemGray
										}}
									/>
									<Tooltip content={<CustomTooltip />} />
									<Bar
										yAxisId="left"
										dataKey="requests"
										fill={APPLE_SYSTEM_COLORS.systemBlue}
										name="Total Requests"
										radius={[2, 2, 0, 0]}
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="avgTime"
										stroke={APPLE_SYSTEM_COLORS.systemOrange}
										strokeWidth={3}
										name="Avg Time (hours)"
										dot={{ fill: APPLE_SYSTEM_COLORS.systemOrange, r: 4 }}
									/>
								</ComposedChart>
							</ResponsiveContainer>
						</div>

						{/* Cost and satisfaction trends */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={maintenanceTrends}>
										<defs>
											<linearGradient
												id="costGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor={APPLE_SYSTEM_COLORS.systemGreen}
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor={APPLE_SYSTEM_COLORS.systemGreen}
													stopOpacity={0.1}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke={APPLE_SYSTEM_COLORS.systemGray + '30'}
										/>
										<XAxis
											dataKey="month"
											tick={{
												fontSize: 12,
												fill: APPLE_SYSTEM_COLORS.systemGray
											}}
										/>
										<YAxis
											tick={{
												fontSize: 12,
												fill: APPLE_SYSTEM_COLORS.systemGray
											}}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Area
											dataKey="cost"
											stroke={APPLE_SYSTEM_COLORS.systemGreen}
											fill="url(#costGradient)"
											name="Cost ($)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>

							<div className="h-[200px]">
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={maintenanceTrends}>
										<defs>
											<linearGradient
												id="satisfactionGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="5%"
													stopColor={APPLE_SYSTEM_COLORS.systemPurple}
													stopOpacity={0.8}
												/>
												<stop
													offset="95%"
													stopColor={APPLE_SYSTEM_COLORS.systemPurple}
													stopOpacity={0.1}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke={APPLE_SYSTEM_COLORS.systemGray + '30'}
										/>
										<XAxis
											dataKey="month"
											tick={{
												fontSize: 12,
												fill: APPLE_SYSTEM_COLORS.systemGray
											}}
										/>
										<YAxis
											domain={[3, 5]}
											tick={{
												fontSize: 12,
												fill: APPLE_SYSTEM_COLORS.systemGray
											}}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Area
											dataKey="satisfaction"
											stroke={APPLE_SYSTEM_COLORS.systemPurple}
											fill="url(#satisfactionGradient)"
											name="Satisfaction"
										/>
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
