/**
 * Query keys for React Query
 */
interface BlogFilters {
  category?: string;
  tags?: string[];
  search?: string;
}

interface Pagination {
  page?: number;
  limit?: number;
  offset?: number;
}

export const queryKeys = {
  // Authentication
  auth: {
    profile: () => ['auth', 'profile'] as const,
    session: () => ['auth', 'session'] as const,
  },

  // Properties
  properties: {
    lists: () => ['properties', 'list'] as const,
    list: (params?: Record<string, unknown>) => ['properties', 'list', params] as const,
    detail: (id: string) => ['properties', 'detail', id] as const,
    units: (propertyId: string) => ['properties', propertyId, 'units'] as const,
    analytics: (propertyId: string) => ['properties', propertyId, 'analytics'] as const,
    maintenance: (propertyId: string) => ['properties', propertyId, 'maintenance'] as const,
  },

  // Tenants
  tenants: {
    lists: () => ['tenants', 'list'] as const,
    list: (params?: Record<string, unknown>) => ['tenants', 'list', params] as const,
    detail: (id: string) => ['tenants', 'detail', id] as const,
    lease: (tenantId: string) => ['tenants', tenantId, 'lease'] as const,
    payments: (tenantId: string) => ['tenants', tenantId, 'payments'] as const,
    documents: (tenantId: string) => ['tenants', tenantId, 'documents'] as const,
    maintenance: (tenantId: string) => ['tenants', tenantId, 'maintenance'] as const,
  },

  // Maintenance
  maintenance: {
    requests: () => ['maintenance', 'requests'] as const,
    list: (params?: Record<string, unknown>) => ['maintenance', 'list', params] as const,
  },

  // Financial
  financial: {
    analytics: () => ['financial', 'analytics'] as const,
  },

  // Subscriptions
  subscriptions: {
    current: () => ['subscriptions', 'current'] as const,
  },

  // Notifications
  notifications: {
    unread: () => ['notifications', 'unread'] as const,
  },

  // Blog (existing)
  blog: {
    article: (slug: string) => ['blog', 'article', slug] as const,
    list: (filters: BlogFilters, pagination: Pagination) => ['blog', 'list', filters, pagination] as const,
    featured: () => ['blog', 'featured'] as const,
    related: (articleId: string, category: string) => ['blog', 'related', articleId, category] as const,
    tags: () => ['blog', 'tags'] as const,
  },

  // Users (additional)
  users: {
    profile: () => ['users', 'profile'] as const,
  },
}

export const cacheConfig = {
  longLived: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  business: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  },
  reference: {
    staleTime: 1000 * 60 * 60, // 1 hour - for relatively static data
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  realtime: {
    staleTime: 1000 * 30, // 30 seconds - for real-time data
    gcTime: 1000 * 60 * 5, // 5 minutes
  }
}