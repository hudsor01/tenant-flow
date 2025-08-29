/**
 * Generic Prefetch Resource Hook
 * 
 * ARCHITECTURE: Single implementation for all prefetch patterns
 * ELIMINATES: 4 duplicate prefetch functions (usePrefetchTenant, usePrefetchProperty, etc.)
 * PRINCIPLE: DRY - Don't Repeat Yourself
 */

import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { Tenant, Property, Unit, Lease } from '@repo/shared'
import { apiGet } from '@/lib/utils/api-utils'
import { queryKeys } from '@/lib/react-query/query-keys'

// Type mapping for API resources
type ResourceType = 'tenant' | 'property' | 'unit' | 'lease'
type ResourceDataMap = {
  tenant: Tenant
  property: Property
  unit: Unit
  lease: Lease
}

// Query key factory mapping
const queryKeyFactories = {
  tenant: queryKeys.tenants.detail,
  property: queryKeys.properties.detail,
  unit: queryKeys.units.detail,
  lease: queryKeys.leases.detail
} as const

// API endpoint mapping
const apiEndpoints = {
  tenant: '/api/tenants',
  property: '/api/properties',
  unit: '/api/units',
  lease: '/api/leases'
} as const

/**
 * Generic prefetch hook for any resource type
 * 
 * @param resourceType - The type of resource to prefetch ('tenant', 'property', etc.)
 * @returns Function that prefetches the resource by ID
 * 
 * @example
 * ```typescript
 * const prefetchTenant = usePrefetchResource('tenant')
 * prefetchTenant('123') // Prefetches tenant with ID 123
 * ```
 */
export function usePrefetchResource<T extends ResourceType>(resourceType: T) {
  const queryClient = useQueryClient()

  return (id: string) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeyFactories[resourceType](id) as QueryKey,
      queryFn: async () => 
        apiGet<ResourceDataMap[T]>(`${apiEndpoints[resourceType]}/${id}`),
      staleTime: 10 * 1000 // 10 seconds (consistent with existing pattern)
    })
  }
}

/**
 * Typed prefetch hooks for each resource (maintains existing API surface)
 * These are thin wrappers around the generic implementation
 */
export const usePrefetchTenant = () => usePrefetchResource('tenant')
export const usePrefetchProperty = () => usePrefetchResource('property')  
export const usePrefetchUnit = () => usePrefetchResource('unit')
export const usePrefetchLease = () => usePrefetchResource('lease')

/**
 * Multi-resource prefetch hook for prefetching multiple resource types at once
 * 
 * @param resources - Array of resource configurations to prefetch
 * @returns Function that prefetches all specified resources
 * 
 * @example
 * ```typescript
 * const prefetchMultiple = usePrefetchMultiple([
 *   { type: 'property', id: 'prop-123' },
 *   { type: 'tenant', id: 'tenant-456' }
 * ])
 * prefetchMultiple() // Prefetches both resources
 * ```
 */
export function usePrefetchMultiple(
  resources: Array<{ type: ResourceType; id: string }>
) {
  const queryClient = useQueryClient()

  return () => {
    resources.forEach(({ type, id }) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeyFactories[type](id) as QueryKey,
        queryFn: async () => 
          apiGet<ResourceDataMap[typeof type]>(`${apiEndpoints[type]}/${id}`),
        staleTime: 10 * 1000
      })
    })
  }
}