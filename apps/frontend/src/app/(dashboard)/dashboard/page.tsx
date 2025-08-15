import { Suspense } from 'react'
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import { 
  OnboardingBanner, 
  DashboardStats, 
  PropertiesTable, 
  QuickActions 
} from '@/components/dashboard/dashboard-client'
import { EnhancedDashboardWidgets } from '@/components/dashboard/enhanced-dashboard-widgets'
import { DashboardTracker } from '@/components/analytics/dashboard-tracker'

export const metadata = {
  title: 'Dashboard | TenantFlow',
  description: 'Comprehensive property management dashboard with analytics and insights',
}

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <DashboardTracker />
      <div className="flex-1 space-y-8 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Enhanced Page Header */}
        <div className="relative">
          {/* Background gradient effect */}
          <div className="absolute -inset-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl opacity-40 blur-2xl" />
          
          <div className="relative space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-muted-foreground text-lg font-medium">
                  Welcome back! Here's an overview of your property portfolio.
                </p>
              </div>
              
              {/* Quick stats in header */}
              <div className="hidden lg:flex items-center gap-6">
                <div className="text-center card-modern p-3 bg-blue-50 border-blue-200">
                  <div className="text-2xl font-bold text-primary">98%</div>
                  <div className="text-xs font-medium text-primary/70">Uptime</div>
                </div>
                <div className="text-center card-modern p-3 bg-green-50 border-green-200">
                  <div className="text-2xl font-bold text-green-600">$24.5K</div>
                  <div className="text-xs font-medium text-green-600/70">This Month</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Banner for new users */}
        <Suspense fallback={
          <div className="card-modern h-32 animate-pulse bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border" />
        }>
          <OnboardingBanner />
        </Suspense>

        {/* Enhanced Stats Grid */}
        <Suspense fallback={
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card-modern h-32 animate-pulse bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border" />
            ))}
          </div>
        }>
          <DashboardStats />
        </Suspense>

        {/* Enhanced Dashboard Widgets */}
        <Suspense fallback={
          <div className="card-modern h-96 animate-pulse bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border" />
        }>
          <EnhancedDashboardWidgets />
        </Suspense>

        {/* Enhanced Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-3">
          {/* Properties Table - Takes up 2 columns on larger screens */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="card-modern h-80 animate-pulse bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border" />
            }>
              <PropertiesTable />
            </Suspense>
          </div>

          {/* Quick Actions - Takes up 1 column */}
          <div className="lg:col-span-1">
            <Suspense fallback={
              <div className="card-modern h-80 animate-pulse bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border" />
            }>
              <QuickActions />
            </Suspense>
          </div>
        </div>

        {/* Additional Dashboard Insights Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Placeholder for future analytics widgets */}
          <div className="card-modern bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Revenue Analytics</h3>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">Coming Soon</div>
            </div>
            <div className="space-y-3">
              <div className="h-2 bg-blue-200 rounded-lg animate-pulse" />
              <div className="h-2 bg-blue-200 rounded-lg animate-pulse w-3/4" />
              <div className="h-2 bg-blue-200 rounded-lg animate-pulse w-1/2" />
            </div>
          </div>
          
          <div className="card-modern bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Maintenance Trends</h3>
              <div className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">Coming Soon</div>
            </div>
            <div className="space-y-3">
              <div className="h-2 bg-green-200 rounded-lg animate-pulse" />
              <div className="h-2 bg-green-200 rounded-lg animate-pulse w-2/3" />
              <div className="h-2 bg-green-200 rounded-lg animate-pulse w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}