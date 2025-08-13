'use client'

import { DashboardOnboarding } from './dashboard-onboarding'
import { DashboardStatsCards } from './dashboard-stats-cards'
import { DashboardRecentActivity } from './dashboard-recent-activity'

/**
 * Dashboard Client Component - Refactored
 * 
 * Previously: 565-line massive client component violating React 19 principles
 * Now: Focused orchestration component using smaller, specialized components
 * 
 * Follows React 19 best practices:
 * - Single responsibility (orchestration only)
 * - Composed of focused child components
 * - Each child handles its own concern
 */
export function DashboardClientRefactored() {
  return (
    <div className="space-y-6">
      {/* Onboarding flow for new users */}
      <DashboardOnboarding />
      
      {/* Key metrics and statistics */}
      <DashboardStatsCards />
      
      {/* Recent activity and quick actions */}
      <DashboardRecentActivity />
    </div>
  )
}