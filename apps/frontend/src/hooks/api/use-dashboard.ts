/**
 * TanStack Query hooks for dashboard data
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api-client'

/**
 * Query keys for dashboard endpoints
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
  propertyPerformance: () => [...dashboardKeys.all, 'property-performance'] as const,
  uptime: () => [...dashboardKeys.all, 'uptime'] as const,
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