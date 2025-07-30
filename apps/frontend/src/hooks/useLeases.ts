import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { handleApiError } from '@/lib/utils'
import { toast } from 'sonner'
import type { 
  LeaseWithDetails
} from '@tenantflow/shared/types/relations'
import type {
  CreateLeaseInput, 
  UpdateLeaseInput 
} from '@tenantflow/shared/types/api-inputs'
import type { LeaseQuery } from '@tenantflow/shared/types/queries'


// Only allow valid status values for API
const allowedStatuses = ['PENDING', 'EXPIRED', 'ACTIVE', 'TERMINATED'] as const
type AllowedStatus = (typeof allowedStatuses)[number]

// Main leases resource with enhanced features
export const useLeases = (query?: LeaseQuery) => {
  let safeQuery:
    | { status?: AllowedStatus; tenantId?: string; propertyId?: string }
    | undefined = undefined
  if (query) {
    safeQuery = {}
    if (typeof query.tenantId === 'string')
      safeQuery.tenantId = query.tenantId
    if (typeof query.propertyId === 'string')
      safeQuery.propertyId = query.propertyId
    if (
      query.status &&
      allowedStatuses.includes(query.status as AllowedStatus)
    ) {
      safeQuery.status = query.status as AllowedStatus
    }
  }

  return useQuery({
    queryKey: ['leases', 'list', safeQuery],
    queryFn: async () => {
      const response = await api.leases.list(safeQuery as Record<string, unknown>)
      return response.data
    },
    ...cacheConfig.business,
    retry: 3,
    refetchInterval: 60000
  })
}

// Single lease with smart caching
export const useLease = (id: string) => {
  return useQuery({
    queryKey: ['leases', 'byId', id],
    queryFn: async () => {
      const response = await api.leases.get(id)
      return response.data
    },
    ...cacheConfig.business,
    retry: 2,
    enabled: !!id
  })
}

// Expiring leases with configurable threshold
export const useExpiringLeases = (days = 30) => {
  return useQuery({
    queryKey: ['leases', 'expiring', days],
    queryFn: async () => {
      const response = await api.leases.list({ expiring: days.toString() })
      return response.data
    },
    ...cacheConfig.business,
    refetchInterval: 5 * 60 * 1000
  })
}

// Lease calculations - Enhanced with memoization
export function useLeaseCalculations(lease?: LeaseWithDetails) {
  return useMemo(() => {
    if (!lease) return null

    const now = Date.now()
    const endDate = lease.endDate ? new Date(lease.endDate).getTime() : null
    const startDate = lease.startDate
      ? new Date(lease.startDate).getTime()
      : null

    const daysUntilExpiry = endDate
      ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
      : null

    return {
      daysUntilExpiry,

      isExpiringSoon: (days = 30) =>
        daysUntilExpiry !== null &&
        daysUntilExpiry <= days &&
        daysUntilExpiry > 0,

      isExpired: endDate ? endDate < now : false,

      monthsRemaining: endDate
        ? Math.max(
            0,
            Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30))
          )
        : null,

      totalRentAmount:
        lease.rentAmount && startDate && endDate
          ? (() => {
              const start = new Date(startDate)
              const end = new Date(endDate)
              const months =
                (end.getFullYear() - start.getFullYear()) * 12 +
                (end.getMonth() - start.getMonth())
              return lease.rentAmount * months
            })()
          : null
    }
  }, [lease])
}

// Lease mutations
export const useCreateLease = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLeaseInput) => {
      const response = await api.leases.create(input as unknown as Record<string, unknown>)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.all })
      toast.success('Lease created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export const useUpdateLease = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateLeaseInput) => {
      const { id, ...updateData } = input
      const response = await api.leases.update(id, updateData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.all })
      toast.success('Lease updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

export const useDeleteLease = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.leases.delete(variables.id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.all })
      toast.success('Lease deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Combined actions with ALL the superpowers
export function useLeaseActions() {
  const leasesQuery = useLeases()
  const createMutation = useCreateLease()
  const updateMutation = useUpdateLease()
  const deleteMutation = useDeleteLease()

  return {
    // Query data
    data: leasesQuery.data || [],
    loading: leasesQuery.isLoading,
    error: leasesQuery.error,
    refresh: leasesQuery.refetch,

    // CRUD operations
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,

    // Loading states
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    // Enhanced loading states
    anyLoading:
      leasesQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending
  }
}