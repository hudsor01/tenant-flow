import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { leasesApi, throwIfError } from '../services/api'
import type { Lease } from '@/types/entities'
import type { LeaseWithRelations } from '@/types/relationships'
import type { CreateLeaseDto, UpdateLeaseDto } from '../services/api'

// Form data type (not stored in DB, just for UI)
interface LeaseFormData {
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rentAmount: number
  securityDeposit: number
  status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'TERMINATED'
}

export function useLeases(unitId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['leases', unitId, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID')

      const response = await leasesApi.getLeases()
      throwIfError(response)
      
      let leases = response.data || []
      
      // Filter by unit if provided
      if (unitId) {
        leases = leases.filter(lease => lease.unitId === unitId)
      }
      
      return leases as LeaseWithRelations[]
    },
    enabled: !!user?.id,
    retry: false,
  })
}

export function useCreateLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: LeaseFormData) => {
      if (!user?.id) throw new Error('No user ID')

      const createData: CreateLeaseDto = {
        unitId: data.unitId,
        tenantId: data.tenantId,
        startDate: data.startDate,
        endDate: data.endDate,
        rentAmount: data.rentAmount,
        securityDeposit: data.securityDeposit,
        status: data.status || 'ACTIVE',
      }

      const response = await leasesApi.createLease(createData)
      throwIfError(response)
      
      return response.data
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useUpdateLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LeaseFormData> }) => {
      if (!user?.id) throw new Error('No user ID')

      const updateData: UpdateLeaseDto = {
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate }),
        ...(data.rentAmount && { rentAmount: data.rentAmount }),
        ...(data.securityDeposit && { securityDeposit: data.securityDeposit }),
        ...(data.status && { status: data.status }),
      }

      const response = await leasesApi.updateLease(id, updateData)
      throwIfError(response)
      
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useDeleteLease() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('No user ID')

      const response = await leasesApi.deleteLease(id)
      throwIfError(response)
      
      return { leaseId: id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })
}

export function useLeasesByProperty(propertyId?: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['leases', 'property', propertyId],
    queryFn: async () => {
      if (!propertyId || !user?.id) throw new Error('Missing propertyId or user ID')

      const response = await leasesApi.getLeases()
      throwIfError(response)
      
      // Filter client-side for leases in the specific property
      const propertyLeases = (response.data || []).filter(lease => 
        lease.unit?.propertyId === propertyId
      )
      
      return propertyLeases as Lease[]
    },
    enabled: !!propertyId && !!user?.id,
  })
}