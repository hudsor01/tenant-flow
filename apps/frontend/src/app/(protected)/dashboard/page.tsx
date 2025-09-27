'use client'

import { ChartAreaInteractive } from '@/components/dashboard-01/chart-area-interactive'
import { SectionCards } from '@/components/dashboard-01/section-cards'
import { ActivityFeed } from '@/components/dashboard-01/activity-feed'
import { PropertyPerformanceTable } from '@/components/dashboard-01/property-performance-table'
import { QuickActions } from '@/components/dashboard-01/quick-actions'
import { useDashboardPageData } from '@/hooks/api/use-dashboard'
import { PageLoader } from '@/components/magicui/loading-spinner'

export default function Page() {
	// Use TanStack Query for client-side data fetching with proper auth
	const { dashboardStats, propertyStats, leaseStats, isLoading, error } = useDashboardPageData()

	// Show loading state while data is fetching
	if (isLoading) {
		return <PageLoader text="Loading dashboard..." />
	}

	// Show error state if any queries failed
	if (error) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">Failed to load dashboard data</h2>
					<p className="text-muted-foreground">Please try refreshing the page</p>
				</div>
			</div>
		)
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			{/* Top Metrics Cards Section */}
			<div className="border-b bg-background px-4 py-6 lg:px-6 lg:py-8">
				<div className="mx-auto max-w-[1600px]">
					<SectionCards
						dashboardStats={dashboardStats}
						propertyStats={propertyStats}
						leaseStats={leaseStats}
					/>
				</div>
			</div>

			{/* Main Content Area with Professional Grid Layout */}
			<div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
				<div className="mx-auto max-w-[1600px] space-y-8">
					{/* Primary Chart Section - Full Width Focal Point */}
					<div className="w-full">
						<ChartAreaInteractive className="w-full" />
					</div>

					{/* Two-Column Layout for Secondary Content */}
					<div className="grid gap-8 lg:grid-cols-3">
						{/* Main Content Area - 2/3 Width */}
						<div className="lg:col-span-2">
							<div className="space-y-6">
								{/* Recent Activity Section */}
								<div className="rounded-lg border bg-card">
									<div className="border-b px-6 py-4">
										<h3 className="text-lg font-semibold">Recent Activity</h3>
										<p className="text-sm text-muted-foreground">Latest updates across your properties</p>
									</div>
									<div className="p-6">
										<ActivityFeed />
									</div>
								</div>

								{/* Property Performance Summary */}
								<div className="rounded-lg border bg-card">
									<div className="border-b px-6 py-4">
										<h3 className="text-lg font-semibold">Property Performance</h3>
										<p className="text-sm text-muted-foreground">Top performing properties this month</p>
									</div>
									<div className="p-6">
										<PropertyPerformanceTable />
									</div>
								</div>
							</div>
						</div>

						{/* Sidebar - 1/3 Width */}
						<div className="space-y-6">
							{/* Quick Actions */}
							<div className="rounded-lg border bg-card">
								<div className="border-b px-6 py-4">
									<h3 className="text-lg font-semibold">Quick Actions</h3>
								</div>
								<div className="p-6">
									<QuickActions />
								</div>
							</div>

						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
