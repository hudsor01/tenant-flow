/**
 * Centralized Route Loaders
 *
 * This module provides type-safe, optimized loaders for all routes
 * with built-in error handling, caching, and performance optimization.
 */

import { queryKeys } from '@/lib/query-keys'
// Removed unused imports MaintenanceQuery, RequestStatus

// Temporary stub types and configurations
type UserContext = unknown;
type Permission = string;
type ContextType = {
  supabase?: {
    auth?: {
      getSession: () => Promise<{ data: { session: { user: { id: string; email?: string } } | null } }>;
    };
  };
  queryClient?: {
    ensureQueryData?: (config: {
      queryKey: readonly (string | Record<string, unknown> | undefined)[];
      queryFn: () => Promise<unknown>;
      staleTime: number;
    }) => Promise<unknown>;
    prefetchQuery?: (config: {
      queryKey: readonly (string | Record<string, unknown> | undefined)[];
      queryFn: () => Promise<unknown>;
      staleTime: number;
    }) => Promise<unknown>;
  };
};

const loaderUtils = { 
  createLoader: (config: {
    priority?: string;
    cacheStrategy?: string;
    staleTime?: number;
    retryAttempts?: number;
    permissions?: string[];
    parallel?: boolean;
  }, fn: (context: ContextType) => Promise<unknown>) => fn,
  loadParallel: async (_context: ContextType, loaders: Record<string, () => Promise<unknown>>) => {
    const results: Record<string, unknown> = {};
    for (const [key, loader] of Object.entries(loaders)) {
      try {
        results[key] = await loader();
      } catch (error) {
        console.warn(`Loader ${key} failed:`, error);
        results[key] = null;
      }
    }
    return results;
  }
};

const api = {
  users: { profile: () => Promise.resolve({ data: null }) },
  subscriptions: { current: () => Promise.resolve({ data: null }) },
  properties: { 
    list: (_params?: Record<string, unknown>) => Promise.resolve({ data: [] }),
    get: (_id: string) => Promise.resolve({ data: null }),
    stats: () => Promise.resolve({ data: {} })
  },
  tenants: { 
    list: (_params?: Record<string, unknown>) => Promise.resolve({ data: [] }),
    get: (_id: string) => Promise.resolve({ data: null })
  },
  maintenance: { list: (_params?: Record<string, unknown>) => Promise.resolve({ data: [] }) },
  units: { list: (_params?: Record<string, unknown>) => Promise.resolve({ data: [] }) },
  leases: { list: (_params?: Record<string, unknown>) => Promise.resolve({ data: [] }) }
};

const cacheConfig = {
  reference: { staleTime: 5 * 60 * 1000 },
  business: { staleTime: 2 * 60 * 1000 },
  realtime: { staleTime: 30 * 1000 }
};

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
  async (context: ContextType): Promise<UserContext | null> => {
    try {
      const sessionResult = await context.supabase?.auth?.getSession();
      const session = sessionResult?.data?.session;

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
        role: (profile as { role?: string } | null)?.role || 'OWNER',
        organizationId: (profile as { organizationId?: string } | null)?.organizationId,
        permissions: derivePermissions(
          (profile as { role?: string } | null)?.role,
          (subscription as { tier?: string } | null)?.tier
        ),
        subscription: {
          tier: (subscription as { tier?: string } | null)?.tier || 'free',
          status: (subscription as { status?: string } | null)?.status || 'active',
          propertiesLimit: (subscription as { limits?: { properties?: number } } | null)?.limits?.properties || 1,
          tenantsLimit: (subscription as { limits?: { tenants?: number } } | null)?.limits?.tenants || 5,
          features: (subscription as { features?: string[] } | null)?.features || []
        },
        preferences: {
          theme: (profile as { preferences?: { theme?: string } } | null)?.preferences?.theme || 'system',
          language: (profile as { preferences?: { language?: string } } | null)?.preferences?.language || 'en',
          timezone: (profile as { preferences?: { timezone?: string } } | null)?.preferences?.timezone || 'America/New_York'
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
  async (context: ContextType) => {
    return await loaderUtils.loadParallel(context, {
      // Properties overview
      properties: async () => {
        if (!context.queryClient?.ensureQueryData) return [];
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
        if (!context.queryClient?.ensureQueryData) return {};
        return await context.queryClient.ensureQueryData({
          queryKey: ['properties', 'stats'] as const,
          queryFn: async () => {
            const response = await api.properties.stats()
            return response.data
          },
          ...cacheConfig.business
        })
      },

      // Recent tenants
      recentTenants: async () => {
        if (!context.queryClient?.ensureQueryData) return [];
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.lists(),
          queryFn: async () => {
            const response = await api.tenants.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
            return response.data
          },
          ...cacheConfig.business
        })
      },

      // Maintenance requests
      maintenanceRequests: async () => {
        if (!context.queryClient?.ensureQueryData) return [];
        return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.maintenance.requests(),
          queryFn: async () => {
            const response = await api.maintenance.list({
              status: 'open,in_progress',
              limit: 5,
              sortBy: 'createdAt',
              sortOrder: 'desc'
            })
            return response.data
          },
          ...cacheConfig.realtime
        })
      },

      // Financial analytics
      financialAnalytics: async () => {
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
  async (context: ContextType) => {
    const params = {
      page: searchParams.page || 1,
      limit: Math.min(searchParams.limit || 20, 100),
      search: searchParams.search,
      type: searchParams.type,
      status: searchParams.status,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }

    if (!context.queryClient?.ensureQueryData) return null;
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
  async (context: ContextType) => {
    return await loaderUtils.loadParallel(context, {
      // Property details
      property: async () => {
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
    return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.properties.maintenance(propertyId),
          queryFn: async () => {
            const response = await api.maintenance.list({
              propertyId,
              limit: 10,
              sortBy: 'created_at',
              sortOrder: 'desc'
            } as Record<string, unknown>)
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
  async (context: ContextType) => {
    const params = {
      page: searchParams.page || 1,
      limit: Math.min(searchParams.limit || 20, 100),
      search: searchParams.search,
      status: searchParams.status,
      propertyId: searchParams.propertyId,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }

    if (!context.queryClient?.ensureQueryData) return null;
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
  async (context: ContextType) => {
    return await loaderUtils.loadParallel(context, {
      // Tenant profile
      tenant: async () => {
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
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
        if (!context.queryClient?.ensureQueryData) return null;
    return await context.queryClient.ensureQueryData({
          queryKey: queryKeys.tenants.maintenance(tenantId),
          queryFn: async () => {
            const response = await api.maintenance.list({
              limit: 10,
              sortBy: 'created_at',
              sortOrder: 'desc'
            } as Record<string, unknown>)
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
  async (context: ContextType) => {
    const params: Record<string, unknown> = {
      offset: ((searchParams.page || 1) - 1) * Math.min(searchParams.limit || 20, 100),
      limit: Math.min(searchParams.limit || 20, 100),
      status: searchParams.status,
      priority: searchParams.priority,
      propertyId: searchParams.propertyId,
      sortBy: searchParams.sortBy || 'created_at',
      sortOrder: searchParams.sortOrder || 'desc'
    }

    if (!context.queryClient?.ensureQueryData) return null;
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
function derivePermissions(role = 'OWNER', _tier?: string): Permission[] {
  // TODO: Implement tier-based permissions when needed
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
