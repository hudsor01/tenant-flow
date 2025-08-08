/**
 * React Query hooks for Dashboard
 * Provides type-safe data fetching for dashboard statistics and analytics
 */
import { 
  useQuery,
  type UseQueryResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { DashboardStats } from '@repo/shared'

interface DashboardOverview {
  recentActivity: Array<{
    id: string
    type: 'tenant_added' | 'lease_created' | 'maintenance_request' | 'payment_received'
    description: string
    timestamp: Date
    entityId?: string
  }>
  upcomingLeaseExpirations: Array<{
    id: string
    tenantName: string
    propertyName: string
    unitNumber: string
    expirationDate: Date
    daysRemaining: number
  }>
  overduePayments: Array<{
    id: string
    tenantName: string
    amount: number
    dueDate: Date
    daysOverdue: number
  }>
  propertyPerformance: Array<{
    propertyId: string
    propertyName: string
    occupancyRate: number
    monthlyRevenue: number
    maintenanceRequests: number
    performance: 'excellent' | 'good' | 'fair' | 'poor'
  }>
}

interface RevenueAnalytics {
  monthlyRevenue: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  revenueByProperty: Array<{
    propertyId: string
    propertyName: string
    revenue: number
    percentage: number
  }>
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
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async () => {
      const response = await apiClient.get<DashboardStats>('/dashboard/stats')
      return response.data
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

/**
 * Fetch dashboard overview with recent activity and alerts
 */
export function useDashboardOverview(
  options?: { enabled?: boolean }
): UseQueryResult<DashboardOverview, Error> {
  return useQuery({
    queryKey: queryKeys.dashboardOverview(),
    queryFn: async () => {
      const response = await apiClient.get<DashboardOverview>('/dashboard/overview')
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  })
}

/**
 * Fetch recent activity for the dashboard
 */
export function useDashboardActivity(
  limit: number = 10,
  options?: { enabled?: boolean }
): UseQueryResult<DashboardOverview['recentActivity'], Error> {
  return useQuery({
    queryKey: queryKeys.dashboardActivity(),
    queryFn: async () => {
      const response = await apiClient.get<DashboardOverview['recentActivity']>(
        '/dashboard/activity',
        { params: { limit } }
      )
      return response.data
    },
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // Consider data stale after 1 minute
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
  return useQuery({
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
): UseQueryResult<Array<{
  month: string
  occupancyRate: number
  totalUnits: number
  occupiedUnits: number
}>, Error> {
  return useQuery({
    queryKey: ['occupancy-trends', options?.months ?? 12],
    queryFn: async () => {
      const response = await apiClient.get(
        '/dashboard/occupancy-trends',
        { params: { months: options?.months ?? 12 } }
      )
      return response.data as Array<{
        month: string
        occupancyRate: number
        totalUnits: number
        occupiedUnits: number
      }>
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
  requestsByCategory: Array<{
    category: string
    count: number
    percentage: number
  }>
  requestsByPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  monthlyTrends: Array<{
    month: string
    created: number
    resolved: number
    pending: number
  }>
  topIssues: Array<{
    issue: string
    count: number
    averageResolutionTime: number
  }>
}, Error> {
  return useQuery({
    queryKey: ['maintenance-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/maintenance-metrics')
      return response.data as {
        averageResolutionTime: number
        requestsByCategory: Array<{
          category: string
          count: number
          percentage: number
        }>
        requestsByPriority: {
          low: number
          medium: number
          high: number
          urgent: number
        }
        monthlyTrends: Array<{
          month: string
          created: number
          resolved: number
          pending: number
        }>
        topIssues: Array<{
          issue: string
          count: number
          averageResolutionTime: number
        }>
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
  tenantsByProperty: Array<{
    propertyId: string
    propertyName: string
    tenantCount: number
  }>
}, Error> {
  return useQuery({
    queryKey: ['tenant-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/tenant-metrics')
      return response.data as {
        totalTenants: number
        newTenantsThisMonth: number
        renewalRate: number
        averageTenancy: number
        satisfactionScore: number
        tenantsByProperty: Array<{
          propertyId: string
          propertyName: string
          tenantCount: number
        }>
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 20 * 60 * 1000, // Consider data stale after 20 minutes
  })
}