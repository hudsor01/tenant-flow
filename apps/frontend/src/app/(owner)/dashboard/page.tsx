'use client'

import { ErrorBoundary } from '#components/error-boundary/error-boundary'
import { ActivitySection } from '#components/dashboard/activity-section'
import { ChartsSection } from '#components/dashboard/charts-section'
import { PerformanceSection } from '#components/dashboard/performance-section'
import { QuickActionsSection } from '#components/dashboard/quick-actions-section'
import { SectionCards } from '#components/dashboard/section-cards'
import { TrendsSection } from '#components/dashboard/trends-section'
import { OwnerOnboardingTour, OwnerTourTrigger } from '#components/tours'
import { DashboardProvider } from '#contexts/dashboard-context'
import '../dashboard.css'

/**
 * Owner Dashboard Homepage
 * URL: /dashboard
 *
 * This is the main owner dashboard page showing portfolio overview,
 * trends, quick actions, and analytics.
 *
 * Auth: Protected by middleware role checks
 */
export default function DashboardPage() {
	// Auth handled by middleware + layout - no SSR delay

	return (
		<DashboardProvider>
			<OwnerOnboardingTour />
			<div
				className="dashboard-root @container/main flex min-h-screen w-full flex-col bg-(--background)"
			>
				<div className="dashboard-main border-b border-(--border) bg-(--card)">
					<div className="dashboard-section mx-auto max-w-400 px-(--layout-container-padding-x) py-(--spacing-6)">
						<div className="flex-between">
							<h1 className="text-responsive-display-xl font-black tracking-tight text-(--foreground)">
								Dashboard
							</h1>
							<OwnerTourTrigger />
						</div>
						<div data-testid="dashboard-stats">
							<ErrorBoundary
								fallback={
									<div className="dashboard-panel p-4">
										<p className="text-responsive-sm text-(--muted-foreground)">
											Unable to load dashboard stats
										</p>
									</div>
								}
							>
								<SectionCards />
							</ErrorBoundary>
						</div>
					</div>
				</div>
				<div className="dashboard-main flex-1 py-(--spacing-6) px-(--layout-container-padding-x)">
					<div className="dashboard-content mx-auto max-w-400">
						{/* Trends & Performance Cards */}
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-4">
									<p className="text-responsive-sm text-(--muted-foreground)">
										Unable to load trends section
									</p>
								</div>
							}
						>
							<TrendsSection />
						</ErrorBoundary>

						{/* Quick Actions - Moved higher for visibility */}
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-4">
									<p className="text-responsive-sm text-(--muted-foreground)">
										Unable to load quick actions
									</p>
								</div>
							}
						>
							<QuickActionsSection />
						</ErrorBoundary>

						{/* Portfolio Analytics Charts */}
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-4">
									<p className="text-responsive-sm text-(--muted-foreground)">
										Unable to load charts section
									</p>
								</div>
							}
						>
							<ChartsSection />
						</ErrorBoundary>

						{/* Activity and Performance Sections */}
						<div className="dashboard-grid">
							<ErrorBoundary
								fallback={
									<div className="dashboard-panel p-4">
										<p className="text-responsive-sm text-(--muted-foreground)">
											Unable to load activity feed
										</p>
									</div>
								}
							>
								<ActivitySection />
							</ErrorBoundary>

							<ErrorBoundary
								fallback={
									<div className="dashboard-panel p-4">
										<p className="text-responsive-sm text-(--muted-foreground)">
											Unable to load performance section
										</p>
									</div>
								}
							>
								<PerformanceSection />
							</ErrorBoundary>
						</div>
					</div>
				</div>
			</div>
		</DashboardProvider>
	)
}
