/**
 * Dashboard API - Direct API calls only
 */

import { apiClient } from '@/lib/api-client'
import type { Property, Tenant, Lease, MaintenanceRequest, ActivityItem, DashboardStats } from '@repo/shared'

// Local types for dashboard-specific data (not implemented in backend yet)
interface PropertyMetric {
  id: string
  name: string
  value: number
  change: number
  period: string
}

interface PropertyTrend {
  period: string
  value: number
  date: string
}

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
  type: 'tenant_added' | 'lease_signed' | 'payment_received' | 'maintenance_completed' | 'property' | 'tenant' | 'lease' | 'maintenance' | 'payment'
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
  metrics: (period: string) => [...dashboardKeys.all, 'metrics', period] as const,
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
    // Backend doesn't have tasks endpoint - return empty array
    // This is handled gracefully by hooks with error fallbacks
    return Promise.resolve([])
  },

  async getRecentActivity(limit = 20) {
    // Backend has getActivity method but no HTTP endpoint
    // Return empty array - handled gracefully by hooks
    return Promise.resolve([])
  },

  async getAlerts() {
    // Backend doesn't have alerts endpoint - return empty array
    return Promise.resolve([])
  },

  async getMetrics(period: 'week' | 'month' | 'year' = 'month') {
    // Backend doesn't have metrics endpoint - return empty array
    return Promise.resolve([])
  },

  async getOccupancyTrends(months = 12) {
    // Backend doesn't have trends endpoints - return empty array
    return Promise.resolve([])
  },

  async getRevenueTrends(months = 12) {
    // Backend doesn't have trends endpoints - return empty array  
    return Promise.resolve([])
  },
}

export type { DashboardStats as Stats }