/**
 * Dashboard API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type {
	ActivityItem,
	DashboardStats
} from '@repo/shared'

// Local types for dashboard-specific data (not implemented in backend yet)
// Removed unused interfaces: PropertyMetric, PropertyTrend

export interface UpcomingTask {
	id: string
	type: 'lease_expiry' | 'rent_due' | 'maintenance' | 'inspection'
	title: string
	description: string
	dueDate: Date
	priority: 'low' | 'medium' | 'high'
	propertyId?: string
	tenantId?: string
	leaseId?: string
}

export interface RecentActivity {
	id: string
	type:
		| 'tenant_added'
		| 'lease_signed'
		| 'payment_received'
		| 'maintenance_completed'
		| 'property'
		| 'tenant'
		| 'lease'
		| 'maintenance'
		| 'payment'
	description: string
	timestamp: Date
	userId: string
}

/**
 * Query keys for React Query caching
 */
export const dashboardKeys = {
	all: ['dashboard'] as const,
	overview: () => [...dashboardKeys.all, 'overview'] as const,
	stats: () => [...dashboardKeys.all, 'stats'] as const,
	tasks: () => [...dashboardKeys.all, 'tasks'] as const,
	activity: () => [...dashboardKeys.all, 'activity'] as const,
	alerts: () => [...dashboardKeys.all, 'alerts'] as const,
	metrics: (period: string) =>
		[...dashboardKeys.all, 'metrics', period] as const
}

/**
 * Dashboard API functions - Only calls endpoints that actually exist
 */
export const dashboardApi = {
	async getOverview() {
		// Use the only available endpoint - /dashboard/stats
		return apiClient.get<DashboardStats>('/dashboard/stats')
	},

	async getStats() {
		return apiClient.get<DashboardStats>('/dashboard/stats')
	},

	async getUpcomingTasks(_limit = 10) {
		// Backend doesn't have tasks endpoint - return empty array
		// This is handled gracefully by hooks with error fallbacks
		return Promise.resolve([])
	},

	async getRecentActivity(limit = 20) {
		// Backend has /dashboard/activity endpoint
		return apiClient.get<ActivityItem[]>('/dashboard/activity', { 
			params: { limit } 
		})
	},

	async getAlerts() {
		// Backend doesn't have alerts endpoint - return empty array
		return Promise.resolve([])
	},

	async getMetrics(_period: 'week' | 'month' | 'year' = 'month') {
		// Backend doesn't have metrics endpoint - return empty array
		return Promise.resolve([])
	},

	async getOccupancyTrends(_months = 12) {
		// Backend doesn't have trends endpoints - return empty array
		return Promise.resolve([])
	},

	async getRevenueTrends(_months = 12) {
		// Backend doesn't have trends endpoints - return empty array
		return Promise.resolve([])
	}
}

export type { DashboardStats as Stats }
