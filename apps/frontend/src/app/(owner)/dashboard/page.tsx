'use client'

import { ErrorBoundary } from '#components/ui/error-boundary'
import { ActivitySection } from '#components/dashboard/activity-section'
import { ChartsSection } from '#components/dashboard/charts-section'
import { PerformanceSection } from '#components/dashboard/performance-section'
import { QuickActionsSection } from '#components/dashboard/quick-actions-section'
import { SectionCards } from '#components/dashboard/section-cards'
import { TrendsSection } from '#components/dashboard/trends-section'
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
		<div
			className="dashboard-root @container/main flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50"
		>
			<div className="dashboard-main border-b-2 border-slate-200/40 bg-gradient-to-b from-white via-slate-50/30 to-slate-100/20 dark:border-slate-700/40 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20">
				<div className="dashboard-section mx-auto max-w-400 px-(--layout-container-padding-x) py-(--layout-content-padding)">
					<h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-white">
						Dashboard
					</h1>
					<div data-testid="dashboard-stats">
						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-(--layout-content-padding-compact)">
									<p className="text-sm text-muted-foreground">
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
			<div className="dashboard-main flex-1 py-(--layout-content-padding) px-(--layout-container-padding-x)">
				<div className="dashboard-content mx-auto max-w-400">
					{/* Trends & Performance Cards */}
					<ErrorBoundary
						fallback={
							<div className="dashboard-panel p-(--layout-content-padding-compact)">
								<p className="text-sm text-muted-foreground">
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
							<div className="dashboard-panel p-(--layout-content-padding-compact)">
								<p className="text-sm text-muted-foreground">
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
							<div className="dashboard-panel p-(--layout-content-padding-compact)">
								<p className="text-sm text-muted-foreground">
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
								<div className="dashboard-panel p-(--layout-content-padding-compact)">
									<p className="text-sm text-muted-foreground">
										Unable to load activity feed
									</p>
								</div>
							}
						>
							<ActivitySection />
						</ErrorBoundary>

						<ErrorBoundary
							fallback={
								<div className="dashboard-panel p-(--layout-content-padding-compact)">
									<p className="text-sm text-muted-foreground">
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
	)
}
