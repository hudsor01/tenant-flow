'use client'

/**
 * Dashboard Trends Hooks
 *
 * DEPRECATED: These hooks use the legacy /manage endpoints.
 * For new development, use hooks from use-owner-dashboard.ts which use /owner/reports endpoints.
 *
 * Migration Guide:
 * - useMetricTrend(user_id, metric, period) → useOwnerMetricTrend(metric, period)
 * - useDashboardTimeSeries(user_id, options) → useOwnerTimeSeries(options)
 * - useDashboardTrendData(user_id) → Use multiple useOwnerMetricTrend() calls
 *
 * Example:
 * ```typescript
 * // OLD
 * const { data } = useMetricTrend(user_id, 'occupancy_rate', 'month')
 *
 * // NEW
 * const { data } = useOwnerMetricTrend('occupancy_rate', 'month')
 * ```
 */

import { useQuery } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type {
  MetricTrend,
  TimeSeriesDataPoint,
  DashboardTrendData,
  DashboardTimeSeriesOptions,
} from '@repo/shared/types/dashboard-repository'
import { clientFetch } from '#lib/api/client'

export const dashboardTrendKeys = {
  all: ['dashboard-trends'] as const,
  metricTrend: (user_id: string, metric: string, period: string) =>
    [...dashboardTrendKeys.all, 'metric-trend', user_id, metric, period] as const,
  timeSeries: (user_id: string, metric: string, days: number) =>
    [...dashboardTrendKeys.all, 'time-series', user_id, metric, days] as const,
  trendData: (user_id: string) => [...dashboardTrendKeys.all, 'trend-data', user_id] as const,
}

/**
 * Get trend data for a specific metric
 */
export function useMetricTrend(
  user_id: string | undefined,
  metric: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
  return useQuery({
    queryKey: dashboardTrendKeys.metricTrend(user_id ?? '', metric, period),
    queryFn: async (): Promise<MetricTrend> => {
      if (!user_id) throw new Error('User ID required')

      const response = await clientFetch<{ data: MetricTrend }>(
        `/api/v1/manage/metric-trend?metric=${metric}&period=${period}`
      )
      return response.data as MetricTrend
    },
    enabled: !!user_id,
    ...QUERY_CACHE_TIMES.DETAIL,
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get time series data for charts
 */
export function useDashboardTimeSeries(
  user_id: string | undefined,
  options: DashboardTimeSeriesOptions
) {
  const { metric, days = 30 } = options

  return useQuery({
    queryKey: dashboardTrendKeys.timeSeries(user_id ?? '', metric, days),
    queryFn: async (): Promise<TimeSeriesDataPoint[]> => {
      if (!user_id) throw new Error('User ID required')

      const response = await clientFetch<{ data: TimeSeriesDataPoint[] }>(
        `/api/v1/manage/time-series?metric=${metric}&days=${days}`
      )
      return response.data || []
    },
    enabled: !!user_id,
    ...QUERY_CACHE_TIMES.DETAIL,
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get all trend data at once (occupancy, tenants, revenue, maintenance)
 */
export function useDashboardTrendData(user_id: string | undefined) {
  return useQuery({
    queryKey: dashboardTrendKeys.trendData(user_id ?? ''),
    queryFn: async (): Promise<DashboardTrendData> => {
      if (!user_id) throw new Error('User ID required')

      // Fetch all trends in parallel via backend API
      const [occupancyRate, activeTenants, monthlyRevenue, openMaintenance] = await Promise.all([
        clientFetch<{ success: boolean; data: MetricTrend }>('/api/v1/manage/metric-trend?metric=occupancy_rate&period=month'),
        clientFetch<{ success: boolean; data: MetricTrend }>('/api/v1/manage/metric-trend?metric=active_tenants&period=month'),
        clientFetch<{ success: boolean; data: MetricTrend }>('/api/v1/manage/metric-trend?metric=monthly_revenue&period=month'),
        clientFetch<{ success: boolean; data: MetricTrend }>('/api/v1/manage/metric-trend?metric=open_maintenance&period=month'),
      ])

      if (!occupancyRate.success) throw new Error('Failed to fetch occupancy rate trend')
      if (!activeTenants.success) throw new Error('Failed to fetch active tenants trend')
      if (!monthlyRevenue.success) throw new Error('Failed to fetch monthly revenue trend')
      if (!openMaintenance.success) throw new Error('Failed to fetch open maintenance trend')

      return {
        occupancyRate: occupancyRate.data as MetricTrend,
        activeTenants: activeTenants.data as MetricTrend,
        monthlyRevenue: monthlyRevenue.data as MetricTrend,
        openMaintenance: openMaintenance.data as MetricTrend,
      }
    },
    enabled: !!user_id,
    ...QUERY_CACHE_TIMES.DETAIL,
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
