'use client'

import { Suspense, useMemo, useCallback, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { Dashboard } from '#components/dashboard/dashboard'
import { OwnerOnboardingTour } from '#components/tours/owner-onboarding-tour'
import { OnboardingWizard } from '#components/onboarding/onboarding-wizard'
import { Alert, AlertDescription } from '#components/ui/alert'
import { Button } from '#components/ui/button'
import {
	useDashboardStats,
	useDashboardCharts,
	usePropertyPerformance
} from '#hooks/api/use-owner-dashboard'
import {
	useConnectedAccount,
	useCreateConnectedAccountMutation
} from '#hooks/api/use-stripe-connect'
import { X } from 'lucide-react'
import { DashboardLoadingSkeleton } from './components/dashboard-loading-skeleton'
import { DashboardEmptyState } from './components/dashboard-empty-state'
import '../dashboard.css'

/**
 * Dashboard Content - Wires API hooks to Dashboard UI component
 */
function DashboardContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [bannerDismissed, setBannerDismissed] = useState(false)

	// Stripe Connect hooks
	const { data: connectedAccount } = useConnectedAccount()
	const { mutate: startOnboarding, isPending: isOnboarding } = useCreateConnectedAccountMutation()

	// Return-journey toast: detect ?stripe_connect=success on mount
	useEffect(() => {
		if (searchParams.get('stripe_connect') === 'success') {
			toast.success('Stripe account connected — verification pending')
			const url = new URL(window.location.href)
			url.searchParams.delete('stripe_connect')
			window.history.replaceState({}, '', url.toString())
		}
	}, [searchParams])

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
			{/* Stripe Connect incomplete verification banner */}
			{connectedAccount && !connectedAccount.charges_enabled && !bannerDismissed && (
				<div className="px-6 pt-4">
					<Alert className="border-warning/20 bg-warning/10 flex items-center justify-between gap-3">
						<AlertDescription className="col-start-1">
							Your Stripe account requires additional verification before you can receive payments.
						</AlertDescription>
						<div className="flex items-center gap-2 shrink-0 col-start-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => startOnboarding({})}
								disabled={isOnboarding}
								className="min-h-11"
							>
								Complete verification
							</Button>
							<button
								type="button"
								aria-label="Dismiss banner"
								className="p-2 hover:opacity-70 rounded"
								onClick={() => setBannerDismissed(true)}
							>
								<X className="h-4 w-4" aria-hidden="true" />
							</button>
						</div>
					</Alert>
				</div>
			)}
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
