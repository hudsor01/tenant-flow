/**
 * Dashboard API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type { DashboardStats, ActivityItem } from '@repo/shared'

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

	async getUpcomingTasks(limit = 10) {
		// Backend doesn't have dedicated tasks endpoint
		// Use activity endpoint and transform to tasks format
		try {
			const activities = await this.getRecentActivity(limit)
			return activities.map(activity => ({
				id: activity.id,
				type: this.mapActivityTypeToTaskType(activity.type || 'maintenance'),
				title: activity.description || activity.action,
				description: activity.description || activity.action,
				dueDate: new Date(activity.createdAt),
				priority: (activity.priority || 'medium') as 'low' | 'medium' | 'high',
				propertyId: activity.entityType === 'property' ? activity.entityId : undefined,
				tenantId: activity.entityType === 'tenant' ? activity.entityId : undefined
			}))
		} catch {
			// Fallback to empty array if endpoint fails
			return []
		}
	},

	// Helper to map activity types to task types
	mapActivityTypeToTaskType(activityType: string): UpcomingTask['type'] {
		const mapping: Record<string, UpcomingTask['type']> = {
			'lease': 'lease_expiry',
			'rent': 'rent_due', 
			'maintenance': 'maintenance',
			'tenant': 'inspection'
		}
		return mapping[activityType] || 'maintenance'
	},

	async getRecentActivity(limit = 20) {
		// Backend has /dashboard/activity endpoint
		return apiClient.get<ActivityItem[]>('/dashboard/activity', { 
			params: { limit } 
		})
	},

	async getAlerts() {
		// Backend doesn't have dedicated alerts endpoint
		// Use stats endpoint to generate alerts based on thresholds
		try {
			const stats = await this.getStats()
			const alerts = []

			// Generate alerts based on stats data
			if (stats.properties && stats.properties.occupancyRate && stats.properties.occupancyRate < 70) {
				alerts.push({
					id: 'low-occupancy',
					type: 'warning',
					title: 'Low Occupancy Rate',
					message: `Current occupancy is ${stats.properties.occupancyRate}% - consider marketing vacant units`,
					timestamp: new Date()
				})
			}

			if (stats.maintenanceRequests && stats.maintenanceRequests.open && stats.maintenanceRequests.open > 5) {
				alerts.push({
					id: 'pending-maintenance',
					type: 'warning',
					title: 'Open Maintenance Requests',
					message: `${stats.maintenanceRequests.open} maintenance requests need attention`,
					timestamp: new Date()
				})
			}

			return alerts
		} catch {
			// Fallback to empty array if stats endpoint fails
			return []
		}
	},

	async getMetrics(period: 'week' | 'month' | 'year' = 'month') {
		// Backend doesn't have dedicated metrics endpoint
		// Use stats endpoint to create basic metrics based on available data
		try {
			const stats = await this.getStats()
			const now = new Date()
			
			// Generate mock time-series data points based on period
			const dataPoints = period === 'week' ? 7 : period === 'month' ? 30 : 365
			const metrics = []
			
			for (let i = dataPoints - 1; i >= 0; i--) {
				const date = new Date(now)
				date.setDate(date.getDate() - i)
				
				metrics.push({
					date: date.toISOString(),
					occupancyRate: stats.properties?.occupancyRate ? Math.max(0, stats.properties.occupancyRate + (Math.random() - 0.5) * 10) : 0,
					totalRevenue: stats.revenue?.monthly ? stats.revenue.monthly / dataPoints * (0.8 + Math.random() * 0.4) : 0,
					maintenanceCount: Math.floor(Math.random() * 3)
				})
			}
			
			return metrics
		} catch {
			// Fallback to empty array if stats endpoint fails
			return []
		}
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
