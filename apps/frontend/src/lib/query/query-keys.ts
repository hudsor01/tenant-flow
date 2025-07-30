/**
 * Centralized query key factory for consistent cache management
 * Follows TanStack Query best practices for hierarchical key structure
 */

// Base query key factories
export const queryKeys = {
  // Auth & User
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    validate: () => [...queryKeys.auth.all, 'validate'] as const,
  },
  
  // Properties
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.properties.lists(), { filters }] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
    stats: () => [...queryKeys.properties.all, 'stats'] as const,
    documents: (id: string) => [...queryKeys.properties.detail(id), 'documents'] as const,
    images: (id: string) => [...queryKeys.properties.detail(id), 'images'] as const,
  },
  
  // Units
  units: {
    all: ['units'] as const,
    lists: () => [...queryKeys.units.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.units.lists(), { filters }] as const,
    details: () => [...queryKeys.units.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.units.details(), id] as const,
    byProperty: (propertyId: string) => [...queryKeys.properties.detail(propertyId), 'units'] as const,
    stats: () => [...queryKeys.units.all, 'stats'] as const,
  },
  
  // Tenants
  tenants: {
    all: ['tenants'] as const,
    lists: () => [...queryKeys.tenants.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.tenants.lists(), { filters }] as const,
    details: () => [...queryKeys.tenants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenants.details(), id] as const,
    stats: () => [...queryKeys.tenants.all, 'stats'] as const,
    documents: (id: string) => [...queryKeys.tenants.detail(id), 'documents'] as const,
  },
  
  // Leases
  leases: {
    all: ['leases'] as const,
    lists: () => [...queryKeys.leases.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.leases.lists(), { filters }] as const,
    details: () => [...queryKeys.leases.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leases.details(), id] as const,
    byProperty: (propertyId: string) => [...queryKeys.properties.detail(propertyId), 'leases'] as const,
    byTenant: (tenantId: string) => [...queryKeys.tenants.detail(tenantId), 'leases'] as const,
    byUnit: (unitId: string) => [...queryKeys.units.detail(unitId), 'leases'] as const,
    expiring: (days?: number) => [...queryKeys.leases.all, 'expiring', { days }] as const,
    stats: () => [...queryKeys.leases.all, 'stats'] as const,
  },
  
  // Maintenance
  maintenance: {
    all: ['maintenance'] as const,
    lists: () => [...queryKeys.maintenance.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.maintenance.lists(), { filters }] as const,
    details: () => [...queryKeys.maintenance.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.maintenance.details(), id] as const,
    byProperty: (propertyId: string) => [...queryKeys.properties.detail(propertyId), 'maintenance'] as const,
    byUnit: (unitId: string) => [...queryKeys.units.detail(unitId), 'maintenance'] as const,
    alerts: () => [...queryKeys.maintenance.all, 'alerts'] as const,
    stats: () => [...queryKeys.maintenance.all, 'stats'] as const,
  },
  
  // Subscriptions & Billing
  subscriptions: {
    all: ['subscriptions'] as const,
    current: () => [...queryKeys.subscriptions.all, 'current'] as const,
    plan: (planId?: string) => [...queryKeys.subscriptions.all, 'plan', planId] as const,
    usage: (userId?: string) => [...queryKeys.subscriptions.all, 'usage', userId] as const,
    billing: (userId?: string) => [...queryKeys.subscriptions.all, 'billing', userId] as const,
    premium: () => [...queryKeys.subscriptions.all, 'premium'] as const,
    invoices: () => [...queryKeys.subscriptions.all, 'invoices'] as const,
  },
  
  // Reports & Analytics
  reports: {
    all: ['reports'] as const,
    financial: () => [...queryKeys.reports.all, 'financial'] as const,
    occupancy: () => [...queryKeys.reports.all, 'occupancy'] as const,
    maintenance: () => [...queryKeys.reports.all, 'maintenance'] as const,
    custom: (reportId: string) => [...queryKeys.reports.all, 'custom', reportId] as const,
  },
  
  // Tools
  tools: {
    all: ['tools'] as const,
    leaseGenerator: () => [...queryKeys.tools.all, 'lease-generator'] as const,
    rentCalculator: () => [...queryKeys.tools.all, 'rent-calculator'] as const,
    invoiceGenerator: () => [...queryKeys.tools.all, 'invoice-generator'] as const,
  },
} as const

// Query key validation helper
export function validateQueryKey(key: readonly unknown[]): boolean {
  return Array.isArray(key) && key.length > 0 && typeof key[0] === 'string'
}

// Query key utilities for invalidation patterns
export const queryInvalidation = {
  // Invalidate all property-related data
  invalidatePropertyData: (propertyId: string) => [
    queryKeys.properties.detail(propertyId),
    queryKeys.units.byProperty(propertyId),
    queryKeys.leases.byProperty(propertyId),
    queryKeys.maintenance.byProperty(propertyId),
    queryKeys.properties.stats(),
  ],
  
  // Invalidate all tenant-related data
  invalidateTenantData: (tenantId: string) => [
    queryKeys.tenants.detail(tenantId),
    queryKeys.leases.byTenant(tenantId),
    queryKeys.tenants.stats(),
  ],
  
  // Invalidate all unit-related data
  invalidateUnitData: (unitId: string) => [
    queryKeys.units.detail(unitId),
    queryKeys.leases.byUnit(unitId),
    queryKeys.maintenance.byUnit(unitId),
    queryKeys.units.stats(),
  ],
  
  // Invalidate all lease-related data
  invalidateLeaseData: (leaseId: string) => [
    queryKeys.leases.detail(leaseId),
    queryKeys.leases.expiring(),
    queryKeys.leases.stats(),
  ],
  
  // Invalidate all subscription-related data
  invalidateSubscriptionData: () => [
    queryKeys.subscriptions.all,
  ],
  
  // Invalidate all stats
  invalidateAllStats: () => [
    queryKeys.properties.stats(),
    queryKeys.units.stats(),
    queryKeys.tenants.stats(),
    queryKeys.leases.stats(),
    queryKeys.maintenance.stats(),
  ],
}

// Prefetch patterns for common navigation flows
export const prefetchPatterns = {
  // When viewing a property, prefetch related data
  propertyDetailView: (propertyId: string) => [
    queryKeys.units.byProperty(propertyId),
    queryKeys.leases.byProperty(propertyId),
    queryKeys.maintenance.byProperty(propertyId),
  ],
  
  // When viewing tenant list, prefetch stats
  tenantListView: () => [
    queryKeys.tenants.stats(),
    queryKeys.leases.stats(),
  ],
  
  // When viewing dashboard, prefetch all stats
  dashboardView: () => [
    queryKeys.properties.stats(),
    queryKeys.units.stats(),
    queryKeys.tenants.stats(),
    queryKeys.leases.stats(),
    queryKeys.maintenance.alerts(),
  ],
}