/**
 * React Query hooks for Leases
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
  Lease, 
  LeaseQuery, 
  CreateLeaseInput, 
  UpdateLeaseInput 
} from '@repo/shared'
import { toast } from 'sonner'

/**
 * Fetch list of leases with optional filters
 */
export function useLeases(
  query?: LeaseQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
  return useQuery({
    queryKey: queryKeys.leaseList(query),
    queryFn: async () => {
      const response = await apiClient.get<Lease[]>('/leases', { 
        params: query 
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch single lease by ID
 */
export function useLease(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Lease, Error> {
  return useQuery({
    queryKey: queryKeys.leaseDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Lease>(`/leases/${id}`)
      return response.data
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

/**
 * Fetch leases by property ID
 */
export function useLeasesByProperty(
  propertyId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
  return useQuery({
    queryKey: queryKeys.leasesByProperty(propertyId),
    queryFn: async () => {
      const response = await apiClient.get<Lease[]>(`/properties/${propertyId}/leases`)
      return response.data
    },
    enabled: Boolean(propertyId) && (options?.enabled ?? true),
  })
}

/**
 * Create new lease with optimistic updates
 */
export function useCreateLease(): UseMutationResult<
  Lease,
  Error,
  CreateLeaseInput
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.createLease,
    mutationFn: async (data: CreateLeaseInput) => {
      const response = await apiClient.post<Lease>('/leases', data)
      return response.data
    },
    onMutate: async (newLease) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.leases() 
      })

      const previousLeases = queryClient.getQueryData<Lease[]>(
        queryKeys.leaseList()
      )

      if (previousLeases) {
        queryClient.setQueryData<Lease[]>(
          queryKeys.leaseList(),
          [...previousLeases, { 
            ...newLease, 
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Lease]
        )
      }

      return { previousLeases }
    },
    onError: (err, _, context) => {
      if (context?.previousLeases) {
        queryClient.setQueryData(
          queryKeys.leaseList(),
          context.previousLeases
        )
      }
      toast.error('Failed to create lease')
    },
    onSuccess: (data, variables) => {
      toast.success('Lease created successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leases() 
      })
      // Invalidate property-specific queries if property ID exists
      if ('propertyId' in variables && variables.propertyId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.leasesByProperty(variables.propertyId as string) 
        })
      }
    },
  })
}

/**
 * Update lease with optimistic updates
 */
export function useUpdateLease(): UseMutationResult<
  Lease,
  Error,
  { id: string; data: UpdateLeaseInput }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updateLease,
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Lease>(
        `/leases/${id}`,
        data
      )
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.leaseDetail(id) 
      })

      const previousLease = queryClient.getQueryData<Lease>(
        queryKeys.leaseDetail(id)
      )

      if (previousLease) {
        queryClient.setQueryData<Lease>(
          queryKeys.leaseDetail(id),
          { ...previousLease, ...data }
        )
      }

      const previousList = queryClient.getQueryData<Lease[]>(
        queryKeys.leaseList()
      )
      if (previousList) {
        queryClient.setQueryData<Lease[]>(
          queryKeys.leaseList(),
          previousList.map(l => 
            l.id === id ? { ...l, ...data } : l
          )
        )
      }

      return { previousLease, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousLease) {
        queryClient.setQueryData(
          queryKeys.leaseDetail(id),
          context.previousLease
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.leaseList(),
          context.previousList
        )
      }
      toast.error('Failed to update lease')
    },
    onSuccess: (data, { id }) => {
      toast.success('Lease updated successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leaseDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leaseList() 
      })
    },
  })
}

/**
 * Delete lease with optimistic updates
 */
export function useDeleteLease(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.deleteLease,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leases/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.leases() 
      })

      const previousList = queryClient.getQueryData<Lease[]>(
        queryKeys.leaseList()
      )

      if (previousList) {
        queryClient.setQueryData<Lease[]>(
          queryKeys.leaseList(),
          previousList.filter(l => l.id !== id)
        )
      }

      return { previousList }
    },
    onError: (err, _, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.leaseList(),
          context.previousList
        )
      }
      toast.error('Failed to delete lease')
    },
    onSuccess: () => {
      toast.success('Lease deleted successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leases() 
      })
    },
  })
}

/**
 * Renew lease mutation
 */
export function useRenewLease(): UseMutationResult<
  Lease,
  Error,
  { id: string; endDate: Date }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, endDate }) => {
      const response = await apiClient.post<Lease>(
        `/leases/${id}/renew`,
        { endDate }
      )
      return response.data
    },
    onSuccess: (data, { id }) => {
      toast.success('Lease renewed successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leaseDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.leaseList() 
      })
    },
    onError: () => {
      toast.error('Failed to renew lease')
    },
  })
}