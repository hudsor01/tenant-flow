/**
 * React Query hooks for Dashboard
 * Provides type-safe data fetching for dashboard statistics and analytics
 */
import { type UseQueryResult } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { DashboardStats } from '@repo/shared'
import { useQueryFactory, useStatsQuery } from '../query-factory'

interface DashboardOverview {
  recentActivity: {
    id: string
    type: 'tenant_added' | 'lease_created' | 'maintenance_request' | 'payment_received'
    description: string
    timestamp: Date
    entityId?: string
  }[]
  upcomingLeaseExpirations: {
    id: string
    tenantName: string
    propertyName: string
    unitNumber: string
    expirationDate: Date
    daysRemaining: number
  }[]
  overduePayments: {
    id: string
    tenantName: string
    amount: number
    dueDate: Date
    daysOverdue: number
  }[]
  propertyPerformance: {
    propertyId: string
    propertyName: string
    occupancyRate: number
    monthlyRevenue: number
    maintenanceRequests: number
    performance: 'excellent' | 'good' | 'fair' | 'poor'
  }[]
}

interface RevenueAnalytics {
  monthlyRevenue: {
    month: string
    revenue: number
    expenses: number
    profit: number
  }[]
  revenueByProperty: {
    propertyId: string
    propertyName: string
    revenue: number
    percentage: number
  }[]
  paymentStatus: {
    paid: number
    pending: number
    overdue: number
  }
  projectedRevenue: {
    nextMonth: number
    nextQuarter: number
    nextYear: number
  }
}

/**
 * Fetch dashboard statistics
 */
export function useDashboardStats(
  options?: { enabled?: boolean; refetchInterval?: number }
): UseQueryResult<DashboardStats, Error> {
  return useStatsQuery(
    'dashboard',
    async () => {
      try {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats')
        return response.data
      } catch {
        // Return default data on error to allow UI to render
        console.warn('Dashboard stats API unavailable, using defaults')
        return {
          properties: { totalProperties: 0, occupancyRate: 0 },
          tenants: { totalTenants: 0 },
          leases: { activeLeases: 0, expiredLeases: 0 },
          maintenanceRequests: { open: 0 }
        } as DashboardStats
      }
    },
    options?.refetchInterval
  )
}

/**
 * Fetch dashboard overview with recent activity and alerts
 */
export function useDashboardOverview(
  options?: { enabled?: boolean }
): UseQueryResult<DashboardOverview, Error> {
  return useQueryFactory({
    queryKey: queryKeys.dashboardOverview(),
    queryFn: async () => {
      try {
        const response = await apiClient.get<DashboardOverview>('/dashboard/overview')
        return response.data
      } catch {
        console.warn('Dashboard overview API unavailable')
        // Return empty data structure
        return {
          recentActivity: [],
          upcomingLeaseExpirations: [],
          overduePayments: [],
          propertyPerformance: []
        } as DashboardOverview
      }
    },
    enabled: options?.enabled,
    staleTime: 2 * 60 * 1000
  })
}

/**
 * Fetch recent activity for the dashboard
 */
export function useDashboardActivity(
  limit = 10,
  options?: { enabled?: boolean }
): UseQueryResult<DashboardOverview['recentActivity'], Error> {
  return useQueryFactory({
    queryKey: queryKeys.dashboardActivity(),
    queryFn: async () => {
      try {
        const response = await apiClient.get<DashboardOverview['recentActivity']>(
          '/dashboard/activity',
          { params: { limit } }
        )
        return response.data
      } catch {
        console.warn('Dashboard activity API unavailable')
        return [] // Return empty array on error
      }
    },
    enabled: options?.enabled,
    staleTime: 60 * 1000
  })
}

/**
 * Fetch revenue analytics
 */
export function useRevenueAnalytics(
  options?: { 
    enabled?: boolean
    period?: 'month' | 'quarter' | 'year'
  }
): UseQueryResult<RevenueAnalytics, Error> {
  return useQueryFactory({
    queryKey: ['revenue-analytics', options?.period ?? 'month'],
    queryFn: async () => {
      const response = await apiClient.get<RevenueAnalytics>(
        '/dashboard/revenue',
        { params: { period: options?.period ?? 'month' } }
      )
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 10 * 60 * 1000, // Consider data stale after 10 minutes
  })
}

/**
 * Fetch occupancy trends
 */
export function useOccupancyTrends(
  options?: { 
    enabled?: boolean
    months?: number
  }
): UseQueryResult<{
  month: string
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
}[], Error> {
  return useQueryFactory({
    queryKey: ['occupancy-trends', options?.months ?? 12],
    queryFn: async () => {
      const response = await apiClient.get(
        '/dashboard/occupancy-trends',
        { params: { months: options?.months ?? 12 } }
      )
      return response.data as {
        month: string
        occupancyRate: number
        totalUnits: number
        occupiedUnits: number
      }[]
    },
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000, // Consider data stale after 30 minutes
  })
}

/**
 * Fetch maintenance metrics
 */
export function useMaintenanceMetrics(
  options?: { enabled?: boolean }
): UseQueryResult<{
  averageResolutionTime: number
  requestsByCategory: {
    category: string
    count: number
    percentage: number
  }[]
  requestsByPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  monthlyTrends: {
    month: string
    created: number
    resolved: number
    pending: number
  }[]
  topIssues: {
    issue: string
    count: number
    averageResolutionTime: number
  }[]
}, Error> {
  return useQueryFactory({
    queryKey: ['maintenance-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/maintenance-metrics')
      return response.data as {
        averageResolutionTime: number
        requestsByCategory: {
          category: string
          count: number
          percentage: number
        }[]
        requestsByPriority: {
          low: number
          medium: number
          high: number
          urgent: number
        }
        monthlyTrends: {
          month: string
          created: number
          resolved: number
          pending: number
        }[]
        topIssues: {
          issue: string
          count: number
          averageResolutionTime: number
        }[]
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 15 * 60 * 1000, // Consider data stale after 15 minutes
  })
}

/**
 * Fetch tenant satisfaction metrics
 */
export function useTenantMetrics(
  options?: { enabled?: boolean }
): UseQueryResult<{
  totalTenants: number
  newTenantsThisMonth: number
  renewalRate: number
  averageTenancy: number
  satisfactionScore: number
  tenantsByProperty: {
    propertyId: string
    propertyName: string
    tenantCount: number
  }[]
}, Error> {
  return useQueryFactory({
    queryKey: ['tenant-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/tenant-metrics')
      return response.data as {
        totalTenants: number
        newTenantsThisMonth: number
        renewalRate: number
        averageTenancy: number
        satisfactionScore: number
        tenantsByProperty: {
          propertyId: string
          propertyName: string
          tenantCount: number
        }[]
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 20 * 60 * 1000, // Consider data stale after 20 minutes
  })
}