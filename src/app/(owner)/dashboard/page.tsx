'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Dashboard } from '#components/dashboard/dashboard'
import { OwnerOnboardingTour } from '#components/tours/owner-onboarding-tour'
import { OnboardingWizard } from '#components/onboarding/onboarding-wizard'
import {
	useDashboardStats,
	useDashboardCharts,
	usePropertyPerformance
} from '#hooks/api/use-dashboard-hooks'
import { DashboardLoadingSkeleton } from './components/dashboard-loading-skeleton'
import { DashboardEmptyState } from './components/dashboard-empty-state'
import '../dashboard.css'

/**
 * Dashboard Content - Wires API hooks to Dashboard UI component
 */
function DashboardContent() {
	const router = useRouter()
	const searchParams = useSearchParams()

	// Return-journey toast: detect ?billing=updated after Stripe Customer Portal return
	useEffect(() => {
		if (searchParams.get('billing') === 'updated') {
			toast.success('Subscription updated')
			const url = new URL(window.location.href)
			url.searchParams.delete('billing')
			window.history.replaceState({}, '', url.toString())
		}
	}, [searchParams])

	// API Hooks
	const { data: statsData, isLoading: statsLoading, isError: statsError } = useDashboardStats()
	const { data: chartsData, isLoading: chartsLoading, isError: chartsError } = useDashboardCharts()
	const { data: performanceData, isLoading: performanceLoading } =
		usePropertyPerformance()

	// Transform stats to design-os format
	const metrics = (() => {
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
	})()

	// Transform revenue trends
	const revenueTrend = (() => {
		if (!chartsData?.timeSeries?.monthlyRevenue) return []

		return chartsData.timeSeries.monthlyRevenue.map(point => ({
			month: point.date,
			revenue: point.value * 100 // Convert to cents
		}))
	})()

	// Transform property performance
	const propertyPerformance = (() => {
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
	})()

	// Navigation callbacks
	const onAddProperty = () => {
		router.push('/properties/new')
	}

	const onCreateLease = () => {
		router.push('/leases/new')
	}

	const onInviteTenant = () => {
		router.push('/tenants/new')
	}

	const onCreateMaintenanceRequest = () => {
		router.push('/maintenance/new')
	}

	// Loading state
	const isLoading = statsLoading || chartsLoading || performanceLoading

	if (isLoading) {
		return <DashboardLoadingSkeleton />
	}

	// Error state - show actionable error instead of misleading empty state
	if (statsError || chartsError) {
		return (
			<div data-testid="dashboard-stats" className="flex flex-1 items-center justify-center p-6">
				<div className="text-center py-16 max-w-md">
					<p className="text-lg font-medium text-foreground mb-2">
						Unable to load dashboard data
					</p>
					<p className="text-sm text-muted-foreground mb-4">
						There was a problem loading your dashboard. Please try again.
					</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="inline-flex items-center gap-2 px-4 py-2 min-h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
					>
						Refresh Page
					</button>
				</div>
			</div>
		)
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
		<div className="flex flex-1 flex-col">
			<Dashboard
				metrics={metrics}
				revenueTrend={revenueTrend}
				propertyPerformance={propertyPerformance}
				onAddProperty={onAddProperty}
				onCreateLease={onCreateLease}
				onInviteTenant={onInviteTenant}
				onCreateMaintenanceRequest={onCreateMaintenanceRequest}
			/>
		</div>
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
			<OnboardingWizard />
			<OwnerOnboardingTour />
			<div className="@container/main flex min-h-screen w-full flex-col bg-background">
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
