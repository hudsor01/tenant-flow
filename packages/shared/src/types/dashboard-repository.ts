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