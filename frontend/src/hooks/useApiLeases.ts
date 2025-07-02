import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import type {
  LeaseWithDetails,
  CreateLeaseDto,
  UpdateLeaseDto,
} from '../types/api'
import type { LeaseQuery } from '../lib/api-client'
import { toast } from 'sonner'

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
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: apiClient.auth.isAuthenticated(),
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
      
      // Also invalidate related data
      if (newLease.unitId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.detail(newLease.unitId)
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.units.lists() })
      }
      
      if (newLease.tenantId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tenants.detail(newLease.tenantId)
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      }
      
      // Invalidate expiring leases
      queryClient.invalidateQueries({ 
        queryKey: ['leases', 'expiring'] 
      })
      
      // Add the new lease to cache
      queryClient.setQueryData(
        queryKeys.leases.detail(newLease.id),
        newLease
      )
      
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
      
      // Invalidate related data
      if (updatedLease.unitId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.units.detail(updatedLease.unitId)
        })
      }
      
      if (updatedLease.tenantId) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.tenants.detail(updatedLease.tenantId)
        })
      }
      
      // Invalidate expiring leases
      queryClient.invalidateQueries({ 
        queryKey: ['leases', 'expiring'] 
      })
      
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      
      // Invalidate expiring leases
      queryClient.invalidateQueries({ 
        queryKey: ['leases', 'expiring'] 
      })
      
      toast.success('Lease deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
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

// Hook for lease-related calculations
export function useLeaseCalculations(lease?: LeaseWithDetails) {
  return {
    daysUntilExpiry: lease?.endDate 
      ? Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
    
    isExpiringSoon: (days: number = 30) => {
      if (!lease?.endDate) return false
      const daysUntilExpiry = Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntilExpiry <= days && daysUntilExpiry > 0
    },
    
    isExpired: lease?.endDate 
      ? new Date(lease.endDate) < new Date()
      : false,
    
    monthsRemaining: lease?.endDate 
      ? Math.max(0, Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)))
      : null,
    
    totalRentAmount: lease?.rentAmount && lease?.startDate && lease?.endDate
      ? (() => {
          const start = new Date(lease.startDate)
          const end = new Date(lease.endDate)
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
          return lease.rentAmount * months
        })()
      : null,
  }
}