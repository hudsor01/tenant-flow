/**
 * React Query hooks for Properties
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
  type UseQueryResult,
  type UseMutationResult,
  useQueryClient
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type { 
  Property, 
  PropertyQuery, 
  CreatePropertyInput, 
  UpdatePropertyInput 
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { useQueryFactory,  useDetailQuery, useMutationFactory, useStatsQuery } from '../query-factory'

/**
 * Fetch list of properties with optional filters
 */
export function useProperties(
  query?: PropertyQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Property[], Error> {
  return useQueryFactory({
    queryKey: ['tenantflow', 'properties', 'list', query],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Property[]>('/properties', { 
          params: createQueryAdapter(query)
        })
        return response.data
      } catch {
        console.warn('Properties API unavailable, returning empty list')
        return [] // Return empty array on error to allow UI to render
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Fetch single property by ID
 */
export function useProperty(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Property, Error> {
  return useDetailQuery(
    'properties',
    Boolean(id) && (options?.enabled ?? true) ? id : undefined,
    async (id: string) => {
      const response = await apiClient.get<Property>(`/properties/${id}`)
      return response.data
    }
  )
}

/**
 * Fetch property statistics
 */
export function usePropertyStats(): UseQueryResult<{
  total: number
  occupied: number
  vacant: number
  occupancyRate: number
  totalMonthlyRent: number
  averageRent: number
}, Error> {
  return useStatsQuery(
    'properties',
    async () => {
      const response = await apiClient.get<{
        total: number
        occupied: number
        vacant: number
        occupancyRate: number
        totalMonthlyRent: number
        averageRent: number
      }>('/properties/stats')
      return response.data
    }
  )
}

/**
 * Create new property with optimistic updates
 */
export function useCreateProperty(): UseMutationResult<
  Property,
  Error,
  CreatePropertyInput
> {
  return useMutationFactory({
    mutationFn: async (data: CreatePropertyInput) => {
      const response = await apiClient.post<Property>('/properties', createMutationAdapter(data))
      return response.data
    },
    invalidateKeys: [
      queryKeys.properties(),
      queryKeys.propertyStats()
    ],
    successMessage: 'Property created successfully',
    errorMessage: 'Failed to create property',
    optimisticUpdate: {
      queryKey: queryKeys.propertyList(),
      updater: (oldData: unknown, variables: CreatePropertyInput) => {
        const previousProperties = oldData as Property[]
        return previousProperties ? [...previousProperties, { 
          ...variables, 
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Property] : []
      }
    }
  })
}

/**
 * Update property with optimistic updates
 */
export function useUpdateProperty(): UseMutationResult<
  Property,
  Error,
  { id: string; data: UpdatePropertyInput }
> {
  return useMutationFactory({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Property>(
        `/properties/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [
      queryKeys.properties(),
      queryKeys.propertyStats()
    ],
    successMessage: 'Property updated successfully',
    errorMessage: 'Failed to update property',
    optimisticUpdate: {
      queryKey: queryKeys.propertyList(),
      updater: (oldData: unknown, { id, data }: { id: string; data: UpdatePropertyInput }) => {
        const previousList = oldData as Property[]
        return previousList ? previousList.map(p => 
          p.id === id ? { ...p, ...data } : p
        ) : []
      }
    }
  })
}

/**
 * Delete property with optimistic updates
 */
export function useDeleteProperty(): UseMutationResult<
  void,
  Error,
  string
> {
  return useMutationFactory({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/properties/${id}`)
    },
    invalidateKeys: [
      queryKeys.properties(),
      queryKeys.propertyStats()
    ],
    successMessage: 'Property deleted successfully',
    errorMessage: 'Failed to delete property',
    optimisticUpdate: {
      queryKey: queryKeys.propertyList(),
      updater: (oldData: unknown, id: string) => {
        const previousList = oldData as Property[]
        return previousList ? previousList.filter(p => p.id !== id) : []
      }
    }
  })
}

/**
 * Prefetch property data (for hover effects, etc.)
 */
export function usePrefetchProperty() {
  const queryClient = useQueryClient()

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.propertyDetail(id),
      queryFn: async () => {
        const response = await apiClient.get<Property>(`/properties/${id}`)
        return response.data
      },
      staleTime: 10 * 1000, // Consider data stale after 10 seconds
    })
  }
}