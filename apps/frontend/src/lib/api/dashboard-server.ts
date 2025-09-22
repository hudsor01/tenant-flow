/**
 * Server-side dashboard API functions
 * Mirrors the existing dashboardApi structure for consistency
 */
import { serverFetch } from './server'
import type {
  DashboardStats,
  PropertyPerformance,
  SystemUptime,
  DashboardFinancialStats,
  PropertyWithUnits,
  TenantWithLeaseInfo,
  MaintenanceRequestResponse,
  LeaseStatsResponse,
  Unit,
  TenantStats
} from '@repo/shared'

/**
 * Dashboard API endpoints - server-side versions
 */
export const dashboardServerApi = {
  // Core dashboard stats
  getStats: () =>
    serverFetch<DashboardStats>('/api/v1/dashboard/stats'),

  // Activity feed
  getActivity: () =>
    serverFetch<{ activities: Array<unknown> }>('/api/v1/dashboard/activity'),

  // Property performance metrics
  getPropertyPerformance: () =>
    serverFetch<PropertyPerformance[]>('/api/v1/dashboard/property-performance'),

  // System uptime
  getUptime: () =>
    serverFetch<SystemUptime>('/api/v1/dashboard/uptime')
}

/**
 * Parallel fetch all dashboard data for optimal performance
 */
export async function getAllDashboardData() {
  const [stats, performance, activity, uptime] = await Promise.all([
    dashboardServerApi.getStats(),
    dashboardServerApi.getPropertyPerformance(),
    dashboardServerApi.getActivity(),
    dashboardServerApi.getUptime()
  ])

  return { stats, performance, activity, uptime }
}

/**
 * Financial dashboard data
 */
export async function getFinancialDashboardData() {
  const financialStats = await serverFetch<DashboardFinancialStats>(
    '/api/v1/financial/dashboard-stats-calculated'
  )
  return financialStats
}

/**
 * Properties with analytics
 */
export async function getPropertiesWithAnalytics() {
  const properties = await serverFetch<PropertyWithUnits[]>(
    '/api/v1/properties/with-units'
  )
  return properties
}

/**
 * Tenants with analytics
 */
export async function getTenantsWithAnalytics() {
  const tenants = await serverFetch<TenantWithLeaseInfo[]>(
    '/api/v1/tenants/analytics'
  )
  return tenants
}

/**
 * Maintenance requests
 */
export async function getMaintenanceRequests(status?: string) {
  const endpoint = status
    ? `/api/v1/maintenance?status=${encodeURIComponent(status)}`
    : '/api/v1/maintenance'

  const maintenance = await serverFetch<MaintenanceRequestResponse>(endpoint)
  return maintenance
}

/**
 * Lease statistics
 */
export async function getLeaseStats() {
  const leaseStats = await serverFetch<LeaseStatsResponse>(
    '/api/v1/leases/stats'
  )
  return leaseStats
}

/**
 * Analytics page data - parallel fetch
 */
export async function getAnalyticsPageData() {
  const [dashboardStats, propertyPerformance, financialStats] = await Promise.all([
    dashboardServerApi.getStats(),
    dashboardServerApi.getPropertyPerformance(),
    getFinancialDashboardData()
  ])

  return {
    dashboardStats,
    propertyPerformance,
    financialStats
  }
}

/**
 * Properties page data - parallel fetch WITH STATS
 * All calculations done by backend/database
 */
export async function getPropertiesPageData(status?: string) {
  const endpoint = status
    ? `/api/v1/properties?status=${encodeURIComponent(status)}`
    : '/api/v1/properties'

  // Fetch properties, units, AND pre-calculated stats
  const [properties, units, propertyStats] = await Promise.all([
    serverFetch<PropertyWithUnits[]>(endpoint),
    serverFetch<Unit[]>('/api/v1/units'),
    serverFetch<{
      totalProperties: number
      totalUnits: number
      occupiedUnits: number
      occupancyRate: number
      totalRevenue: number
      vacantUnits: number
      maintenanceUnits: number
    }>('/api/v1/properties/stats')
  ])

  return {
    properties: properties || [],
    units: units || [],
    stats: propertyStats || {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      occupancyRate: 0,
      totalRevenue: 0,
      vacantUnits: 0,
      maintenanceUnits: 0
    }
  }
}

/**
 * Tenants page data - parallel fetch with stats
 */
export async function getTenantsPageData() {
  const [tenants, tenantStats] = await Promise.all([
    serverFetch<TenantWithLeaseInfo[]>('/api/v1/tenants/analytics'),
    serverFetch<TenantStats>('/api/v1/tenants/stats')
  ])

  return {
    tenants: tenants || [],
    stats: tenantStats || {
      totalTenants: 0,
      activeTenants: 0,
      currentPayments: 0,
      latePayments: 0,
      totalRent: 0,
      avgRent: 0,
      recentAdditions: 0,
      withContactInfo: 0
    }
  }
}

/**
 * Maintenance page data
 */
export async function getMaintenancePageData() {
  const maintenanceData = await serverFetch<MaintenanceRequestResponse>('/api/v1/maintenance')
  return maintenanceData || { data: [] }
}