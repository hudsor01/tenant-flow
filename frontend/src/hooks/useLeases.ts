import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import { toast } from 'sonner'
import type {
  LeaseWithDetails,
  CreateLeaseDto,
  UpdateLeaseDto,
  LeaseQuery,
} from '../types/api'

// Leases list hook
export function useLeases(query?: LeaseQuery) {
  return useQuery({
    queryKey: queryKeys.leases.list(query),
    queryFn: () => apiClient.leases.getAll(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Single lease hook
export function useLease(id: string) {
  return useQuery({
    queryKey: queryKeys.leases.detail(id),
    queryFn: () => apiClient.leases.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Create lease mutation
export function useCreateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLeaseDto) => apiClient.leases.create(data),
    onSuccess: (newLease: LeaseWithDetails) => {
      // Invalidate and refetch leases list
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.stats() })
      
      // Add the new lease to cache
      queryClient.setQueryData(
        queryKeys.leases.detail(newLease.id),
        newLease
      )
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
      
      toast.success('Lease created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update lease mutation
export function useUpdateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaseDto }) =>
      apiClient.leases.update(id, data),
    onSuccess: (updatedLease: LeaseWithDetails) => {
      // Update the lease in cache
      queryClient.setQueryData(
        queryKeys.leases.detail(updatedLease.id),
        updatedLease
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      
      toast.success('Lease updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete lease mutation
export function useDeleteLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.leases.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove lease from cache
      queryClient.removeQueries({ queryKey: queryKeys.leases.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      
      toast.success('Lease deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Lease statistics hook
export function useLeaseStats() {
  return useQuery({
    queryKey: queryKeys.leases.stats(),
    queryFn: () => apiClient.leases.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Expiring leases hook
export function useExpiringLeases(days: number = 30) {
  return useQuery({
    queryKey: queryKeys.leases.expiring(days),
    queryFn: () => apiClient.leases.getExpiring(days),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Leases by unit hook
export function useLeasesByUnit(unitId: string) {
  return useQuery({
    queryKey: queryKeys.leases.byUnit(unitId),
    queryFn: () => apiClient.leases.getAll({ unitId }),
    staleTime: 5 * 60 * 1000,
    enabled: !!unitId && apiClient.auth.isAuthenticated(),
  })
}

// Combined hook for lease management
export function useLeaseActions() {
  const createLease = useCreateLease()
  const updateLease = useUpdateLease()
  const deleteLease = useDeleteLease()

  return {
    create: createLease,
    update: updateLease,
    delete: deleteLease,
    isLoading:
      createLease.isPending ||
      updateLease.isPending ||
      deleteLease.isPending,
  }
}