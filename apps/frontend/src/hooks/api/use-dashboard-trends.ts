'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  MetricTrend,
  TimeSeriesDataPoint,
  DashboardTrendData,
  DashboardTimeSeriesOptions,
} from '@repo/shared/types/dashboard-repository'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

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

      const res = await fetch(
        `${API_BASE_URL}/api/v1/manage/metric-trend?metric=${metric}&period=${period}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Failed to fetch metric trend')
      const response = await res.json()
      return response.data as MetricTrend
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

      const res = await fetch(
        `${API_BASE_URL}/api/v1/manage/time-series?metric=${metric}&days=${days}`,
        { credentials: 'include' }
      )
      if (!res.ok) throw new Error('Failed to fetch time-series data')
      const response = await res.json()
      return response.data || []
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

      // Fetch all trends in parallel via backend API
      const [occupancyRate, activeTenants, monthlyRevenue, openMaintenance] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/manage/metric-trend?metric=occupancy_rate&period=month`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/v1/manage/metric-trend?metric=active_tenants&period=month`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/v1/manage/metric-trend?metric=monthly_revenue&period=month`, {
          credentials: 'include'
        }).then(r => r.json()),
        fetch(`${API_BASE_URL}/api/v1/manage/metric-trend?metric=open_maintenance&period=month`, {
          credentials: 'include'
        }).then(r => r.json()),
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
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
