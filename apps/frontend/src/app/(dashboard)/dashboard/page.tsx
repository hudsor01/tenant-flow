import { Suspense } from 'react'
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import {
	OnboardingBanner,
	DashboardStats,
	PropertiesTable,
	QuickActions
} from '@/components/dashboard/dashboard-client'
import { DashboardWidgets } from '@/components/dashboard/dashboard-widgets'
import { DashboardTracker } from '@/components/analytics/dashboard-tracker'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Dashboard | TenantFlow',
	description:
		'Comprehensive property management dashboard with analytics and insights'
}

export default function DashboardPage() {
	return (
		<DashboardErrorBoundary>
			<DashboardTracker />
			<div className="mx-auto max-w-[1400px] flex-1 space-y-6 p-3 sm:space-y-8 sm:p-4 md:p-6 lg:p-8">
				{/* Enhanced Page Header */}
				<div className="relative">
					{/* Background gradient effect */}
					<div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 opacity-40 blur-2xl" />

					<div className="relative space-y-3">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<h1 className="from-foreground via-foreground/90 to-foreground/70 bg-gradient-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl md:text-4xl">
									Dashboard
								</h1>
								<p className="text-muted-foreground text-base font-medium sm:text-lg">
									Welcome back! Here&apos;s an overview of your
									property portfolio.
								</p>
							</div>

							{/* Quick stats in header */}
							<div className="hidden items-center gap-6 lg:flex">
								<div className="card-modern border-blue-200 bg-blue-50 p-3 text-center">
									<div className="text-primary text-2xl font-bold">
										98%
									</div>
									<div className="text-primary/70 text-xs font-medium">
										Uptime
									</div>
								</div>
								<div className="card-modern border-green-200 bg-green-50 p-3 text-center">
									<div className="text-2xl font-bold text-green-600">
										$24.5K
									</div>
									<div className="text-xs font-medium text-green-600/70">
										This Month
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Onboarding Banner for new users */}
				<Suspense
					fallback={
						<div className="card-modern from-muted/50 to-muted/30 h-32 animate-pulse rounded-xl border bg-gradient-to-br" />
					}
				>
					<OnboardingBanner />
				</Suspense>

				{/* Enhanced Stats Grid */}
				<Suspense
					fallback={
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{Array.from({ length: 4 }, (_, i) => (
								<div
									key={i}
									className="card-modern from-muted/40 to-muted/20 h-32 animate-pulse rounded-xl border bg-gradient-to-br"
								/>
							))}
						</div>
					}
				>
					<DashboardStats />
				</Suspense>

				{/* Enhanced Dashboard Widgets */}
				<Suspense
					fallback={
						<div className="card-modern from-muted/40 to-muted/20 h-96 animate-pulse rounded-xl border bg-gradient-to-br" />
					}
				>
					<DashboardWidgets />
				</Suspense>

				{/* Enhanced Content Grid */}
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-3">
					{/* Properties Table - Takes up 2 columns on larger screens */}
					<div className="lg:col-span-2">
						<Suspense
							fallback={
								<div className="card-modern from-muted/40 to-muted/20 h-80 animate-pulse rounded-xl border bg-gradient-to-br" />
							}
						>
							<PropertiesTable />
						</Suspense>
					</div>

					{/* Quick Actions - Takes up 1 column */}
					<div className="lg:col-span-1">
						<Suspense
							fallback={
								<div className="card-modern from-muted/40 to-muted/20 h-80 animate-pulse rounded-xl border bg-gradient-to-br" />
							}
						>
							<QuickActions />
						</Suspense>
					</div>
				</div>

				{/* Additional Dashboard Insights Row */}
				<div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
					{/* Placeholder for future analytics widgets */}
					<div className="card-modern rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-foreground text-lg font-semibold">
								Revenue Analytics
							</h3>
							<div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
								Coming Soon
							</div>
						</div>
						<div className="space-y-3">
							<div className="h-2 animate-pulse rounded-lg bg-blue-200" />
							<div className="h-2 w-3/4 animate-pulse rounded-lg bg-blue-200" />
							<div className="h-2 w-1/2 animate-pulse rounded-lg bg-blue-200" />
						</div>
					</div>

					<div className="card-modern rounded-xl border border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30 p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-foreground text-lg font-semibold">
								Maintenance Trends
							</h3>
							<div className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
								Coming Soon
							</div>
						</div>
						<div className="space-y-3">
							<div className="h-2 animate-pulse rounded-lg bg-green-200" />
							<div className="h-2 w-2/3 animate-pulse rounded-lg bg-green-200" />
							<div className="h-2 w-4/5 animate-pulse rounded-lg bg-green-200" />
						</div>
					</div>
				</div>
			</div>
		</DashboardErrorBoundary>
	)
}
