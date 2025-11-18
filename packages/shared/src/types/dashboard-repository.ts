import type { DashboardStats, PropertyPerformance, SystemUptime } from './core.js'
import type { Activity } from './activity.js'



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
  getStats(user_id: string): Promise<DashboardStats>
  getActivity(user_id: string, options?: { limit?: number; offset?: number }): Promise<{ activities: Activity[] }>
  getPropertyPerformance(user_id: string): Promise<PropertyPerformance[]>
  getUptime(): Promise<SystemUptime>
  isBillingInsightsAvailable(): Promise<boolean>
  getMetricTrend(user_id: string, metric: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<MetricTrend>
  getTimeSeries(user_id: string, options: DashboardTimeSeriesOptions): Promise<TimeSeriesDataPoint[]>
  getTrendData(user_id: string): Promise<DashboardTrendData>
}
