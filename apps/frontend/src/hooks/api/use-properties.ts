/**
 * React Query hooks for Properties
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult 
} from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { queryKeys, mutationKeys } from '@/lib/react-query/query-client'
import type { 
  Property, 
  PropertyQuery, 
  CreatePropertyInput, 
  UpdatePropertyInput 
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { toast } from 'sonner'

/**
 * Fetch list of properties with optional filters
 */
export function useProperties(
  query?: PropertyQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Property[], Error> {
  return useQuery({
    queryKey: queryKeys.propertyList(query),
    queryFn: async () => {
      const response = await apiClient.get<Property[]>('/properties', { 
        params: createQueryAdapter(query)
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch single property by ID
 */
export function useProperty(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Property, Error> {
  return useQuery({
    queryKey: queryKeys.propertyDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Property>(`/properties/${id}`)
      return response.data
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
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
  return useQuery({
    queryKey: queryKeys.propertyStats(),
    queryFn: async () => {
      const response = await apiClient.get<{
        total: number
        occupied: number
        vacant: number
        occupancyRate: number
        totalMonthlyRent: number
        averageRent: number
      }>('/properties/stats')
      return response.data
    },
  })
}

/**
 * Create new property with optimistic updates
 */
export function useCreateProperty(): UseMutationResult<
  Property,
  Error,
  CreatePropertyInput
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.createProperty,
    mutationFn: async (data: CreatePropertyInput) => {
      const response = await apiClient.post<Property>('/properties', createMutationAdapter(data))
      return response.data
    },
    onMutate: async (newProperty) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.properties() 
      })

      // Snapshot previous value
      const previousProperties = queryClient.getQueryData<Property[]>(
        queryKeys.propertyList()
      )

      // Optimistically update
      if (previousProperties) {
        queryClient.setQueryData<Property[]>(
          queryKeys.propertyList(),
          [...previousProperties, { 
            ...newProperty, 
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Property]
        )
      }

      return { previousProperties }
    },
    onError: (err, _, context) => {
      // Rollback on error
      if (context?.previousProperties) {
        queryClient.setQueryData(
          queryKeys.propertyList(),
          context.previousProperties
        )
      }
      toast.error('Failed to create property')
    },
    onSuccess: (_data) => {
      toast.success('Property created successfully')
      // Invalidate and refetch
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties() 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.propertyStats() 
      })
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updateProperty,
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Property>(
        `/properties/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    onMutate: async ({ id, data }) => {
      // Cancel queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.propertyDetail(id) 
      })

      // Snapshot previous
      const previousProperty = queryClient.getQueryData<Property>(
        queryKeys.propertyDetail(id)
      )

      // Optimistically update
      if (previousProperty) {
        queryClient.setQueryData<Property>(
          queryKeys.propertyDetail(id),
          { ...previousProperty, ...data }
        )
      }

      // Also update in list
      const previousList = queryClient.getQueryData<Property[]>(
        queryKeys.propertyList()
      )
      if (previousList) {
        queryClient.setQueryData<Property[]>(
          queryKeys.propertyList(),
          previousList.map(p => 
            p.id === id ? { ...p, ...data } : p
          )
        )
      }

      return { previousProperty, previousList }
    },
    onError: (err, { id }, context) => {
      // Rollback
      if (context?.previousProperty) {
        queryClient.setQueryData(
          queryKeys.propertyDetail(id),
          context.previousProperty
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.propertyList(),
          context.previousList
        )
      }
      toast.error('Failed to update property')
    },
    onSuccess: (_data, { id }) => {
      toast.success('Property updated successfully')
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.propertyDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.propertyList() 
      })
    },
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
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.deleteProperty,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/properties/${id}`)
    },
    onMutate: async (id) => {
      // Cancel queries
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.properties() 
      })

      // Snapshot previous
      const previousList = queryClient.getQueryData<Property[]>(
        queryKeys.propertyList()
      )

      // Optimistically remove
      if (previousList) {
        queryClient.setQueryData<Property[]>(
          queryKeys.propertyList(),
          previousList.filter(p => p.id !== id)
        )
      }

      return { previousList }
    },
    onError: (err, _, context) => {
      // Rollback
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.propertyList(),
          context.previousList
        )
      }
      toast.error('Failed to delete property')
    },
    onSuccess: () => {
      toast.success('Property deleted successfully')
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties() 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.propertyStats() 
      })
    },
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