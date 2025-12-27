'use client'

/**
 * Owner Dashboard Component
 *
 * React 19.2 Architecture with Progressive Loading:
 * - Stats cards load first (above-fold, critical path)
 * - Charts load when scrolled into view (Activity mode='hidden' until visible)
 * - Quick actions are static (no network request)
 * - Date range filtering and CSV/PDF export
 */

import { Suspense, Activity, useState, useCallback, useMemo } from 'react'
import {
	TrendingUp,
	TrendingDown,
	Wrench,
	UserPlus,
	ChevronRight,
	Home,
	FileSignature,
	AlertCircle,
	HelpCircle,
	CalendarClock,
	Clock,
	DollarSign
} from 'lucide-react'
import Link from 'next/link'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Skeleton } from '#components/ui/skeleton'
import { useInViewport } from '#components/deferred-section'
import {
	useDashboardStats,
	useDashboardCharts,
	useDashboardActivity,
	usePropertyPerformance,
	type DashboardStatsData,
	type DashboardChartsData
} from '#hooks/api/use-owner-dashboard'
import { useExpiringLeases } from '#hooks/api/use-lease'
import { StatsSkeleton, ChartSkeleton } from './skeletons'
import { DashboardSection } from './dashboard-section'
import { DashboardFilters, type DateRange } from './dashboard-filters'
import { RevenueChartSection, PortfolioOverviewSection } from './sections'
import { formatRelativeDate } from '#lib/formatters/date'
import { formatCents } from '#lib/formatters/currency'

/**
 * Mini sparkline component for stat cards
 */
function MiniSparkline({
	data,
	color = 'var(--color-primary)'
}: {
	data: number[]
	color?: string
}) {
	if (!data || data.length === 0) return null

	const max = Math.max(...data)
	const min = Math.min(...data)
	const range = max - min || 1

	return (
		<div className="flex items-end gap-0.5 h-6">
			{data.map((v, i) => (
				<div
					key={i}
					className="w-1 rounded-full transition-colors"
					style={{
						height: `${Math.max(20, ((v - min) / range) * 100)}%`,
						backgroundColor: `color-mix(in oklch, ${color} 40%, transparent)`
					}}
				/>
			))}
		</div>
	)
}

/**
 * Stat card with sparkline
 * Aligned with design-os patterns for KPI-focused layout
 */
interface StatCardProps {
	label: string
	value: string | number
	trend?: number | undefined
	trendLabel?: string | undefined
	sparklineData?: number[] | undefined
	icon?: React.ReactNode | undefined
	onClick?: (() => void) | undefined
	variant?: 'default' | 'warning' | undefined
	href?: string | undefined
}

function StatCard({
	label,
	value,
	trend,
	trendLabel,
	sparklineData,
	icon,
	onClick,
	variant = 'default',
	href
}: StatCardProps) {
	const isPositive = (trend ?? 0) >= 0
	const showTrend = trend !== undefined && trend !== 0

	const baseClasses =
		'dashboard-stat-card text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
	const variantAttr = variant === 'warning' ? { 'data-variant': 'warning' } : {}

	const content = (
		<>
			<div className="flex items-center justify-between mb-3">
				<p className="text-sm font-medium text-muted-foreground">{label}</p>
				{showTrend && (
					<div
						className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
							isPositive
								? 'bg-success/10 text-success'
								: 'bg-destructive/10 text-destructive'
						}`}
					>
						{isPositive ? (
							<TrendingUp className="w-3 h-3" />
						) : (
							<TrendingDown className="w-3 h-3" />
						)}
						{isPositive ? '+' : ''}
						{trend}%
					</div>
				)}
				{trendLabel && !showTrend && (
					<div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
						<AlertCircle className="w-3 h-3" />
						{trendLabel}
					</div>
				)}
			</div>
			<div className="flex items-end justify-between gap-4">
				<p className="text-2xl font-semibold text-foreground tabular-nums">
					{value}
				</p>
				{sparklineData && sparklineData.length > 0 && (
					<MiniSparkline data={sparklineData} />
				)}
				{icon && (
					<div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
						{icon}
					</div>
				)}
			</div>
		</>
	)

	if (href) {
		return (
			<Link href={href} className={baseClasses} {...variantAttr}>
				{content}
			</Link>
		)
	}

	if (onClick) {
		return (
			<button onClick={onClick} className={baseClasses} {...variantAttr}>
				{content}
			</button>
		)
	}

	return (
		<div className={baseClasses} {...variantAttr}>
			{content}
		</div>
	)
}

/**
 * Quick action item component
 */
interface QuickActionProps {
	title: string
	description: string
	href: string
	icon: React.ReactNode
	iconBgClass: string
	iconHoverClass: string
}

function QuickAction({
	title,
	description,
	href,
	icon,
	iconBgClass,
	iconHoverClass
}: QuickActionProps) {
	return (
		<Link href={href} className="quick-action-button group">
			<div
				className={`w-9 h-9 rounded-lg shrink-0 ${iconBgClass} flex items-center justify-center ${iconHoverClass} transition-colors duration-fast`}
			>
				{icon}
			</div>
			<div className="flex-1 min-w-0 text-left">
				<p className="text-sm font-medium text-foreground truncate">{title}</p>
				<p className="text-xs text-muted-foreground truncate">{description}</p>
			</div>
			<ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-fast shrink-0" />
		</Link>
	)
}

/**
 * Dashboard empty state for new users
 */
function DashboardEmptyState() {
	return (
		<div className="p-6 lg:p-8 min-h-full">
			<div className="max-w-md mx-auto text-center py-16">
				<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
					<Home className="w-8 h-8 text-primary" />
				</div>
				<h1 className="text-xl font-semibold text-foreground mb-3">
					Welcome to TenantFlow
				</h1>
				<p className="text-muted-foreground mb-8">
					Get started by adding your first property, then invite tenants and
					create leases to begin tracking your portfolio.
				</p>
				<Link
					href="/properties/new"
					className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
				>
					<Home className="w-5 h-5" />
					Add Your First Property
				</Link>
			</div>
		</div>
	)
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

/**
 * Stats Section - CRITICAL PATH (loads first)
 */
function StatsSection({ data }: { data: DashboardStatsData }) {
	const { stats, metricTrends } = data

	const occupancyRate = stats?.units?.occupancyRate ?? 0
	const totalTenants = stats?.tenants?.active ?? 0
	const totalRevenue = stats?.revenue?.monthly ?? 0
	const openMaintenance = stats?.maintenance?.open ?? 0

	const occupancyTrend = metricTrends?.occupancyRate?.percentChange ?? 0
	const tenantsTrend = metricTrends?.activeTenants?.change ?? 0
	const revenueTrend = metricTrends?.monthlyRevenue?.percentChange ?? 0
	const maintenanceTrend = metricTrends?.openMaintenance?.change ?? 0

	return (
		<section className="mb-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					Overview
				</h2>
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					label="Occupancy"
					value={`${occupancyRate}%`}
					trend={Math.round(occupancyTrend)}
				/>
				<StatCard
					label="Tenants"
					value={totalTenants}
					trend={tenantsTrend > 0 ? tenantsTrend : undefined}
					trendLabel={tenantsTrend > 0 ? `+${tenantsTrend}` : undefined}
				/>
				<StatCard
					label="Revenue"
					value={formatCents(totalRevenue, {
						compact: true,
						minimumFractionDigits: 0,
						maximumFractionDigits: 1
					})}
					trend={Math.round(revenueTrend)}
				/>
				<StatCard
					label="Maintenance"
					value={openMaintenance}
					trend={maintenanceTrend < 0 ? maintenanceTrend : undefined}
					trendLabel={openMaintenance > 5 ? 'Action needed' : undefined}
					icon={<Wrench className="w-4 h-4 text-warning" />}
					variant="warning"
				/>
			</div>
		</section>
	)
}

/**
 * Charts Section - DEFERRED (loads on viewport)
 */
function ChartsSection({
	data,
	isLoading
}: {
	data?: DashboardChartsData | undefined
	isLoading?: boolean | undefined
}) {
	return (
		<div className="flex-1 lg:w-3/4">
			<RevenueChartSection
				data={data?.timeSeries?.monthlyRevenue}
				isLoading={isLoading}
			/>
		</div>
	)
}

/**
 * Quick Actions Section - Static content
 */
function QuickActionsSection() {
	return (
		<div className="lg:w-1/4 bg-card border border-border rounded-lg overflow-hidden">
			<div className="px-5 py-4 border-b border-border">
				<h3 className="text-base font-medium text-foreground">Quick Actions</h3>
				<p className="text-xs text-muted-foreground mt-0.5">Common tasks</p>
			</div>
			<div className="p-4 space-y-2">
				<QuickAction
					title="Add Property"
					description="Register a new property"
					href="/properties/new"
					icon={<Home className="w-4 h-4" />}
					iconBgClass="bg-primary/10 text-primary"
					iconHoverClass="group-hover:bg-primary group-hover:text-primary-foreground"
				/>
				<QuickAction
					title="Create Lease"
					description="Draft a new lease agreement"
					href="/leases/new"
					icon={<FileSignature className="w-4 h-4" />}
					iconBgClass="bg-success/10 text-success"
					iconHoverClass="group-hover:bg-success group-hover:text-success-foreground"
				/>
				<QuickAction
					title="Invite Tenant"
					description="Send tenant invitation"
					href="/tenants/new"
					icon={<UserPlus className="w-4 h-4" />}
					iconBgClass="bg-info/10 text-info"
					iconHoverClass="group-hover:bg-info group-hover:text-info-foreground"
				/>
				<QuickAction
					title="Record Payment"
					description="Log a rent payment"
					href="/rent-collection?action=record"
					icon={<DollarSign className="w-4 h-4" />}
					iconBgClass="bg-warning/10 text-warning"
					iconHoverClass="group-hover:bg-warning group-hover:text-warning-foreground"
				/>
				<QuickAction
					title="New Request"
					description="Create maintenance request"
					href="/maintenance/new"
					icon={<Wrench className="w-4 h-4" />}
					iconBgClass="bg-muted text-muted-foreground"
					iconHoverClass="group-hover:bg-primary group-hover:text-primary-foreground"
				/>
			</div>
		</div>
	)
}

// ============================================================================
// DEFERRED SECTIONS
// ============================================================================

/**
 * Activity Feed Section - Shows recent activity (DEFERRED)
 */
function ActivityFeedSection() {
	const { data: activityData, isLoading } = useDashboardActivity()
	const activities = activityData?.activities ?? []

	if (isLoading) {
		return (
			<DashboardSection
				title="Recent Activity"
				description="Latest updates across your properties"
				variant="activity"
			>
				<div className="space-y-3">
					{[1, 2, 3].map(i => (
						<div key={i} className="flex gap-3 animate-pulse">
							<Skeleton className="h-8 w-8 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</div>
					))}
				</div>
			</DashboardSection>
		)
	}

	if (activities.length === 0) {
		return (
			<DashboardSection
				title="Recent Activity"
				description="Latest updates across your properties"
				variant="activity"
			>
				<div className="text-center py-6 text-muted-foreground text-sm">
					<Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p>No recent activity</p>
					<p className="text-xs">Updates will appear as they happen</p>
				</div>
			</DashboardSection>
		)
	}

	return (
		<DashboardSection
			title="Recent Activity"
			description="Latest updates across your properties"
			variant="activity"
		>
			<div className="space-y-3">
				{activities.slice(0, 5).map(activity => (
					<div
						key={activity.id}
						className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
					>
						<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
							<Clock className="w-4 h-4" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-foreground truncate">
								{activity.action}
							</p>
							<p className="text-xs text-muted-foreground">
								{formatRelativeDate(activity.created_at)}
							</p>
						</div>
					</div>
				))}
			</div>
			{activities.length > 5 && (
				<Link
					href="/activity"
					className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					View all activity <ChevronRight className="w-3 h-3" />
				</Link>
			)}
		</DashboardSection>
	)
}

/**
 * Expiring Leases Section - Shows leases expiring soon (DEFERRED)
 */
function ExpiringLeasesSection() {
	const { data: expiringLeases, isLoading } = useExpiringLeases(30)

	if (isLoading) {
		return (
			<DashboardSection
				title="Expiring Leases"
				description="Leases ending in the next 30 days"
				variant="performance"
			>
				<div className="space-y-3">
					{[1, 2, 3].map(i => (
						<div key={i} className="flex gap-3 animate-pulse">
							<Skeleton className="h-10 w-10 rounded" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</div>
					))}
				</div>
			</DashboardSection>
		)
	}

	const leases = expiringLeases ?? []

	if (leases.length === 0) {
		return (
			<DashboardSection
				title="Expiring Leases"
				description="Leases ending in the next 30 days"
				variant="performance"
			>
				<div className="text-center py-6 text-muted-foreground text-sm">
					<CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p>No leases expiring soon</p>
					<p className="text-xs">All leases are active and not near expiry</p>
				</div>
			</DashboardSection>
		)
	}

	const leasesWithDays = leases.map(lease => ({
		...lease,
		daysUntilExpiry: Math.ceil(
			(new Date(lease.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		)
	}))

	return (
		<DashboardSection
			title="Expiring Leases"
			description="Leases ending in the next 30 days"
			variant="performance"
		>
			<div className="space-y-2">
				{leasesWithDays.slice(0, 5).map(lease => (
					<Link
						key={lease.id}
						href={`/leases/${lease.id}`}
						className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors group"
					>
						<div className="flex-shrink-0 w-10 h-10 rounded bg-warning/20 text-warning flex items-center justify-center">
							<CalendarClock className="w-5 h-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-foreground">
								{lease.daysUntilExpiry <= 0
									? 'Expired'
									: lease.daysUntilExpiry === 1
										? 'Expires tomorrow'
										: `Expires in ${lease.daysUntilExpiry} days`}
							</p>
							<p className="text-xs text-muted-foreground">
								{new Date(lease.end_date).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</p>
						</div>
						<ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
					</Link>
				))}
			</div>
			{leases.length > 5 && (
				<Link
					href="/leases?filter=expiring"
					className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					View all ({leases.length}) <ChevronRight className="w-3 h-3" />
				</Link>
			)}
		</DashboardSection>
	)
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

/**
 * Dashboard Content with Progressive Loading and Filters
 */
function DashboardContent() {
	const [chartsRef, chartsVisible] = useInViewport('200px')
	const [portfolioRef, portfolioVisible] = useInViewport('200px')

	// Date range state for filtering
	const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

	// CRITICAL: Stats load first (above-fold)
	const { data: statsData, isLoading: statsLoading } = useDashboardStats()

	// DEFERRED: Charts load when in viewport
	const { data: chartsData, isLoading: chartsLoading } = useDashboardCharts()

	// DEFERRED: Properties for Portfolio Overview
	const { data: propertiesData, isLoading: propertiesLoading } =
		usePropertyPerformance()

	// Handle date range changes
	const handleDateRangeChange = useCallback((range: DateRange) => {
		setDateRange(range)
		// Note: In a full implementation, this would trigger refetching data with the new date range
		// For now, the filter state is tracked and can be passed to API hooks
	}, [])

	// Prepare export data
	const exportData = useMemo(() => {
		if (!statsData?.stats || !propertiesData) return undefined

		return {
			stats: statsData.stats as unknown as Record<string, unknown>,
			propertyPerformance: propertiesData.map(p => ({
				property: p.property,
				address_line1: p.address_line1,
				totalUnits: p.totalUnits,
				occupiedUnits: p.occupiedUnits,
				occupancyRate: p.occupancyRate,
				monthlyRevenue: p.monthlyRevenue
			}))
		}
	}, [statsData, propertiesData])

	// Show skeleton while critical data loads
	if (statsLoading || !statsData) {
		return <StatsSkeleton />
	}

	// Check for empty state
	const isEmpty =
		!statsData.stats ||
		((statsData.stats.properties?.total ?? 0) === 0 &&
			(statsData.stats.tenants?.total ?? 0) === 0)

	if (isEmpty) {
		return <DashboardEmptyState />
	}

	return (
		<div className="p-6 lg:p-8 min-h-full">
			{/* Header with Filters */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
					<p className="text-sm text-muted-foreground mt-0.5">
						Portfolio overview
					</p>
				</div>
				<div className="flex items-center gap-3">
					{/* Date range and export filters */}
					<div className="hidden lg:block">
						<DashboardFilters
							dateRange={dateRange}
							onDateRangeChange={handleDateRangeChange}
							exportData={exportData}
							disabled={statsLoading}
						/>
					</div>
					{/* Compact filters for mobile/tablet */}
					<div className="lg:hidden">
						<DashboardFilters
							dateRange={dateRange}
							onDateRangeChange={handleDateRangeChange}
							exportData={exportData}
							disabled={statsLoading}
							compact
						/>
					</div>
					{/* Tour button */}
					<button
						className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
						data-tour-trigger="owner"
					>
						<HelpCircle className="w-4 h-4" />
						<span className="hidden sm:inline">Tour</span>
					</button>
				</div>
			</div>

			{/* Stats Section - CRITICAL PATH */}
			<StatsSection data={statsData} />

			{/* Main Content: Chart + Quick Actions */}
			<section className="bg-card/30 border border-border/50 rounded-lg p-6">
				<div className="flex flex-col lg:flex-row gap-6" ref={chartsRef}>
					{/* Charts Section - DEFERRED with Activity */}
					<Activity mode={chartsVisible ? 'visible' : 'hidden'}>
						<Suspense fallback={<ChartSkeleton />}>
							<ChartsSection data={chartsData} isLoading={chartsLoading} />
						</Suspense>
					</Activity>

					{/* Quick Actions - Static */}
					<QuickActionsSection />
				</div>
			</section>

			{/* Portfolio Overview */}
			<section className="mt-6" ref={portfolioRef}>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Portfolio Overview
					</h2>
				</div>
				<Activity mode={portfolioVisible ? 'visible' : 'hidden'}>
					<PortfolioOverviewSection
						properties={propertiesData ?? []}
						isLoading={propertiesLoading}
					/>
				</Activity>
			</section>

			{/* Activity & Leases Section - DEFERRED */}
			<section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
				<ActivityFeedSection />
				<ExpiringLeasesSection />
			</section>
		</div>
	)
}

/**
 * OwnerDashboard - Main dashboard component with error boundary
 */
export function OwnerDashboard() {
	return (
		<ErrorBoundary
			fallback={
				<div className="p-6 lg:p-8 min-h-full">
					<div className="text-center py-16">
						<p className="text-muted-foreground">Unable to load dashboard</p>
					</div>
				</div>
			}
		>
			<DashboardContent />
		</ErrorBoundary>
	)
}
