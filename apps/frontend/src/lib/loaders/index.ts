/**
 * Centralized Route Loaders
 * 
 * This module provides type-safe, optimized loaders for all routes
 * with built-in error handling, caching, and performance optimization.
 */

import type { UserContext, Permission } from '../router-context'
import { api } from '../api/axios-client'
import { queryKeys, cacheConfig } from '../query-keys'
import { loaderUtils } from '../router-context'

// ===== AUTHENTICATION LOADERS =====

/**
 * Load current user context and session
 */
export const loadAuth = loaderUtils.createLoader(
  {
    priority: 'high',
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.reference.staleTime,
    retryAttempts: 2
  },
  async (context): Promise<UserContext | null> => {
    try {
      const { data: { session } } = await context.supabase.auth.getSession()
      
      if (!session?.user) {
        return null
      }
      
      // Get user profile and subscription info
      const [profileResponse, subscriptionResponse] = await Promise.allSettled([
        api.users.profile(),
        api.subscriptions.current()
      ])
      
      const profile = profileResponse.status === 'fulfilled' ? profileResponse.value.data : null
      const subscription = subscriptionResponse.status === 'fulfilled' ? subscriptionResponse.value.data : null
      
      return {
        id: session.user.id,
        email: session.user.email || '',
        role: profile?.role || 'OWNER',
        organizationId: profile?.organizationId,
        permissions: derivePermissions(profile?.role, subscription?.tier),
        subscription: {
          tier: subscription?.tier || 'free',
          status: subscription?.status || 'active',
          propertiesLimit: subscription?.limits?.properties || 1,
          tenantsLimit: subscription?.limits?.tenants || 5,
          features: subscription?.features || []
        },
        preferences: {
          theme: profile?.preferences?.theme || 'system',
          language: profile?.preferences?.language || 'en',
          timezone: profile?.preferences?.timezone || 'America/New_York'
        }
      }
    } catch (error) {
      console.warn('Auth loader failed:', error)
      return null
    }
  }
)

// ===== DASHBOARD LOADERS =====

/**
 * Load dashboard data with parallel fetching
 */
export const loadDashboard = loaderUtils.createLoader(
  {
    permissions: ['properties:read', 'analytics:read'],
    parallel: true,
    priority: 'high',
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.business.staleTime
  },
  async (context) => {
    return await loaderUtils.loadParallel(context, {
      // Properties overview
      properties: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.lists(),
          queryFn: async () => {
            const response = await api.properties.list({ limit: 10 })
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Properties statistics
      propertyStats: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.list({ type: 'stats' }),
          queryFn: async () => {
            const response = await api.properties.stats()
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Recent tenants
      recentTenants: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.lists(),
          queryFn: async () => {
            const response = await api.tenants.list({ limit: 5, sort: 'created_at:desc' })
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Maintenance requests
      maintenanceRequests: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.maintenance.requests(),
          queryFn: async () => {
            const response = await api.maintenance.list({ 
              status: 'open,in_progress', 
              limit: 5,
              sort: 'created_at:desc'
            })
            return response.data
          },
          ...cacheConfig.realtime
        })
      },
      
      // Financial analytics
      financialAnalytics: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.financial.analytics(),
          queryFn: async () => {
            // This would need to be implemented in the backend
            return {
              totalRent: 0,
              occupancyRate: 0,
              monthlyRevenue: 0,
              expenses: 0
            }
          },
          ...cacheConfig.business
        })
      },
      
      // Subscription status
      subscription: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.subscriptions.current(),
          queryFn: async () => {
            const response = await api.subscriptions.current()
            return response.data
          },
          ...cacheConfig.reference
        })
      },
      
      // Notifications
      notifications: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.notifications.unread(),
          queryFn: async () => {
            // This would need to be implemented
            return []
          },
          ...cacheConfig.realtime
        })
      }
    })
  }
)

// ===== PROPERTIES LOADERS =====

/**
 * Load properties list with filtering and pagination
 */
export const loadProperties = (searchParams: {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => loaderUtils.createLoader(
  {
    permissions: ['properties:read'],
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.business.staleTime
  },
  async (context) => {
    const params = {
      page: searchParams.page || 1,
      limit: Math.min(searchParams.limit || 20, 100),
      search: searchParams.search,
      type: searchParams.type,
      status: searchParams.status,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }
    
    return await context.queryClient.ensureQueryData({
      queryKey: queryKeys.properties.list(params),
      queryFn: async () => {
        const response = await api.properties.list(params)
        return response.data
      },
      ...cacheConfig.business
    })
  }
)

/**
 * Load single property with units and analytics
 */
export const loadProperty = (propertyId: string, includeAnalytics = false) => loaderUtils.createLoader(
  {
    permissions: ['properties:read'],
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.business.staleTime,
    parallel: true
  },
  async (context) => {
    return await loaderUtils.loadParallel(context, {
      // Property details
      property: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.detail(propertyId),
          queryFn: async () => {
            const response = await api.properties.get(propertyId)
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Property units
      units: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.units(propertyId),
          queryFn: async () => {
            const response = await api.units.list({ propertyId })
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Property analytics (conditional)
      analytics: includeAnalytics ? async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.analytics(propertyId),
          queryFn: async () => {
            // This would need to be implemented in the backend
            return {
              occupancyRate: 0,
              monthlyRent: 0,
              maintenanceRequests: 0,
              avgTenantStay: 0
            }
          },
          ...cacheConfig.business
        })
      } : async () => null,
      
      // Recent maintenance requests
      maintenanceRequests: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.maintenance(propertyId),
          queryFn: async () => {
            const response = await api.maintenance.list({ 
              propertyId, 
              limit: 10,
              sort: 'created_at:desc'
            })
            return response.data
          },
          ...cacheConfig.realtime
        })
      }
    })
  }
)

// ===== TENANTS LOADERS =====

/**
 * Load tenants list with filtering
 */
export const loadTenants = (searchParams: {
  page?: number
  limit?: number
  search?: string
  status?: string
  propertyId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => loaderUtils.createLoader(
  {
    permissions: ['tenants:read'],
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.business.staleTime
  },
  async (context) => {
    const params = {
      page: searchParams.page || 1,
      limit: Math.min(searchParams.limit || 20, 100),
      search: searchParams.search,
      status: searchParams.status,
      propertyId: searchParams.propertyId,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }
    
    return await context.queryClient.ensureQueryData({
      queryKey: queryKeys.tenants.list(params),
      queryFn: async () => {
        const response = await api.tenants.list(params)
        return response.data
      },
      ...cacheConfig.business
    })
  }
)

/**
 * Load single tenant with lease and payment info
 */
export const loadTenant = (tenantId: string) => loaderUtils.createLoader(
  {
    permissions: ['tenants:read'],
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.business.staleTime,
    parallel: true
  },
  async (context) => {
    return await loaderUtils.loadParallel(context, {
      // Tenant profile
      tenant: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.detail(tenantId),
          queryFn: async () => {
            const response = await api.tenants.get(tenantId)
            return response.data
          },
          ...cacheConfig.business
        })
      },
      
      // Tenant lease
      lease: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.lease(tenantId),
          queryFn: async () => {
            const response = await api.leases.list({ tenantId, status: 'active' })
            return response.data[0] || null
          },
          ...cacheConfig.business
        })
      },
      
      // Payment history
      payments: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.payments(tenantId),
          queryFn: async () => {
            // This would need to be implemented
            return []
          },
          ...cacheConfig.business
        })
      },
      
      // Documents
      documents: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.documents(tenantId),
          queryFn: async () => {
            // This would need to be implemented
            return []
          },
          ...cacheConfig.business
        })
      },
      
      // Maintenance requests
      maintenanceRequests: async () => {
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.maintenance(tenantId),
          queryFn: async () => {
            const response = await api.maintenance.list({ 
              tenantId,
              limit: 10,
              sort: 'created_at:desc'
            })
            return response.data
          },
          ...cacheConfig.realtime
        })
      }
    })
  }
)

// ===== MAINTENANCE LOADERS =====

/**
 * Load maintenance requests with filtering
 */
export const loadMaintenance = (searchParams: {
  page?: number
  limit?: number
  status?: string
  priority?: string
  propertyId?: string
  tenantId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => loaderUtils.createLoader(
  {
    permissions: ['maintenance:read'],
    cacheStrategy: 'cache-first',
    staleTime: cacheConfig.realtime.staleTime
  },
  async (context) => {
    const params = {
      page: searchParams.page || 1,
      limit: Math.min(searchParams.limit || 20, 100),
      status: searchParams.status,
      priority: searchParams.priority,
      propertyId: searchParams.propertyId,
      tenantId: searchParams.tenantId,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }
    
    return await context.queryClient.ensureQueryData({
      queryKey: queryKeys.maintenance.requests(),
      queryFn: async () => {
        const response = await api.maintenance.list(params)
        return response.data
      },
      ...cacheConfig.realtime
    })
  }
)

// ===== UTILITY FUNCTIONS =====

/**
 * Derive user permissions based on role and subscription
 */
function derivePermissions(role = 'OWNER', _tier = 'free'): Permission[] {
  const basePermissions: Permission[] = ['properties:read', 'tenants:read', 'maintenance:read']
  
  if (role === 'OWNER') {
    return [
      ...basePermissions,
      'properties:write',
      'tenants:write', 
      'maintenance:write',
      'analytics:read',
      'billing:read',
      'billing:write'
    ]
  }
  
  if (role === 'MANAGER') {
    return [
      ...basePermissions,
      'properties:write',
      'tenants:write',
      'maintenance:write',
      'analytics:read'
    ]
  }
  
  // TENANT role
  return ['maintenance:read']
}

// Export all loaders
export const loaders = {
  auth: loadAuth,
  dashboard: loadDashboard,
  properties: loadProperties,
  property: loadProperty,
  tenants: loadTenants,
  tenant: loadTenant,
  maintenance: loadMaintenance
}

export default loaders