/**
 * React 19 use() Hook + TanStack Query Hybrid Dashboard Hooks
 * OVERWRITTEN: Demonstrates React 19 native use() hook promise streaming
 * + TanStack Query for caching when needed
 * + Direct promise consumption via use() hook for streaming data
 */
import { 
	useQuery, 
	useSuspenseQuery,
	type UseQueryResult,
	type UseSuspenseQueryResult 
} from '@tanstack/react-query'
import { logger } from '@/lib/logger/logger'
import { dashboardApi, type UpcomingTask } from '@/lib/api/dashboard'
import { queryKeys } from '@/lib/react-query/query-keys'
import { apiClient } from '@/lib/api-client'
import type { DashboardStats, ActivityItem } from '@repo/shared'

/**
 * Fetch dashboard overview statistics
 */
export function useDashboardOverview(options?: {
	enabled?: boolean
	refetchInterval?: number
}): UseQueryResult<DashboardStats> {
	return useQuery({
		queryKey: queryKeys.dashboard.overview(),
		queryFn: async () => {
			try {
				const response = await dashboardApi.getOverview()
				return response
			} catch {
				// Return default data on error to allow UI to render
				logger.warn(
					'Dashboard overview API unavailable, using defaults',
					{
						component: 'useDashboardOverview'
					}
				)
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
}): UseQueryResult<ActivityItem[]> {
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
}): UseQueryResult<UpcomingTask[]> {
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
}): UseQueryResult<unknown[]> {
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

// ==================
// REACT 19 use() HOOK PROMISE STREAMING PATTERNS
// ==================

/**
 * NATIVE React 19: Direct promise for dashboard overview statistics
 * Components can consume this promise directly with use() hook
 * 
 * Example usage in component:
 * ```tsx
 * import { use } from 'react'
 * 
 * function DashboardOverview() {
 *   const stats = use(createDashboardOverviewPromise())
 *   return <div>Properties: {stats.properties.totalProperties}</div>
 * }
 * ```
 */
export function createDashboardOverviewPromise(): Promise<DashboardStats> {
	return apiClient.promise<DashboardStats>('/dashboard/overview')
}

/**
 * NATIVE React 19: Direct promise for recent activity
 * Eliminates TanStack Query when you don't need caching
 */
export function createDashboardActivityPromise(): Promise<ActivityItem[]> {
	return apiClient.promise<ActivityItem[]>('/dashboard/activity')
}

/**
 * NATIVE React 19: Direct promise for upcoming tasks
 * Stream data directly to components without hooks layer
 */
export function createUpcomingTasksPromise(): Promise<UpcomingTask[]> {
	return apiClient.promise<UpcomingTask[]>('/dashboard/tasks')
}

/**
 * NATIVE React 19: Direct promise for dashboard alerts
 * Components can use this for real-time streaming updates
 */
export function createDashboardAlertsPromise(): Promise<unknown[]> {
	return apiClient.promise<unknown[]>('/dashboard/alerts')
}

/**
 * HYBRID React 19 + TanStack Query: Best of both worlds
 * Use Suspense for guaranteed data + use() for promise streaming
 */
export function useDashboardOverviewSuspense(): UseSuspenseQueryResult<DashboardStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.dashboard.overview(),
		queryFn: async () => dashboardApi.getOverview(),
		staleTime: 2 * 60 * 1000,
		gcTime: 5 * 60 * 1000
	})
}

/**
 * STREAM-FIRST React 19: Promise factory for real-time dashboard
 * Creates fresh promises for use() hook consumption
 * Perfect for components that need latest data always
 */
export function streamDashboardData() {
	return {
		overview: () => createDashboardOverviewPromise(),
		activity: () => createDashboardActivityPromise(), 
		tasks: () => createUpcomingTasksPromise(),
		alerts: () => createDashboardAlertsPromise()
	}
}
