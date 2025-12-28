'use client'

import { useState } from 'react'
import {
	Building2,
	Users,
	DollarSign,
	TrendingUp,
	TrendingDown,
	Wrench,
	FileText,
	Download,
	Calendar,
	BarChart3,
	PieChart,
	ArrowUpRight,
	ArrowDownRight,
	Home
} from 'lucide-react'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatTrend,
	StatDescription
} from '@/components/ui/stat'
import { AnimatedTrendIndicator } from '@/components/ui/animated-trend-indicator'

interface OccupancyTrend {
	month: string
	rate: number
	occupied: number
	total: number
}

interface RevenueTrend {
	month: string
	collected: number
	projected: number
}

interface PropertyPerformance {
	id: string
	name: string
	occupancy: number
	revenue: number
	maintenance: number
	rating: number
}

interface MaintenanceTrend {
	month: string
	opened: number
	completed: number
	avgDays: number
}

interface MaintenanceCategory {
	category: string
	count: number
	percentage: number
	avgCost: number
}

interface LeaseExpiry {
	month: string
	count: number
	value: number
}

interface RevenueByUnitType {
	type: string
	units: number
	revenue: number
	percentage: number
}

interface AnalyticsDashboardProps {
	overview: {
		totalProperties: number
		totalUnits: number
		occupancyRate: number
		occupancyChange: number
		activeTenants: number
		tenantsChange: number
		monthlyRevenue: number
		revenueChange: number
		openMaintenance: number
		maintenanceChange: number
		leaseRenewalRate: number
		renewalChange: number
	}
	occupancyTrend: OccupancyTrend[]
	revenueTrend: RevenueTrend[]
	propertyPerformance: PropertyPerformance[]
	maintenanceTrend: MaintenanceTrend[]
	maintenanceByCategory: MaintenanceCategory[]
	leaseExpiries: LeaseExpiry[]
	revenueByUnitType: RevenueByUnitType[]
	onExport?: () => void
	onViewDetails?: (section: string) => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

export function AnalyticsDashboard({
	overview,
	occupancyTrend,
	revenueTrend,
	propertyPerformance,
	maintenanceTrend,
	maintenanceByCategory,
	leaseExpiries,
	revenueByUnitType,
	onExport,
	onViewDetails
}: AnalyticsDashboardProps) {
	const [dateRange, setDateRange] = useState('6_months')

	const maxRevenue = Math.max(...revenueTrend.map(d => d.collected))
	const maxOccupancy = Math.max(...occupancyTrend.map(d => d.rate))
	const maxMaintenance = Math.max(
		...maintenanceTrend.map(d => Math.max(d.opened, d.completed))
	)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Analytics
						</h1>
						<p className="text-muted-foreground">
							Portfolio performance and insights.
						</p>
					</div>
					<div className="flex gap-2">
						<select
							value={dateRange}
							onChange={e => setDateRange(e.target.value)}
							className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							<option value="30_days">Last 30 Days</option>
							<option value="3_months">Last 3 Months</option>
							<option value="6_months">Last 6 Months</option>
							<option value="12_months">Last 12 Months</option>
						</select>
						<button
							onClick={onExport}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Overview Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Occupancy Rate</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<NumberTicker
								value={overview.occupancyRate}
								duration={1500}
								decimalPlaces={1}
							/>
							<span className="text-lg">%</span>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Building2 />
						</StatIndicator>
						<StatTrend trend={overview.occupancyChange >= 0 ? 'up' : 'down'}>
							<AnimatedTrendIndicator
								value={overview.occupancyChange}
								size="sm"
								delay={500}
							/>
							<span className="text-muted-foreground">vs last period</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Active Tenants</StatLabel>
						<StatValue className="flex items-baseline">
							<NumberTicker value={overview.activeTenants} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Users />
						</StatIndicator>
						<StatTrend trend="up">
							<span className="text-emerald-600 dark:text-emerald-400 font-medium">
								+{overview.tenantsChange}
							</span>
							<span className="text-muted-foreground">this month</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Monthly Revenue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={overview.monthlyRevenue / 100}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<DollarSign />
						</StatIndicator>
						<StatTrend trend="up">
							<AnimatedTrendIndicator
								value={overview.revenueChange}
								size="sm"
								delay={600}
							/>
							<span className="text-muted-foreground">growth</span>
						</StatTrend>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						{overview.openMaintenance > 3 && (
							<BorderBeam
								size={80}
								duration={6}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Open Maintenance</StatLabel>
						<StatValue className="flex items-baseline text-amber-600 dark:text-amber-400">
							<NumberTicker value={overview.openMaintenance} duration={1000} />
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Wrench />
						</StatIndicator>
						<StatDescription>
							{overview.maintenanceChange < 0 ? (
								<span className="text-emerald-600 dark:text-emerald-400">
									{overview.maintenanceChange} from last week
								</span>
							) : (
								<span className="text-amber-600 dark:text-amber-400">
									+{overview.maintenanceChange} from last week
								</span>
							)}
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Charts Row 1: Revenue & Occupancy Trends */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				{/* Revenue Trend */}
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Revenue Trend</h3>
								<p className="text-sm text-muted-foreground">
									Collected vs projected
								</p>
							</div>
							<BarChart3 className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="h-48 flex items-end gap-3">
							{revenueTrend.map((data, index) => (
								<BlurFade key={index} delay={0.7 + index * 0.05} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div className="w-full relative">
											{/* Projected (background) */}
											<div
												className="absolute inset-x-0 bottom-0 bg-muted/50 rounded-t"
												style={{
													height: `${(data.projected / maxRevenue) * 160}px`
												}}
											/>
											{/* Collected (foreground) */}
											<div
												className="relative w-full bg-primary rounded-t transition-all hover:bg-primary/80"
												style={{
													height: `${(data.collected / maxRevenue) * 160}px`
												}}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{data.month}
										</span>
									</div>
								</BlurFade>
							))}
						</div>

						<div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-primary" />
								<span className="text-xs text-muted-foreground">Collected</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-muted" />
								<span className="text-xs text-muted-foreground">Projected</span>
							</div>
						</div>
					</div>
				</BlurFade>

				{/* Occupancy Trend */}
				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">Occupancy Trend</h3>
								<p className="text-sm text-muted-foreground">
									Portfolio occupancy rate
								</p>
							</div>
							<TrendingUp className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="h-48 flex items-end gap-3">
							{occupancyTrend.map((data, index) => (
								<BlurFade key={index} delay={0.8 + index * 0.05} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div
											className="w-full bg-emerald-500/20 rounded-t transition-all hover:bg-emerald-500/30 relative"
											style={{ height: `${(data.rate / 100) * 160}px` }}
										>
											<div
												className="absolute inset-x-0 bottom-0 bg-emerald-500 rounded-t"
												style={{ height: '100%' }}
											/>
											<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-foreground">
												{data.rate}%
											</span>
										</div>
										<span className="text-xs text-muted-foreground">
											{data.month}
										</span>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Charts Row 2: Maintenance & Lease Analytics */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				{/* Maintenance Trend */}
				<BlurFade delay={0.8} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Maintenance Activity
								</h3>
								<p className="text-sm text-muted-foreground">
									Opened vs completed requests
								</p>
							</div>
							<Wrench className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="h-40 flex items-end gap-4">
							{maintenanceTrend.map((data, index) => (
								<BlurFade key={index} delay={0.9 + index * 0.05} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div className="w-full flex gap-1">
											<div
												className="flex-1 bg-amber-500 rounded-t transition-all hover:bg-amber-500/80"
												style={{
													height: `${(data.opened / maxMaintenance) * 120}px`
												}}
											/>
											<div
												className="flex-1 bg-emerald-500 rounded-t transition-all hover:bg-emerald-500/80"
												style={{
													height: `${(data.completed / maxMaintenance) * 120}px`
												}}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{data.month}
										</span>
									</div>
								</BlurFade>
							))}
						</div>

						<div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-amber-500" />
								<span className="text-xs text-muted-foreground">Opened</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-sm bg-emerald-500" />
								<span className="text-xs text-muted-foreground">Completed</span>
							</div>
						</div>
					</div>
				</BlurFade>

				{/* Lease Expiries */}
				<BlurFade delay={0.9} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Upcoming Lease Expiries
								</h3>
								<p className="text-sm text-muted-foreground">Next 6 months</p>
							</div>
							<FileText className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="space-y-3">
							{leaseExpiries.map((expiry, index) => (
								<BlurFade key={index} delay={1 + index * 0.05} inView>
									<div className="flex items-center gap-3">
										<span className="w-10 text-sm font-medium text-muted-foreground">
											{expiry.month}
										</span>
										<div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
											<div
												className="h-full bg-primary/80 rounded-lg transition-all"
												style={{
													width: `${(expiry.count / Math.max(...leaseExpiries.map(e => e.count))) * 100}%`
												}}
											/>
											<div className="absolute inset-0 flex items-center justify-between px-3">
												<span className="text-xs font-medium text-foreground">
													{expiry.count} leases
												</span>
												<span className="text-xs text-muted-foreground">
													{formatCurrency(expiry.value)}
												</span>
											</div>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Charts Row 3: Category Breakdown & Revenue by Type */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				{/* Maintenance by Category */}
				<BlurFade delay={1} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Maintenance by Category
								</h3>
								<p className="text-sm text-muted-foreground">
									Request distribution
								</p>
							</div>
							<PieChart className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="space-y-4">
							{maintenanceByCategory.map((cat, index) => (
								<BlurFade key={index} delay={1.1 + index * 0.05} inView>
									<div className="flex items-center gap-4">
										<div className="w-10 text-sm font-medium text-muted-foreground">
											{cat.percentage}%
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between mb-1">
												<span className="text-sm font-medium text-foreground">
													{cat.category}
												</span>
												<span className="text-xs text-muted-foreground">
													{cat.count} requests
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-primary rounded-full transition-all duration-1000"
													style={{ width: `${cat.percentage}%` }}
												/>
											</div>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>

				{/* Revenue by Unit Type */}
				<BlurFade delay={1.1} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h3 className="font-medium text-foreground">
									Revenue by Unit Type
								</h3>
								<p className="text-sm text-muted-foreground">
									Income distribution
								</p>
							</div>
							<Home className="w-5 h-5 text-muted-foreground" />
						</div>

						<div className="space-y-4">
							{revenueByUnitType.map((type, index) => (
								<BlurFade key={index} delay={1.2 + index * 0.05} inView>
									<div className="flex items-center gap-4">
										<div className="w-24 text-sm font-medium text-foreground">
											{type.type}
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between mb-1">
												<span className="text-xs text-muted-foreground">
													{type.units} units
												</span>
												<span className="text-sm font-medium text-foreground">
													{formatCurrency(type.revenue)}
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
													style={{ width: `${type.percentage}%` }}
												/>
											</div>
										</div>
									</div>
								</BlurFade>
							))}
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Property Performance Table */}
			<BlurFade delay={1.2} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="p-6 border-b border-border">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-foreground">
									Property Performance
								</h3>
								<p className="text-sm text-muted-foreground">
									Comparative metrics across portfolio
								</p>
							</div>
							<button
								onClick={() => onViewDetails?.('properties')}
								className="text-sm text-primary hover:underline"
							>
								View All
							</button>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
										Property
									</th>
									<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
										Occupancy
									</th>
									<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
										Revenue
									</th>
									<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
										Maintenance
									</th>
									<th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">
										Rating
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{propertyPerformance.map((property, idx) => (
									<BlurFade key={property.id} delay={1.3 + idx * 0.05} inView>
										<tr className="hover:bg-muted/30 transition-colors">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
														<Building2 className="w-5 h-5 text-primary" />
													</div>
													<span className="font-medium text-foreground">
														{property.name}
													</span>
												</div>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-2">
													<span
														className={`font-medium ${property.occupancy >= 90 ? 'text-emerald-600 dark:text-emerald-400' : property.occupancy >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}
													>
														{property.occupancy}%
													</span>
												</div>
											</td>
											<td className="px-6 py-4 text-right font-medium text-foreground">
												{formatCurrency(property.revenue)}
											</td>
											<td className="px-6 py-4 text-right">
												<span
													className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${property.maintenance === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}
												>
													{property.maintenance}
												</span>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-1">
													<span className="font-medium text-foreground">
														{property.rating}
													</span>
													<span className="text-amber-500">★</span>
												</div>
											</td>
										</tr>
									</BlurFade>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
