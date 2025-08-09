/**
 * React Query hooks for Leases
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
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
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { useListQuery, useDetailQuery, useMutationFactory } from '../query-factory'

/**
 * Fetch list of leases with optional filters
 */
export function useLeases(
  query?: LeaseQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
  return useListQuery(
    'leases',
    async (params) => {
      const response = await apiClient.get<Lease[]>('/leases', { 
        params: createQueryAdapter(params as LeaseQuery)
      })
      return response.data
    },
    query
  )
}

/**
 * Fetch single lease by ID
 */
export function useLease(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Lease, Error> {
  return useDetailQuery(
    'leases',
    Boolean(id) && (options?.enabled ?? true) ? id : undefined,
    async (id: string) => {
      const response = await apiClient.get<Lease>(`/leases/${id}`)
      return response.data
    }
  )
}

/**
 * Fetch leases by property ID
 */
export function useLeasesByProperty(
  propertyId: string,
  options?: { enabled?: boolean }
): UseQueryResult<Lease[], Error> {
  return useDetailQuery(
    'leases',
    Boolean(propertyId) && (options?.enabled ?? true) ? `property-${propertyId}` : undefined,
    async () => {
      const response = await apiClient.get<Lease[]>(`/properties/${propertyId}/leases`)
      return response.data
    }
  )
}

/**
 * Create new lease with optimistic updates
 */
export function useCreateLease(): UseMutationResult<
  Lease,
  Error,
  CreateLeaseInput
> {
  return useMutationFactory({
    mutationFn: async (data: CreateLeaseInput) => {
      const response = await apiClient.post<Lease>('/leases', createMutationAdapter(data))
      return response.data
    },
    invalidateKeys: [queryKeys.leases()],
    successMessage: 'Lease created successfully',
    errorMessage: 'Failed to create lease',
    optimisticUpdate: {
      queryKey: queryKeys.leaseList(),
      updater: (oldData: unknown, variables: CreateLeaseInput) => {
        const previousLeases = oldData as Lease[]
        return previousLeases ? [...previousLeases, { 
          ...variables, 
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Lease] : []
      }
    }
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
  return useMutationFactory({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Lease>(
        `/leases/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [queryKeys.leases()],
    successMessage: 'Lease updated successfully',
    errorMessage: 'Failed to update lease'
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
  return useMutationFactory({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leases/${id}`)
    },
    invalidateKeys: [queryKeys.leases()],
    successMessage: 'Lease deleted successfully',
    errorMessage: 'Failed to delete lease',
    optimisticUpdate: {
      queryKey: queryKeys.leaseList(),
      updater: (oldData: unknown, id: string) => {
        const previousList = oldData as Lease[]
        return previousList ? previousList.filter(l => l.id !== id) : []
      }
    }
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
  return useMutationFactory({
    mutationFn: async ({ id, endDate }) => {
      const response = await apiClient.post<Lease>(
        `/leases/${id}/renew`,
        createMutationAdapter({ endDate })
      )
      return response.data
    },
    invalidateKeys: [queryKeys.leases()],
    successMessage: 'Lease renewed successfully',
    errorMessage: 'Failed to renew lease'
  })
}