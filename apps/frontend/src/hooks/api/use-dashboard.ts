import { apiClient } from '@/lib/api-client'
/**
 * React Query hooks for Dashboard
 * Native TanStack Query implementation - no custom abstractions
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { dashboardApi, type UpcomingTask } from '@/lib/api/dashboard'
import { queryKeys } from '@/lib/query-keys'
import type { DashboardStats, ActivityItem } from '@repo/shared'

/**
 * Fetch dashboard overview statistics
 */
export function useDashboardOverview(options?: {
  enabled?: boolean
  refetchInterval?: number
}): UseQueryResult<DashboardStats, Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: async () => {
      try {
        const response = await dashboardApi.getOverview()
        return response
      } catch {
        // Return default data on error to allow UI to render
        logger.warn('Dashboard overview API unavailable, using defaults', {
          component: 'useDashboardOverview'
        })
        return {
          properties: { totalProperties: 0, occupancyRate: 0 },
          tenants: { totalTenants: 0 },
          leases: { activeLeases: 0, expiredLeases: 0 },
          maintenanceRequests: { open: 0 }
        } as DashboardStats
      }
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })
}

/**
 * Fetch recent activity for the dashboard
 */
export function useDashboardActivity(options?: {
  enabled?: boolean
}): UseQueryResult<ActivityItem[], Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: async () => {
      try {
        return await dashboardApi.getRecentActivity()
      } catch {
        logger.warn('Dashboard activity API unavailable', {
          component: 'useDashboardActivity'
        })
        return [] // Return empty array on error
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Fetch upcoming tasks
 */
export function useUpcomingTasks(options?: {
  enabled?: boolean
}): UseQueryResult<UpcomingTask[], Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.tasks(),
    queryFn: async () => {
      try {
        return await dashboardApi.getUpcomingTasks()
      } catch {
        logger.warn('Dashboard tasks API unavailable', {
          component: 'useUpcomingTasks'
        })
        return [] // Return empty array on error
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}

/**
 * Fetch dashboard alerts
 */
export function useDashboardAlerts(options?: {
  enabled?: boolean
}): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: queryKeys.dashboard.alerts(),
    queryFn: async () => {
      try {
        return await dashboardApi.getAlerts()
      } catch {
        logger.warn('Dashboard alerts API unavailable', {
          component: 'useDashboardAlerts'
        })
        return [] // Return empty array on error
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000 // 5 minutes
  })
}