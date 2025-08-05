import type { QueryClient} from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys, queryInvalidation, prefetchPatterns } from './query-keys'
import type { 
  Property, 
  Unit, 
  Tenant, 
  Lease,
  PropertyWithDetails,
  UnitWithDetails,
  TenantWithDetails,
  LeaseWithDetails
} from '@repo/shared'

/**
 * Enhanced query utilities for optimistic updates and cache management
 * Implements TanStack Query best practices for performance and UX
 */

// Query list response type
interface QueryListResponse<T> {
  items?: T[]
  properties?: Property[]
  tenants?: Tenant[]
  units?: Unit[]
  leases?: Lease[]
  total: number
}

// Generic updater function type
type QueryUpdater<T> = (old: T | undefined) => T | undefined

// Optimistic update helpers
export const optimisticUpdates = {
  // Property optimistic updates
  updateProperty: async (
    queryClient: QueryClient,
    propertyId: string,
    updater: QueryUpdater<Property | PropertyWithDetails>
  ) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.properties.detail(propertyId) })
    
    const previousData = queryClient.getQueryData(queryKeys.properties.detail(propertyId))
    
    queryClient.setQueryData(queryKeys.properties.detail(propertyId), updater)
    
    return { previousData }
  },
  
  // Add property optimistically to list
  addPropertyToList: (
    queryClient: QueryClient,
    newProperty: Property,
    filters?: Record<string, unknown>
  ) => {
    const queryKey = queryKeys.properties.list(filters)
    
    queryClient.setQueryData(queryKey, (old: QueryListResponse<Property> | undefined) => {
      if (!old) return { properties: [newProperty], total: 1 }
      
      return {
        ...old,
        properties: [newProperty, ...(old.properties || [])],
        total: (old.total || 0) + 1,
      }
    })
  },
  
  // Remove property optimistically from list
  removePropertyFromList: (
    queryClient: QueryClient,
    propertyId: string,
    filters?: Record<string, unknown>
  ) => {
    const queryKey = queryKeys.properties.list(filters)
    
    queryClient.setQueryData(queryKey, (old: QueryListResponse<Property> | undefined) => {
      if (!old) return old
      
      return {
        ...old,
        properties: (old.properties || []).filter((p: Property) => p.id !== propertyId),
        total: Math.max(0, (old.total || 0) - 1),
      }
    })
  },
  
  // Tenant optimistic updates
  updateTenant: async (
    queryClient: QueryClient,
    tenantId: string,
    updater: QueryUpdater<Tenant | TenantWithDetails>
  ) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.tenants.detail(tenantId) })
    
    const previousData = queryClient.getQueryData(queryKeys.tenants.detail(tenantId))
    
    queryClient.setQueryData(queryKeys.tenants.detail(tenantId), updater)
    
    return { previousData }
  },
  
  // Unit optimistic updates
  updateUnit: async (
    queryClient: QueryClient,
    unitId: string,
    updater: QueryUpdater<Unit | UnitWithDetails>
  ) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.units.detail(unitId) })
    
    const previousData = queryClient.getQueryData(queryKeys.units.detail(unitId))
    
    queryClient.setQueryData(queryKeys.units.detail(unitId), updater)
    
    return { previousData }
  },
  
  // Lease optimistic updates
  updateLease: async (
    queryClient: QueryClient,
    leaseId: string,
    updater: QueryUpdater<Lease | LeaseWithDetails>
  ) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.leases.detail(leaseId) })
    
    const previousData = queryClient.getQueryData(queryKeys.leases.detail(leaseId))
    
    queryClient.setQueryData(queryKeys.leases.detail(leaseId), updater)
    
    return { previousData }
  },
}

// Cache invalidation utilities
export const cacheInvalidation = {
  // Smart invalidation that only invalidates affected queries
  invalidateProperty: async (queryClient: QueryClient, propertyId: string) => {
    const invalidationKeys = queryInvalidation.invalidatePropertyData(propertyId)
    
    await Promise.all(
      invalidationKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: key })
      )
    )
  },
  
  invalidateTenant: async (queryClient: QueryClient, tenantId: string) => {
    const invalidationKeys = queryInvalidation.invalidateTenantData(tenantId)
    
    await Promise.all(
      invalidationKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: key })
      )
    )
  },
  
  invalidateUnit: async (queryClient: QueryClient, unitId: string) => {
    const invalidationKeys = queryInvalidation.invalidateUnitData(unitId)
    
    await Promise.all(
      invalidationKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: key })
      )
    )
  },
  
  invalidateLease: async (queryClient: QueryClient, leaseId: string) => {
    const invalidationKeys = queryInvalidation.invalidateLeaseData(leaseId)
    
    await Promise.all(
      invalidationKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: key })
      )
    )
  },
  
  invalidateAllStats: async (queryClient: QueryClient) => {
    const invalidationKeys = queryInvalidation.invalidateAllStats()
    
    await Promise.all(
      invalidationKeys.map(key => 
        queryClient.invalidateQueries({ queryKey: key })
      )
    )
  },
}

// Prefetching utilities for better UX
export const prefetchUtils = {
  // Prefetch property details and related data
  prefetchPropertyDetail: async (queryClient: QueryClient, propertyId: string, fetcher: (id: string) => Promise<PropertyWithDetails>) => {
    // Prefetch property detail if not already cached
    await queryClient.prefetchQuery({
      queryKey: queryKeys.properties.detail(propertyId),
      queryFn: () => fetcher(propertyId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
    
    // Prefetch related data
    prefetchPatterns.propertyDetailView(propertyId)
    // Note: Would need individual fetchers for each related query
  },
  
  // Prefetch dashboard data
  prefetchDashboard: async (queryClient: QueryClient, fetchers: Record<string, () => Promise<unknown>>) => {
    const dashboardKeys = prefetchPatterns.dashboardView()
    
    // Prefetch all dashboard stats in parallel
    await Promise.allSettled(
      dashboardKeys.map(key => {
        const keyString = key.join('.')
        const fetcher = fetchers[keyString]
        
        if (fetcher) {
          return queryClient.prefetchQuery({
            queryKey: key,
            queryFn: fetcher,
            staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
          })
        }
        
        return Promise.resolve()
      })
    )
  },
}

// Background sync utilities
export const backgroundSync = {
  // Sync property data in background
  syncPropertyData: async (queryClient: QueryClient, propertyId: string) => {
    // Refetch property data in background without showing loading state
    await queryClient.refetchQueries({
      queryKey: queryKeys.properties.detail(propertyId),
      type: 'active',
    })
    
    // Also sync related data
    const relatedKeys = queryInvalidation.invalidatePropertyData(propertyId)
    await Promise.allSettled(
      relatedKeys.map(key =>
        queryClient.refetchQueries({
          queryKey: key,
          type: 'active',
        })
      )
    )
  },
  
  // Sync all stats periodically
  syncAllStats: async (queryClient: QueryClient) => {
    const statsKeys = queryInvalidation.invalidateAllStats()
    
    await Promise.allSettled(
      statsKeys.map(key =>
        queryClient.refetchQueries({
          queryKey: key,
          type: 'active',
        })
      )
    )
  },
}

// Custom hooks for common query patterns
export const useOptimisticMutations = () => {
  const queryClient = useQueryClient()
  
  return {
    // Property mutations with optimistic updates
    optimisticUpdateProperty: (propertyId: string, updater: QueryUpdater<Property | PropertyWithDetails>) =>
      optimisticUpdates.updateProperty(queryClient, propertyId, updater),
    
    optimisticAddProperty: (newProperty: Property, filters?: Record<string, unknown>) =>
      optimisticUpdates.addPropertyToList(queryClient, newProperty, filters),
    
    optimisticRemoveProperty: (propertyId: string, filters?: Record<string, unknown>) =>
      optimisticUpdates.removePropertyFromList(queryClient, propertyId, filters),
    
    // Tenant mutations with optimistic updates
    optimisticUpdateTenant: (tenantId: string, updater: QueryUpdater<Tenant | TenantWithDetails>) =>
      optimisticUpdates.updateTenant(queryClient, tenantId, updater),
    
    // Unit mutations with optimistic updates
    optimisticUpdateUnit: (unitId: string, updater: QueryUpdater<Unit | UnitWithDetails>) =>
      optimisticUpdates.updateUnit(queryClient, unitId, updater),
    
    // Lease mutations with optimistic updates
    optimisticUpdateLease: (leaseId: string, updater: QueryUpdater<Lease | LeaseWithDetails>) =>
      optimisticUpdates.updateLease(queryClient, leaseId, updater),
  }
}

export const useCacheManagement = () => {
  const queryClient = useQueryClient()
  
  return {
    // Invalidation methods
    invalidateProperty: (propertyId: string) =>
      cacheInvalidation.invalidateProperty(queryClient, propertyId),
    
    invalidateTenant: (tenantId: string) =>
      cacheInvalidation.invalidateTenant(queryClient, tenantId),
    
    invalidateUnit: (unitId: string) =>
      cacheInvalidation.invalidateUnit(queryClient, unitId),
    
    invalidateLease: (leaseId: string) =>
      cacheInvalidation.invalidateLease(queryClient, leaseId),
    
    invalidateAllStats: () =>
      cacheInvalidation.invalidateAllStats(queryClient),
    
    // Background sync methods
    syncPropertyData: (propertyId: string) =>
      backgroundSync.syncPropertyData(queryClient, propertyId),
    
    syncAllStats: () =>
      backgroundSync.syncAllStats(queryClient),
  }
}