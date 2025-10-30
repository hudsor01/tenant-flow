'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import type {
  MetricTrend,
  TimeSeriesDataPoint,
  DashboardTrendData,
  DashboardTimeSeriesOptions,
} from '@repo/shared/types/dashboard-repository'

export const dashboardTrendKeys = {
  all: ['dashboard-trends'] as const,
  metricTrend: (userId: string, metric: string, period: string) =>
    [...dashboardTrendKeys.all, 'metric-trend', userId, metric, period] as const,
  timeSeries: (userId: string, metric: string, days: number) =>
    [...dashboardTrendKeys.all, 'time-series', userId, metric, days] as const,
  trendData: (userId: string) => [...dashboardTrendKeys.all, 'trend-data', userId] as const,
}

/**
 * Get trend data for a specific metric
 */
export function useMetricTrend(
  userId: string | undefined,
  metric: string,
  period: 'day' | 'week' | 'month' | 'year' = 'month'
) {
  return useQuery({
    queryKey: dashboardTrendKeys.metricTrend(userId ?? '', metric, period),
    queryFn: async (): Promise<MetricTrend> => {
      if (!userId) throw new Error('User ID required')

      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_metric_trend', {
        p_user_id: userId,
        p_metric_name: metric,
        p_period: period,
      })

      if (error) throw error
      return data as MetricTrend
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get time series data for charts
 */
export function useDashboardTimeSeries(
  userId: string | undefined,
  options: DashboardTimeSeriesOptions
) {
  const { metric, days = 30 } = options

  return useQuery({
    queryKey: dashboardTrendKeys.timeSeries(userId ?? '', metric, days),
    queryFn: async (): Promise<TimeSeriesDataPoint[]> => {
      if (!userId) throw new Error('User ID required')

      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_dashboard_time_series', {
        p_user_id: userId,
        p_metric_name: metric,
        p_days: days,
      })

      if (error) throw error
      return (data as TimeSeriesDataPoint[]) || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get all trend data at once (occupancy, tenants, revenue, maintenance)
 */
export function useDashboardTrendData(userId: string | undefined) {
  return useQuery({
    queryKey: dashboardTrendKeys.trendData(userId ?? ''),
    queryFn: async (): Promise<DashboardTrendData> => {
      if (!userId) throw new Error('User ID required')

      const supabase = createClient()

      // Fetch all trends in parallel
      const [occupancyRate, activeTenants, monthlyRevenue, openMaintenance] = await Promise.all([
        supabase.rpc('get_metric_trend', {
          p_user_id: userId,
          p_metric_name: 'occupancy_rate',
          p_period: 'month',
        }),
        supabase.rpc('get_metric_trend', {
          p_user_id: userId,
          p_metric_name: 'active_tenants',
          p_period: 'month',
        }),
        supabase.rpc('get_metric_trend', {
          p_user_id: userId,
          p_metric_name: 'monthly_revenue',
          p_period: 'month',
        }),
        supabase.rpc('get_metric_trend', {
          p_user_id: userId,
          p_metric_name: 'open_maintenance',
          p_period: 'month',
        }),
      ])

      if (occupancyRate.error) throw occupancyRate.error
      if (activeTenants.error) throw activeTenants.error
      if (monthlyRevenue.error) throw monthlyRevenue.error
      if (openMaintenance.error) throw openMaintenance.error

      return {
        occupancyRate: occupancyRate.data as MetricTrend,
        activeTenants: activeTenants.data as MetricTrend,
        monthlyRevenue: monthlyRevenue.data as MetricTrend,
        openMaintenance: openMaintenance.data as MetricTrend,
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
