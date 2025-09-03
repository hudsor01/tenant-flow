/**
 * Frontend API client configuration for TenantFlow
 * Integrates with shared API client and backend endpoints
 */
import type { DashboardStats } from '@repo/shared'
import { apiClient } from '@repo/shared/src/utils/api-client'

const API_BASE_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4600'

/**
 * Dashboard API endpoints
 */
export const dashboardApi = {
	getStats: (): Promise<DashboardStats> =>
		apiClient<DashboardStats>(`${API_BASE_URL}/api/v1/dashboard/stats`),

	getActivity: (): Promise<{ activities: Array<unknown> }> =>
		apiClient(`${API_BASE_URL}/api/v1/dashboard/activity`)
}

/**
 * Export the base API client for direct use
 */
export { apiClient }
