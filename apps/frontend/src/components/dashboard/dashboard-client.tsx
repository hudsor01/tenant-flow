'use client'

// Refactored dashboard components - now using focused, smaller components
// instead of one massive 565-line component
import { DashboardOnboarding } from './dashboard-onboarding'
import { DashboardStatsCards } from './dashboard-stats-cards'  
import { DashboardRecentActivity } from './dashboard-recent-activity'

/**
 * OnboardingBanner Component
 * Wrapper for the new focused DashboardOnboarding component
 * Maintains backward compatibility with existing imports
 */
export function OnboardingBanner() {
  return <DashboardOnboarding />
}

/**
 * DashboardStats Component  
 * Wrapper for the new focused DashboardStatsCards component
 * Maintains backward compatibility with existing imports
 */
export function DashboardStats() {
  return <DashboardStatsCards />
}

/**
 * PropertiesTable Component
 * Uses the properties section from DashboardRecentActivity
 * Maintains backward compatibility with existing imports
 */
export function PropertiesTable() {
  return <DashboardRecentActivity />
}

/**
 * QuickActions Component
 * Uses the quick actions section from DashboardRecentActivity  
 * Maintains backward compatibility with existing imports
 */
export function QuickActions() {
  return (
    <div className="grid gap-4 lg:grid-cols-1">
      <DashboardRecentActivity />
    </div>
  )
}

/**
 * Main Dashboard Client Component
 * Now properly focused and composed of smaller components
 * Reduced from 565 lines to ~50 lines following React 19 best practices
 */
export function DashboardClient() {
  return (
    <div className="space-y-6">
      <OnboardingBanner />
      <DashboardStats />
      <PropertiesTable />
      <QuickActions />
    </div>
  )
}