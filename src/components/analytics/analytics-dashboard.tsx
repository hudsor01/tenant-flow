'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type {
	AnalyticsOverview,
	OccupancyTrend,
	RevenueTrend,
	PropertyPerformance,
	MaintenanceTrend,
	MaintenanceCategory,
	LeaseExpiry,
	RevenueByUnitType
} from './analytics-types'
import { OverviewStatsGrid } from './components/overview-stats-grid'
import { RevenueTrendChart } from './components/revenue-trend-chart'
import { OccupancyTrendChart } from './components/occupancy-trend-chart'
import { MaintenanceActivityChart } from './components/maintenance-activity-chart'
import { LeaseExpiriesChart } from './components/lease-expiries-chart'
import { MaintenanceByCategoryChart } from './components/maintenance-by-category-chart'
import { RevenueByUnitTypeChart } from './components/revenue-by-unit-type-chart'
import { PropertyPerformanceTable } from './components/property-performance-table'

interface AnalyticsDashboardProps {
	overview: AnalyticsOverview
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

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
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
			<OverviewStatsGrid overview={overview} />

			{/* Charts Row 1: Revenue & Occupancy Trends */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<RevenueTrendChart data={revenueTrend} />
				<OccupancyTrendChart data={occupancyTrend} />
			</div>

			{/* Charts Row 2: Maintenance & Lease Analytics */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<MaintenanceActivityChart data={maintenanceTrend} />
				<LeaseExpiriesChart data={leaseExpiries} />
			</div>

			{/* Charts Row 3: Category Breakdown & Revenue by Type */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<MaintenanceByCategoryChart data={maintenanceByCategory} />
				<RevenueByUnitTypeChart data={revenueByUnitType} />
			</div>

			{/* Property Performance Table */}
			<PropertyPerformanceTable
				data={propertyPerformance}
				onViewDetails={() => onViewDetails?.('properties')}
			/>
		</div>
	)
}
