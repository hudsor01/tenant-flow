import type { DashboardStats, PropertyPerformance, SystemUptime } from './core.js'
import type { Activity } from './activity.js'
import type { ActivityQueryOptions } from './activity-repository.js'

export interface BillingInsightsOptions {
  startDate?: Date
  endDate?: Date
}

export interface DashboardRepositoryContract {
  getStats(userId: string): Promise<DashboardStats>
  getActivity(userId: string, options?: ActivityQueryOptions): Promise<{ activities: Activity[] }>
  getPropertyPerformance(userId: string): Promise<PropertyPerformance[]>
  getUptime(): Promise<SystemUptime>
  getBillingInsights(userId: string, options?: BillingInsightsOptions): Promise<Record<string, unknown>>
  isBillingInsightsAvailable(): Promise<boolean>
}
