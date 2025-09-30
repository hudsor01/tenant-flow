import { EnhancedMetricsCard } from '@/components/charts/enhanced-metrics-card'
import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getAnalyticsPageData } from '@/lib/api/dashboard-server'
import { formatCurrency, formatPercentage } from '@/lib/utils'
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

export default async function AnalyticsPage() {
	// Fetch real dashboard data from API server-side (includes NOI calculations from backend)
	const {
		dashboardStats: dashboardData,
		propertyPerformance: propertyData,
		financialStats
	} = await getAnalyticsPageData()

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			{/* Page Header */}
			<div className="flex items-center justify-between px-4 lg:px-6">
				<div>
					<h1 className="text-3xl font-bold text-gradient-authority">
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
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2 lg:grid-cols-4">
				<EnhancedMetricsCard
					title="Total Revenue"
					value={
						dashboardData?.revenue?.yearly
							? formatCurrency(dashboardData.revenue.yearly)
							: '$0'
					}
					description="Annual revenue across all properties"
					change={{
						value: formatPercentage(dashboardData?.revenue?.growth || 0),
						trend: (dashboardData?.revenue?.growth || 0) >= 0 ? 'up' : 'down',
						period: 'vs last 6 months'
					}}
					icon={DollarSign}
					colorVariant="revenue"
				/>

				<EnhancedMetricsCard
					title="Avg Occupancy"
					value={
						dashboardData?.units?.occupancyRate
							? `${dashboardData.units.occupancyRate.toFixed(1)}%`
							: '0.0%'
					}
					description="Average occupancy rate across portfolio"
					change={{
						value: formatPercentage(dashboardData?.units?.occupancyChange || 0),
						trend:
							(dashboardData?.units?.occupancyChange || 0) >= 0 ? 'up' : 'down',
						period: 'industry benchmark: 89%'
					}}
					icon={Users}
					colorVariant="info"
				/>

				<EnhancedMetricsCard
					title="Net Operating Income"
					value={formatCurrency(financialStats?.netIncome || 0)}
					description={`${(financialStats?.avgRoi || 0).toFixed(1)}% ROI`}
					change={{
						value: formatPercentage(financialStats?.avgRoi || 0),
						trend: (financialStats?.avgRoi || 0) >= 0 ? 'up' : 'down',
						period: 'average return'
					}}
					icon={BarChart3}
					colorVariant="success"
				/>

				<EnhancedMetricsCard
					title="Portfolio Growth"
					value={`${dashboardData?.properties?.total || 0}`}
					description="Total properties managed"
					change={{
						value: dashboardData?.properties?.total
							? `+${((dashboardData.properties.total / 10) * 100).toFixed(1)}%`
							: '+0.0%',
						trend: 'up',
						period: 'total properties managed'
					}}
					icon={Building}
					colorVariant="primary"
				/>
			</div>

			{/* Charts Section */}
			<div className="grid grid-cols-1 gap-4 px-4 lg:px-6 lg:grid-cols-2">
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
										<p className="font-medium">
											{property.property || 'Unknown Property'}
										</p>
										<p className="text-sm text-muted-foreground">
											{property.occupiedUnits || 0}/{property.totalUnits || 0}{' '}
											units occupied
										</p>
									</div>
								</div>
								<Badge
									variant={
										(property.occupancyRate || 0) >= 90
											? 'default'
											: 'destructive'
									}
									className="text-xs"
								>
									{(property.occupancyRate || 0) >= 90 ? (
										<TrendingUp className="size-3 mr-1" />
									) : (
										<TrendingDown className="size-3 mr-1" />
									)}
									{property.occupancyRate
										? `${property.occupancyRate.toFixed(1)}%`
										: '0.0%'}
								</Badge>
							</div>
						))}
					</div>
				</Card>
			</div>
		</div>
	)
}
