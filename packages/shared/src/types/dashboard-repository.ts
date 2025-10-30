import type { DashboardStats, PropertyPerformance, SystemUptime } from './core.js'
import type { Activity } from './activity.js'
import type { ActivityQueryOptions } from './activity-repository.js'

export interface BillingInsightsOptions {
  startDate?: Date
  endDate?: Date
}

export interface MetricTrend {
  current: number
  previous: number | null
  change: number
  percentChange: number
}

export interface TimeSeriesDataPoint {
  date: string
  value: number
}

export interface DashboardTrendData {
  occupancyRate: MetricTrend
  activeTenants: MetricTrend
  monthlyRevenue: MetricTrend
  openMaintenance: MetricTrend
}

export interface DashboardTimeSeriesOptions {
  metric: 'occupancy_rate' | 'active_tenants' | 'monthly_revenue' | 'total_maintenance' | 'open_maintenance'
  days?: number
}

export interface DashboardRepositoryContract {
  getStats(userId: string): Promise<DashboardStats>
  getActivity(userId: string, options?: ActivityQueryOptions): Promise<{ activities: Activity[] }>
  getPropertyPerformance(userId: string): Promise<PropertyPerformance[]>
  getUptime(): Promise<SystemUptime>
  getBillingInsights(userId: string, options?: BillingInsightsOptions): Promise<Record<string, unknown>>
  isBillingInsightsAvailable(): Promise<boolean>
  getMetricTrend(userId: string, metric: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<MetricTrend>
  getTimeSeries(userId: string, options: DashboardTimeSeriesOptions): Promise<TimeSeriesDataPoint[]>
  getTrendData(userId: string): Promise<DashboardTrendData>
}
