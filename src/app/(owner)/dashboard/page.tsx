"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";
import type { KpiBentoRowProps } from "#components/dashboard/components/kpi-helpers";
import { Dashboard } from "#components/dashboard/dashboard";
import { ExpiringLeasesWidget } from "#components/dashboard/expiring-leases-widget";
import { ErrorBoundary } from "#components/error-boundary/error-boundary";
import { OnboardingWizard } from "#components/onboarding/onboarding-wizard";
import { OwnerOnboardingTour } from "#components/tours/owner-onboarding-tour";
import {
	useDashboardCharts,
	useDashboardStats,
	usePropertyPerformance,
} from "#hooks/api/use-dashboard-hooks";
import { DashboardEmptyState } from "./components/dashboard-empty-state";
import { DashboardLoadingSkeleton } from "./components/dashboard-loading-skeleton";
import "../dashboard.css";

/**
 * Dashboard Content - Wires API hooks to Dashboard UI component
 */
function DashboardContent() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// Return-journey toast: detect ?billing=updated after Stripe Customer Portal return
	useEffect(() => {
		if (searchParams.get("billing") === "updated") {
			toast.success("Subscription updated");
			const url = new URL(window.location.href);
			url.searchParams.delete("billing");
			window.history.replaceState({}, "", url.toString());
		}
	}, [searchParams]);

	// API Hooks
	const {
		data: statsData,
		isLoading: statsLoading,
		isError: statsError,
	} = useDashboardStats();
	const {
		data: chartsData,
		isLoading: chartsLoading,
		isError: chartsError,
	} = useDashboardCharts();
	const { data: performanceData, isLoading: performanceLoading } =
		usePropertyPerformance();

	// Phase 3 KPI bento row — construct from existing hook returns (no new fetcher)
	const kpiData: KpiBentoRowProps = {
		isLoading: statsLoading || chartsLoading,
		stats: statsData?.stats ?? null,
		metricTrends: statsData?.metricTrends ?? null,
		timeSeries: chartsData?.timeSeries ?? null,
	};

	// Transform revenue trends
	const revenueTrend = (() => {
		if (!chartsData?.timeSeries?.monthlyRevenue) return [];

		return chartsData.timeSeries.monthlyRevenue.map((point) => ({
			month: point.date,
			revenue: point.value,
		}));
	})();

	// Transform property performance
	const propertyPerformance = (() => {
		if (!performanceData) return [];

		return performanceData.map((prop) => ({
			id: prop.property_id,
			name: prop.property,
			address: prop.address_line1,
			totalUnits: prop.totalUnits,
			occupiedUnits: prop.occupiedUnits,
			occupancyRate: prop.occupancyRate,
			monthlyRevenue: prop.monthlyRevenue,
			openMaintenance: prop.open_maintenance ?? 0,
		}));
	})();

	// Navigation callbacks
	const onAddProperty = () => {
		router.push("/properties/new");
	};

	const onCreateLease = () => {
		router.push("/leases/new");
	};

	const onAddTenant = () => {
		router.push("/tenants/new");
	};

	const onCreateMaintenanceRequest = () => {
		router.push("/maintenance/new");
	};

	// Loading state
	const isLoading = statsLoading || chartsLoading || performanceLoading;

	if (isLoading) {
		return <DashboardLoadingSkeleton />;
	}

	// Error state - show actionable error instead of misleading empty state
	if (statsError || chartsError) {
		return (
			<div
				data-testid="dashboard-stats"
				className="flex flex-1 items-center justify-center p-6"
			>
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
		);
	}

	// Check for empty state
	const isEmpty =
		!statsData?.stats ||
		((statsData.stats.properties?.total ?? 0) === 0 &&
			(statsData.stats.tenants?.total ?? 0) === 0);

	if (isEmpty) {
		return <DashboardEmptyState />;
	}

	return (
		<div className="flex flex-1 flex-col">
			<Dashboard
				kpiData={kpiData}
				revenueTrend={revenueTrend}
				propertyPerformance={propertyPerformance}
				onAddProperty={onAddProperty}
				onCreateLease={onCreateLease}
				onAddTenant={onAddTenant}
				onCreateMaintenanceRequest={onCreateMaintenanceRequest}
			/>
			<div className="px-6 lg:px-8 pb-6 lg:pb-8">
				<ExpiringLeasesWidget />
			</div>
		</div>
	);
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
	);
}
