'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
	BarChart3,
	Building,
	Calendar,
	DollarSign,
	Download,
	Filter,
	RefreshCw,
	TrendingDown,
	TrendingUp,
	Users
} from 'lucide-react'
import { useDashboardStats, usePropertyPerformance } from '@/hooks/api/use-dashboard'

export default function AnalyticsPage() {
	// Fetch real dashboard data from API
	const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useDashboardStats()
	const { data: propertyData, isLoading: isPropertyLoading, error: propertyError } = usePropertyPerformance()

	// Format currency values
	const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`
	
	// Format percentage with sign
	const formatPercentage = (value: number, includeSign = true) => {
		const formatted = `${Math.abs(value).toFixed(1)}%`
		if (!includeSign) return formatted
		return value >= 0 ? `+${formatted}` : `-${formatted}`
	}

	// Calculate Net Operating Income (Revenue - Expenses) and profit margin
	const calculateNetOperatingIncome = () => {
		const monthlyRevenue = dashboardData?.revenue?.monthly || 0
		// For demo purposes, estimate expenses as 25% of revenue (typical property management)
		const estimatedExpenses = monthlyRevenue * 0.25
		const netIncome = monthlyRevenue - estimatedExpenses
		const profitMargin = monthlyRevenue > 0 ? (netIncome / monthlyRevenue) * 100 : 0
		return { netIncome, profitMargin }
	}

	// Loading state
	if (isDashboardLoading || isPropertyLoading) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
				<div className="text-center text-muted-foreground">Loading analytics...</div>
			</div>
		)
	}

	// Error state
	if (dashboardError || propertyError) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
				<div className="text-center text-destructive">Failed to load analytics data</div>
			</div>
		)
	}
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gradient-dominance">
						Analytics & Insights
					</h1>
					<p className="text-muted-foreground mt-1">
						Comprehensive performance metrics and business intelligence
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" size="sm">
						<Filter className="size-4 mr-2" />
						Filter
					</Button>
					<Button variant="outline" size="sm">
						<Download className="size-4 mr-2" />
						Export
					</Button>
					<Button size="sm">
						<RefreshCw className="size-4 mr-2" />
						Refresh
					</Button>
				</div>
			</div>

			{/* Key Metrics Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* Total Revenue */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-1)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-1) 15%, transparent)'
							}}
						>
							<DollarSign className="size-5" />
						</div>
						<h3 className="font-semibold">Total Revenue</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{dashboardData?.revenue?.yearly ? formatCurrency(dashboardData.revenue.yearly) : '$0'}
					</div>
					<div className="flex items-center gap-2">
						<Badge
							className="text-xs"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-1) 20%, transparent)',
								color: 'var(--chart-1)'
							}}
						>
							{(dashboardData?.revenue?.growth || 0) >= 0 ? (
								<TrendingUp className="size-3 mr-1" />
							) : (
								<TrendingDown className="size-3 mr-1" />
							)}
							{formatPercentage(dashboardData?.revenue?.growth || 0)}
						</Badge>
						<p className="text-muted-foreground text-sm">vs last 6 months</p>
					</div>
				</Card>

				{/* Average Occupancy */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-2)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-2) 15%, transparent)'
							}}
						>
							<Users className="size-5" />
						</div>
						<h3 className="font-semibold">Avg Occupancy</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{dashboardData?.units?.occupancyRate ? `${dashboardData.units.occupancyRate.toFixed(1)}%` : '0.0%'}
					</div>
					<div className="flex items-center gap-2">
						<Badge
							className="text-xs"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-2) 20%, transparent)',
								color: 'var(--chart-2)'
							}}
						>
							{(dashboardData?.units?.occupancyChange || 0) >= 0 ? (
								<TrendingUp className="size-3 mr-1" />
							) : (
								<TrendingDown className="size-3 mr-1" />
							)}
							{formatPercentage(dashboardData?.units?.occupancyChange || 0)}
						</Badge>
						<p className="text-muted-foreground text-sm">
							industry benchmark: 89%
						</p>
					</div>
				</Card>

				{/* Net Operating Income */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-3)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-3) 15%, transparent)'
							}}
						>
							<BarChart3 className="size-5" />
						</div>
						<h3 className="font-semibold">Net Operating Income</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{formatCurrency(calculateNetOperatingIncome().netIncome)}
					</div>
					<div className="flex items-center gap-2">
						<Badge
							className="text-xs"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-3) 20%, transparent)',
								color: 'var(--chart-3)'
							}}
						>
							{(dashboardData?.revenue?.growth || 0) >= 0 ? (
								<TrendingUp className="size-3 mr-1" />
							) : (
								<TrendingDown className="size-3 mr-1" />
							)}
							{formatPercentage(dashboardData?.revenue?.growth || 0)}
						</Badge>
						<p className="text-muted-foreground text-sm">
							{calculateNetOperatingIncome().profitMargin.toFixed(1)}% profit margin
						</p>
					</div>
				</Card>

				{/* Portfolio Growth */}
				<Card
					className="p-6 border shadow-sm"
					style={{ borderLeftColor: 'var(--chart-4)', borderLeftWidth: '4px' }}
				>
					<div className="flex items-center gap-3 mb-4">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-4) 15%, transparent)'
							}}
						>
							<Building className="size-5" />
						</div>
						<h3 className="font-semibold">Portfolio Growth</h3>
					</div>
					<div className="text-3xl font-bold mb-1">
						{dashboardData?.properties?.total || 0}
					</div>
					<div className="flex items-center gap-2">
						<Badge
							className="text-xs"
							style={{
								backgroundColor:
									'color-mix(in oklab, var(--chart-4) 20%, transparent)',
								color: 'var(--chart-4)'
							}}
						>
							<TrendingUp className="size-3 mr-1" />
							{dashboardData?.properties?.total ? '+' + ((dashboardData.properties.total / 10) * 100).toFixed(1) + '%' : '+0.0%'}
						</Badge>
						<p className="text-muted-foreground text-sm">
							total properties managed
						</p>
					</div>
				</Card>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* Revenue Trend Chart */}
				<Card className="p-6 border shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold">
								Revenue & Expenses Trend
							</h3>
							<p className="text-muted-foreground text-sm">
								6-month performance overview
							</p>
						</div>
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1">
								<div
									className="w-3 h-3 rounded-full"
									style={{ backgroundColor: 'var(--chart-3)' }}
								></div>
								<span className="text-sm text-muted-foreground">Revenue</span>
							</div>
							<div className="flex items-center gap-1">
								<div
									className="w-3 h-3 rounded-full"
									style={{ backgroundColor: 'var(--chart-5)' }}
								></div>
								<span className="text-sm text-muted-foreground">Expenses</span>
							</div>
						</div>
					</div>
					<ChartAreaInteractive />
				</Card>

				{/* Top Performing Properties */}
				<Card className="p-6 border shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold">
								Top Performing Properties
							</h3>
							<p className="text-muted-foreground text-sm">
								Ranked by monthly revenue
							</p>
						</div>
						<Button variant="ghost" size="sm">
							<Calendar className="size-4 mr-2" />
							This Month
						</Button>
					</div>
					<div className="space-y-4">
						{(propertyData || []).slice(0, 5).map((property, index: number) => (
							<div
								key={index}
								className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
							>
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-semibold text-sm">
										{index + 1}
									</div>
									<div>
										<p className="font-medium">{property.property || 'Unknown Property'}</p>
										<p className="text-sm text-muted-foreground">
											{property.occupiedUnits || 0}/{property.totalUnits || 0} units occupied
										</p>
									</div>
								</div>
								<Badge
									variant={
										(property.occupancyRate || 0) >= 90 ? 'default' : 'destructive'
									}
									className="text-xs"
								>
									{(property.occupancyRate || 0) >= 90 ? (
										<TrendingUp className="size-3 mr-1" />
									) : (
										<TrendingDown className="size-3 mr-1" />
									)}
									{property.occupancyRate ? `${property.occupancyRate.toFixed(1)}%` : '0.0%'}
								</Badge>
							</div>
						))}
					</div>
				</Card>
			</div>

			{/* Performance Insights */}
			<Card className="p-6 border shadow-sm">
				<h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="space-y-3">
						<h4 className="font-medium text-green-700 dark:text-green-400">
							Key Strengths
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
								Occupancy rate exceeds industry benchmark by 4.2%
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
								Revenue growth consistently outpacing expenses
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2"></div>
								Portfolio expansion ahead of 2024 targets
							</li>
						</ul>
					</div>
					<div className="space-y-3">
						<h4 className="font-medium text-amber-700 dark:text-amber-400">
							Areas for Improvement
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
								March occupancy dipped below 90%
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
								Maintenance costs trending upward
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2"></div>
								Riverside Towers underperforming
							</li>
						</ul>
					</div>
					<div className="space-y-3">
						<h4 className="font-medium text-blue-700 dark:text-blue-400">
							Recommendations
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
								Focus marketing efforts on March vacancy spike
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
								Implement preventive maintenance program
							</li>
							<li className="flex items-start gap-2">
								<div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2"></div>
								Review Riverside Towers pricing strategy
							</li>
						</ul>
					</div>
				</div>
			</Card>
		</div>
	)
}
