'use client'

import { Suspense, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Dashboard } from '#components/dashboard/dashboard'
import { OwnerOnboardingTour } from '#components/tours'
import { Skeleton } from '#components/ui/skeleton'
import {
	useDashboardStats,
	useDashboardCharts,
	usePropertyPerformance
} from '#hooks/api/use-owner-dashboard'
import { Home } from 'lucide-react'
import Link from 'next/link'
import '../dashboard.css'

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

/**
 * Dashboard Content - Wires API hooks to Dashboard UI component
 */
function DashboardContent() {
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
			occupancyChange: statsData.metricTrends?.occupancyRate?.percentChange ?? 0,
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
		router.push('/payments/new')
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

/**
 * Owner Dashboard Homepage
 * URL: /dashboard
 *
 * This is the main owner dashboard page showing portfolio overview,
 * revenue trends, and quick actions.
 *
 * Auth: Protected by middleware role checks
 */
export default function DashboardPage() {
	return (
		<>
			<OwnerOnboardingTour />
			<div className="@container/main flex min-h-screen w-full flex-col bg-(--background)">
				<ErrorBoundary
					fallback={
						<div className="p-6 lg:p-8">
							<div className="text-center py-16">
								<p className="text-muted-foreground">
									Unable to load dashboard. Please refresh the page.
								</p>
							</div>
						</div>
					}
				>
					<Suspense fallback={<DashboardLoadingSkeleton />}>
						<DashboardContent />
					</Suspense>
				</ErrorBoundary>
			</div>
		</>
	)
}
