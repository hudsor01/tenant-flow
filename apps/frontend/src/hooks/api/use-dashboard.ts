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
// UpcomingTask type - define locally since API module doesn't exist
export type UpcomingTask = {
	id: string
	title: string
	dueDate: string
	priority: string
}
import { queryKeys } from '@/lib/react-query/query-keys'
import { get } from '@/lib/api-client'
import type { DashboardStats, ActivityItem } from '@repo/shared'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'

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
				const response = await get<DashboardStats>(API_ENDPOINTS.DASHBOARD.OVERVIEW)
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
					properties: { total: 0, owned: 0, rented: 0, available: 0, maintenance: 0 },
					tenants: { total: 0, active: 0, inactive: 0 },
					units: { total: 0, occupied: 0, vacant: 0, occupancyRate: 0, averageRent: 0, totalUnits: 0, availableUnits: 0, occupiedUnits: 0, maintenanceUnits: 0 },
					leases: { total: 0, active: 0, expired: 0, pending: 0, totalLeases: 0, activeLeases: 0, expiredLeases: 0, pendingLeases: 0 },
					maintenance: { total: 0, open: 0, inProgress: 0, completed: 0 }
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
				return await get<ActivityItem[]>(API_ENDPOINTS.DASHBOARD.ACTIVITY)
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
				return await get<UpcomingTask[]>(API_ENDPOINTS.DASHBOARD.TASKS)
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
				return await get<unknown[]>(API_ENDPOINTS.DASHBOARD.ALERTS)
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
 *   return <div>Properties: {stats.totalProperties}</div>
 * }
 * ```
 */
export function createDashboardOverviewPromise(): Promise<DashboardStats> {
	return get<DashboardStats>(API_ENDPOINTS.DASHBOARD.OVERVIEW)
}

/**
 * NATIVE React 19: Direct promise for recent activity
 * Eliminates TanStack Query when you don't need caching
 */
export function createDashboardActivityPromise(): Promise<ActivityItem[]> {
	return get<ActivityItem[]>(API_ENDPOINTS.DASHBOARD.ACTIVITY)
}

/**
 * NATIVE React 19: Direct promise for upcoming tasks
 * Stream data directly to components without hooks layer
 */
export function createUpcomingTasksPromise(): Promise<UpcomingTask[]> {
	return get<UpcomingTask[]>(API_ENDPOINTS.DASHBOARD.TASKS)
}

/**
 * NATIVE React 19: Direct promise for dashboard alerts
 * Components can use this for real-time streaming updates
 */
export function createDashboardAlertsPromise(): Promise<unknown[]> {
	return get<unknown[]>(API_ENDPOINTS.DASHBOARD.ALERTS)
}

/**
 * HYBRID React 19 + TanStack Query: Best of both worlds
 * Use Suspense for guaranteed data + use() for promise streaming
 */
export function useDashboardOverviewSuspense(): UseSuspenseQueryResult<DashboardStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.dashboard.overview(),
		queryFn: async () => get<DashboardStats>(API_ENDPOINTS.DASHBOARD.OVERVIEW),
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
