import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import { 
  OnboardingBanner, 
  DashboardStats, 
  RecentProperties, 
  QuickActions 
} from '@/components/dashboard/dashboard-client'

export const metadata = {
  title: 'Dashboard | TenantFlow',
  description: 'Property management dashboard overview',
}

export default function DashboardPage() {
  return (
    <DashboardErrorBoundary>
      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
        {/* Page Header with Brand Gradient */}
        <div className="relative space-y-0.5">
          <div 
            className="absolute -inset-4 opacity-30 rounded-xl blur-2xl"
            style={{ background: 'var(--gradient-brand-subtle)' }}
          />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-gradient-brand">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your properties.
            </p>
          </div>
        </div>

        {/* Onboarding Banner for new users */}
        <OnboardingBanner />

        {/* Main Stats Grid */}
        <DashboardStats />

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Properties */}
          <RecentProperties />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}