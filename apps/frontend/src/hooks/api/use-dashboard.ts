/**
 * TanStack Query hooks for dashboard data
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api-client'
import type { DashboardStats } from '@repo/shared'

/**
 * Query keys for dashboard endpoints
 */
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activity: () => [...dashboardKeys.all, 'activity'] as const,
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardApi.getStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch dashboard activity
 */
export function useDashboardActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity(),
    queryFn: dashboardApi.getActivity,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}