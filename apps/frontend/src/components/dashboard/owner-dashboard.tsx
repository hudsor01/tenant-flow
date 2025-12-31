'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dashboard } from './dashboard'
import { Skeleton } from '#components/ui/skeleton'
import {
	Empty,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	EmptyContent
} from '#components/ui/empty'
import {
	useDashboardStats,
	useDashboardCharts,
	usePropertyPerformance
} from '#hooks/api/use-owner-dashboard'
import { Home } from 'lucide-react'
import Link from 'next/link'

/**
 * Dashboard Loading Skeleton
 */
function DashboardLoadingSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header skeleton */}
			<div>
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-72 mt-2" />
			</div>

			{/* Main content skeleton */}
			<div className="grid gap-6 lg:grid-cols-4">
				{/* Chart skeleton - 75% */}
				<div className="lg:col-span-3 border rounded-lg p-6">
					<Skeleton className="h-6 w-48 mb-2" />
					<Skeleton className="h-4 w-64 mb-4" />
					<Skeleton className="h-[400px] w-full" />
				</div>

				{/* Quick actions skeleton - 25% */}
				<div className="border rounded-lg p-6">
					<Skeleton className="h-6 w-32 mb-2" />
					<Skeleton className="h-4 w-24 mb-4" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className="flex items-center gap-3 p-3 border rounded-lg"
							>
								<Skeleton className="h-9 w-9 rounded-md" />
								<div className="flex-1">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-3 w-36 mt-1" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Portfolio table skeleton */}
			<div className="border rounded-lg overflow-hidden">
				<div className="px-4 py-3 border-b flex items-center gap-3">
					<Skeleton className="h-9 w-64" />
					<div className="flex items-center gap-3 ml-auto">
						<Skeleton className="h-9 w-[140px]" />
						<Skeleton className="h-9 w-[140px]" />
					</div>
				</div>
				<div className="p-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-4 py-3 border-b last:border-0"
						>
							<Skeleton className="h-5 flex-1" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-20" />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

/**
 * Dashboard Empty State
 */
function DashboardEmptyState() {
	return (
		<Empty>
			<EmptyMedia>
				<Home className="h-12 w-12 text-muted-foreground" />
			</EmptyMedia>
			<EmptyTitle>Welcome to TenantFlow</EmptyTitle>
			<EmptyDescription>
				Get started by adding your first property to your portfolio.
			</EmptyDescription>
			<EmptyContent>
				<Link
					href="/properties/new"
					className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				>
					Add Your First Property
				</Link>
			</EmptyContent>
		</Empty>
	)
}

/**
 * Owner Dashboard Component
 *
 * Main dashboard component that displays portfolio overview,
 * revenue trends, and quick actions for property owners.
 */
export function OwnerDashboard() {
	const router = useRouter()

	// API Hooks
	const { data: statsData, isLoading: statsLoading } = useDashboardStats()
	const { data: chartsData, isLoading: chartsLoading } = useDashboardCharts()
	const { data: performanceData, isLoading: performanceLoading } =
		usePropertyPerformance()

	// Transform stats to design-os format
	const metrics = useMemo(() => {
		if (!statsData?.stats) {
			return {
				totalRevenue: 0,
				revenueChange: 0,
				occupancyRate: 0,
				occupancyChange: 0,
				totalProperties: 0,
				totalUnits: 0,
				occupiedUnits: 0,
				activeLeases: 0,
				expiringLeases: 0,
				openMaintenanceRequests: 0,
				collectionRate: 0
			}
		}

		const stats = statsData.stats
		return {
			totalRevenue: (stats.revenue?.monthly ?? 0) * 100, // Convert to cents
			revenueChange: statsData.metricTrends?.monthlyRevenue?.percentChange ?? 0,
			occupancyRate: stats.units?.occupancyRate ?? 0,
			occupancyChange:
				statsData.metricTrends?.occupancyRate?.percentChange ?? 0,
			totalProperties: stats.properties?.total ?? 0,
			totalUnits: stats.units?.total ?? 0,
			occupiedUnits: stats.units?.occupied ?? 0,
			activeLeases: stats.leases?.active ?? 0,
			expiringLeases: stats.leases?.expiringSoon ?? 0,
			openMaintenanceRequests: stats.maintenance?.open ?? 0,
			collectionRate: 0 // Not available in current API
		}
	}, [statsData])

	// Transform revenue trends
	const revenueTrend = useMemo(() => {
		if (!chartsData?.timeSeries?.monthlyRevenue) return []

		return chartsData.timeSeries.monthlyRevenue.map(point => ({
			month: point.date,
			revenue: point.value * 100 // Convert to cents
		}))
	}, [chartsData])

	// Transform property performance
	const propertyPerformance = useMemo(() => {
		if (!performanceData) return []

		return performanceData.map(prop => ({
			id: prop.property_id,
			name: prop.property,
			address: prop.address_line1,
			totalUnits: prop.totalUnits,
			occupiedUnits: prop.occupiedUnits,
			occupancyRate: prop.occupancyRate,
			monthlyRevenue: prop.monthlyRevenue * 100, // Convert to cents
			openMaintenance: 0 // Not in current API response
		}))
	}, [performanceData])

	// Navigation callbacks
	const onAddProperty = useCallback(() => {
		router.push('/properties/new')
	}, [router])

	const onCreateLease = useCallback(() => {
		router.push('/leases/new')
	}, [router])

	const onInviteTenant = useCallback(() => {
		router.push('/tenants/new')
	}, [router])

	const onRecordPayment = useCallback(() => {
		router.push('/rent-collection')
	}, [router])

	const onCreateMaintenanceRequest = useCallback(() => {
		router.push('/maintenance/new')
	}, [router])

	// Loading state
	const isLoading = statsLoading || chartsLoading || performanceLoading

	if (isLoading) {
		return <DashboardLoadingSkeleton />
	}

	// Check for empty state
	const isEmpty =
		!statsData?.stats ||
		((statsData.stats.properties?.total ?? 0) === 0 &&
			(statsData.stats.tenants?.total ?? 0) === 0)

	if (isEmpty) {
		return <DashboardEmptyState />
	}

	return (
		<Dashboard
			metrics={metrics}
			revenueTrend={revenueTrend}
			propertyPerformance={propertyPerformance}
			onAddProperty={onAddProperty}
			onCreateLease={onCreateLease}
			onInviteTenant={onInviteTenant}
			onRecordPayment={onRecordPayment}
			onCreateMaintenanceRequest={onCreateMaintenanceRequest}
		/>
	)
}