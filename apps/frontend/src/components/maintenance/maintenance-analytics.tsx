'use client'

import { useQuery } from '@tanstack/react-query'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { Badge } from '#components/ui/badge'
import { formatCurrency } from '#lib/formatters/currency'
import {
	AlertTriangle,
	CheckCircle,
	Clock,
	DollarSign,
	TrendingDown,
	TrendingUp,
	Wrench
} from 'lucide-react'
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

interface MaintenanceStats {
	total: number
	open: number
	inProgress: number
	completed: number
	completedToday: number
	avgResolutionTime: number
	byPriority: {
		low: number
		medium: number
		high: number
		emergency: number
	}
	totalCost: number
	avgResponseTimeHours: number
}

const COLORS = {
	open: 'var(--color-chart-1)',
	inProgress: 'var(--color-chart-2)',
	completed: 'var(--color-chart-3)',
	low: 'var(--color-chart-4)',
	medium: 'var(--color-chart-5)',
	high: 'var(--color-destructive)',
	emergency: 'var(--color-destructive)'
}

export function MaintenanceAnalytics() {
	const { data: stats, isLoading } = useQuery({
		...maintenanceQueries.stats(),
		select: data => data as MaintenanceStats
	})

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-32" />
					))}
				</div>
				<div className="grid gap-6 md:grid-cols-2">
					<Skeleton className="h-80" />
					<Skeleton className="h-80" />
				</div>
			</div>
		)
	}

	if (!stats) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<Wrench className="size-12 mx-auto mb-4 opacity-50" />
				<p>No maintenance data available</p>
			</div>
		)
	}

	// Prepare chart data
	const statusData = [
		{ name: 'Open', value: stats.open, color: COLORS.open },
		{ name: 'In Progress', value: stats.inProgress, color: COLORS.inProgress },
		{ name: 'Completed', value: stats.completed, color: COLORS.completed }
	]

	const priorityData = [
		{ name: 'Low', value: stats.byPriority.low, color: COLORS.low },
		{ name: 'Medium', value: stats.byPriority.medium, color: COLORS.medium },
		{ name: 'High', value: stats.byPriority.high, color: COLORS.high },
		{
			name: 'Emergency',
			value: stats.byPriority.emergency,
			color: COLORS.emergency
		}
	]

	// Calculate completion rate
	const completionRate =
		stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
	const avgResolutionHours = stats.avgResolutionTime || 0

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* Total Requests */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">
							Total Requests
						</CardTitle>
						<Wrench className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-xs text-muted-foreground mt-1">
							{stats.completedToday} completed today
						</p>
					</CardContent>
				</Card>

				{/* Open Requests */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Open Requests</CardTitle>
						<Clock className="size-4 text-orange-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.open}</div>
						<div className="flex items-center gap-1 mt-1">
							{stats.open > 5 ? (
								<>
									<TrendingUp className="size-3 text-destructive" />
									<span className="text-xs text-destructive">
										Needs attention
									</span>
								</>
							) : (
								<span className="text-xs text-muted-foreground">
									{stats.inProgress} in progress
								</span>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Completion Rate */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">
							Completion Rate
						</CardTitle>
						<CheckCircle className="size-4 text-green-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{completionRate.toFixed(1)}%
						</div>
						<div className="flex items-center gap-1 mt-1">
							{completionRate >= 80 ? (
								<>
									<TrendingUp className="size-3 text-green-500" />
									<span className="text-xs text-green-500">Excellent</span>
								</>
							) : completionRate >= 60 ? (
								<span className="text-xs text-muted-foreground">
									Good progress
								</span>
							) : (
								<>
									<TrendingDown className="size-3 text-orange-500" />
									<span className="text-xs text-orange-500">
										Needs improvement
									</span>
								</>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Total Cost */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium">Total Cost</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{formatCurrency(stats.totalCost)}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							{formatCurrency(
								stats.total > 0 ? stats.totalCost / stats.total : 0
							)}{' '}
							avg per request
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Charts Row */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Status Distribution */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Status Distribution</CardTitle>
						<CardDescription>
							Current status of all maintenance requests
						</CardDescription>
					</CardHeader>
					<CardContent>
						{stats.total === 0 ? (
							<div className="h-64 flex items-center justify-center text-muted-foreground">
								No data to display
							</div>
						) : (
							<ResponsiveContainer width="100%" height={256}>
								<PieChart>
									<Pie
										data={statusData}
										cx="50%"
										cy="50%"
										innerRadius={60}
										outerRadius={80}
										paddingAngle={5}
										dataKey="value"
										label={({ name, percent }) =>
											`${name} ${((percent ?? 0) * 100).toFixed(0)}%`
										}
									>
										{statusData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} />
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--background)',
											border: '1px solid var(--border)',
											borderRadius: '8px'
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>

				{/* Priority Distribution */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Priority Distribution</CardTitle>
						<CardDescription>
							Requests breakdown by priority level
						</CardDescription>
					</CardHeader>
					<CardContent>
						{stats.total === 0 ? (
							<div className="h-64 flex items-center justify-center text-muted-foreground">
								No data to display
							</div>
						) : (
							<ResponsiveContainer width="100%" height={256}>
								<BarChart data={priorityData}>
									<XAxis
										dataKey="name"
										tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
									/>
									<YAxis
										tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
									/>
									<Tooltip
										contentStyle={{
											backgroundColor: 'var(--background)',
											border: '1px solid var(--border)',
											borderRadius: '8px'
										}}
									/>
									<Bar dataKey="value" radius={[4, 4, 0, 0]}>
										{priorityData.map((entry, index) => (
											<Cell key={`cell-${index}`} fill={entry.color} />
										))}
									</Bar>
								</BarChart>
							</ResponsiveContainer>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Performance Metrics */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Performance Metrics</CardTitle>
					<CardDescription>
						Key performance indicators for maintenance operations
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
								<Clock className="size-4" />
								Average Resolution Time
							</div>
							<p className="text-2xl font-bold">
								{avgResolutionHours.toFixed(1)}h
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								{avgResolutionHours < 24
									? 'Within 1 day'
									: avgResolutionHours < 72
										? 'Within 3 days'
										: 'More than 3 days'}
							</p>
						</div>

						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
								<AlertTriangle className="size-4" />
								High Priority Active
							</div>
							<p className="text-2xl font-bold">
								{stats.byPriority.high + stats.byPriority.emergency}
							</p>
							<div className="flex gap-1 mt-2">
								{stats.byPriority.emergency > 0 && (
									<Badge variant="destructive" className="text-xs">
										{stats.byPriority.emergency} Emergency
									</Badge>
								)}
								{stats.byPriority.high > 0 && (
									<Badge className="bg-orange-500/10 text-orange-600 text-xs">
										{stats.byPriority.high} High
									</Badge>
								)}
							</div>
						</div>

						<div className="rounded-lg border bg-muted/30 p-4">
							<div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
								<CheckCircle className="size-4" />
								Completed This Period
							</div>
							<p className="text-2xl font-bold">{stats.completed}</p>
							<p className="text-xs text-muted-foreground mt-1">
								{stats.completedToday} completed today
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
