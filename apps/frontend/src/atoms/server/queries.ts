import { atomWithQuery } from 'jotai-tanstack-query'
import type { Tenant, PropertyWithUnits } from '@repo/shared'

// Example API functions (these would be implemented based on your API)
const fetchProperties = async (): Promise<PropertyWithUnits[]> => {
  // This would be your actual API call
  const response = await fetch('/api/properties')
  if (!response.ok) throw new Error('Failed to fetch properties')
  return response.json()
}

const fetchTenants = async (): Promise<Tenant[]> => {
  // This would be your actual API call
  const response = await fetch('/api/tenants')
  if (!response.ok) throw new Error('Failed to fetch tenants')
  return response.json()
}

const fetchPropertyById = async (id: string): Promise<PropertyWithUnits> => {
  const response = await fetch(`/api/properties/${id}`)
  if (!response.ok) throw new Error('Failed to fetch property')
  return response.json()
}

const fetchTenantById = async (id: string): Promise<Tenant> => {
  const response = await fetch(`/api/tenants/${id}`)
  if (!response.ok) throw new Error('Failed to fetch tenant')
  return response.json()
}

// Query atoms for server state (renamed to avoid conflicts)
export const serverPropertiesQueryAtom = atomWithQuery(() => ({
  queryKey: ['properties'],
  queryFn: fetchProperties,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
}))

export const serverTenantsQueryAtom = atomWithQuery(() => ({
  queryKey: ['tenants'],
  queryFn: fetchTenants,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
}))

// Dynamic query atoms
export const propertyQueryAtom = (id: string) =>
  atomWithQuery(() => ({
    queryKey: ['properties', id],
    queryFn: () => fetchPropertyById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  }))

export const tenantQueryAtom = (id: string) =>
  atomWithQuery(() => ({
    queryKey: ['tenants', id],
    queryFn: () => fetchTenantById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  }))

// Query key factories for cache invalidation
export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.properties.lists(), { filters }] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.properties.details(), id] as const,
  },
  tenants: {
    all: ['tenants'] as const,
    lists: () => [...queryKeys.tenants.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.tenants.lists(), { filters }] as const,
    details: () => [...queryKeys.tenants.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tenants.details(), id] as const,
  },
} as const