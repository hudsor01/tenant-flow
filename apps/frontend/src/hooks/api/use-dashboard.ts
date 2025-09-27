/**
 * TanStack Query hooks for dashboard data
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi, API_BASE_URL } from '@/lib/api-client'
import { apiClient } from '@repo/shared'
import type { TenantStats, LeaseStatsResponse } from '@repo/shared'

/**
 * Query keys for dashboard endpoints
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  propertyPerformance: () => [...dashboardKeys.all, 'property-performance'] as const,
  uptime: () => [...dashboardKeys.all, 'uptime'] as const,
  propertyStats: () => [...dashboardKeys.all, 'property-stats'] as const,
  tenantStats: () => [...dashboardKeys.all, 'tenant-stats'] as const,
  leaseStats: () => [...dashboardKeys.all, 'lease-stats'] as const,
  financialChart: (timeRange: string) => [...dashboardKeys.all, 'financial-chart', timeRange] as const,
}

/**
 * Hook to fetch dashboard statistics with 30-second auto-refresh
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardApi.getStats,
    staleTime: 30 * 1000, // 30 seconds - data considered fresh for this period
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing when tab not active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Always fetch fresh data on component mount
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  })
}

/**
 * Hook to fetch dashboard activity with 60-second auto-refresh
 */
export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: dashboardApi.getActivity,
    staleTime: 60 * 1000, // 1 minute - data considered fresh for this period
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    refetchIntervalInBackground: true, // Continue refreshing when tab not active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Always fetch fresh data on component mount
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  })
}

/**
 * Hook to fetch property performance metrics with 30-second auto-refresh
 * Returns sorted array of property performance data (sorted by occupancy rate desc, then units desc)
 */
export function usePropertyPerformance() {
  return useQuery({
    queryKey: dashboardKeys.propertyPerformance(),
    queryFn: dashboardApi.getPropertyPerformance,
    staleTime: 30 * 1000, // 30 seconds - data considered fresh for this period
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing when tab not active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Always fetch fresh data on component mount
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  })
}

/**
 * Hook to fetch system uptime metrics with 5-minute auto-refresh
 * Returns current system uptime and SLA status
 */
export function useSystemUptime() {
  return useQuery({
    queryKey: dashboardKeys.uptime(),
    queryFn: dashboardApi.getUptime,
    staleTime: 5 * 60 * 1000, // 5 minutes - uptime data doesn't change frequently
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: false, // No need to refresh in background for uptime
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Always fetch fresh data on component mount
    retry: 1, // Only retry once for uptime data
    retryDelay: 2000, // 2 second delay for retry
  })
}

/**
 * Hook to fetch property stats with TanStack Query
 */
export function usePropertyStats() {
  return useQuery({
    queryKey: dashboardKeys.propertyStats(),
    queryFn: async () => {
      return await apiClient<{
        totalProperties: number
        totalUnits: number
        occupiedUnits: number
        occupancyRate: number
        totalRevenue: number
        vacantUnits: number
        maintenanceUnits: number
      }>(`${API_BASE_URL}/api/v1/properties/stats`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

/**
 * Hook to fetch tenant stats with TanStack Query
 */
export function useTenantStats() {
  return useQuery({
    queryKey: dashboardKeys.tenantStats(),
    queryFn: async (): Promise<TenantStats> => {
      return await apiClient<TenantStats>(`${API_BASE_URL}/api/v1/tenants/stats`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

/**
 * Hook to fetch lease stats with TanStack Query
 */
export function useLeaseStats() {
  return useQuery({
    queryKey: dashboardKeys.leaseStats(),
    queryFn: async (): Promise<LeaseStatsResponse> => {
      return await apiClient<LeaseStatsResponse>(`${API_BASE_URL}/api/v1/leases/stats`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

/**
 * Hook to fetch financial chart data for revenue/expenses over time
 * Uses the revenue-trends endpoint and maps the response to chart format
 */
export function useFinancialChartData(timeRange: string = '6m') {
  return useQuery({
    queryKey: dashboardKeys.financialChart(timeRange),
    queryFn: async () => {
      // Map timeRange to year for the revenue-trends endpoint
      const currentYear = new Date().getFullYear()
      const data = await apiClient<{ date: string, revenue: number, expenses: number, profit: number }[]>(`${API_BASE_URL}/api/v1/financial/analytics/revenue-trends?year=${currentYear}`)

      // Transform the response to the expected chart format
      // If data is an array, use it directly, otherwise create mock data
      if (Array.isArray(data)) {
        return data.map((item: { date?: string, month?: string, revenue?: number, totalRevenue?: number, expenses?: number, totalExpenses?: number, profit?: number }) => ({
          date: item.date || item.month || '',
          revenue: item.revenue || item.totalRevenue || 0,
          expenses: item.expenses || item.totalExpenses || 0,
          profit: (item.revenue || item.totalRevenue || 0) - (item.expenses || item.totalExpenses || 0)
        }))
      }

      // Return empty array if no data
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}


/**
 * Combined hook for all dashboard data needed by the main dashboard page
 */
export function useDashboardPageData() {
  const dashboardStats = useDashboardStats()
  const propertyStats = usePropertyStats()
  const tenantStats = useTenantStats()
  const leaseStats = useLeaseStats()
  const activity = useDashboardActivity()

  return {
    dashboardStats: dashboardStats.data,
    propertyStats: propertyStats.data,
    tenantStats: tenantStats.data,
    leaseStats: leaseStats.data,
    activity: activity.data,
    isLoading: dashboardStats.isLoading || propertyStats.isLoading || tenantStats.isLoading || leaseStats.isLoading || activity.isLoading,
    error: dashboardStats.error || propertyStats.error || tenantStats.error || leaseStats.error || activity.error,
    isRefetching: dashboardStats.isRefetching || propertyStats.isRefetching || tenantStats.isRefetching || leaseStats.isRefetching || activity.isRefetching
  }
}