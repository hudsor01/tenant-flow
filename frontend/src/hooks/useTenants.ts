import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys, handleApiError } from '../lib/utils'
import { toast } from 'sonner'
import type {
  TenantWithDetails,
  CreateTenantDto,
  UpdateTenantDto,
  TenantQuery,
} from '../types/api'

// Tenants list hook
export function useTenants(query?: TenantQuery) {
  return useQuery({
    queryKey: queryKeys.tenants.list(query),
    queryFn: () => apiClient.tenants.getAll(query),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Single tenant hook
export function useTenant(id: string) {
  return useQuery({
    queryKey: queryKeys.tenants.detail(id),
    queryFn: () => apiClient.tenants.getById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id && apiClient.auth.isAuthenticated(),
  })
}

// Create tenant mutation
export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTenantDto) => apiClient.tenants.create(data),
    onSuccess: (newTenant: TenantWithDetails) => {
      // Invalidate and refetch tenants list
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
      
      // Add the new tenant to cache
      queryClient.setQueryData(
        queryKeys.tenants.detail(newTenant.id),
        newTenant
      )
      
      toast.success('Tenant created successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Update tenant mutation
export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantDto }) =>
      apiClient.tenants.update(id, data),
    onSuccess: (updatedTenant: TenantWithDetails) => {
      // Update the tenant in cache
      queryClient.setQueryData(
        queryKeys.tenants.detail(updatedTenant.id),
        updatedTenant
      )
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
      
      toast.success('Tenant updated successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Delete tenant mutation
export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.tenants.delete(id),
    onSuccess: (_, deletedId) => {
      // Remove tenant from cache
      queryClient.removeQueries({ queryKey: queryKeys.tenants.detail(deletedId) })
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.stats() })
      
      // Also invalidate related data
      queryClient.invalidateQueries({ queryKey: queryKeys.leases.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() })
      
      toast.success('Tenant deleted successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Tenant statistics hook
export function useTenantStats() {
  return useQuery({
    queryKey: queryKeys.tenants.stats(),
    queryFn: () => apiClient.tenants.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: apiClient.auth.isAuthenticated(),
  })
}

// Upload tenant document mutation
export function useUploadTenantDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file, documentType }: { id: string; file: File; documentType: string }) =>
      apiClient.tenants.uploadDocument(id, file, documentType),
    onSuccess: (_, { id }) => {
      // Invalidate tenant to refetch with new document
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
      
      toast.success('Document uploaded successfully')
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

// Combined hook for tenant management
export function useTenantActions() {
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()
  const uploadDocument = useUploadTenantDocument()

  return {
    create: createTenant,
    update: updateTenant,
    delete: deleteTenant,
    uploadDocument,
    isLoading:
      createTenant.isPending ||
      updateTenant.isPending ||
      deleteTenant.isPending ||
      uploadDocument.isPending,
  }
}

// TODO: Invitation system - These will need to be implemented as API endpoints
// For now, keeping the interfaces but functions will need to be adapted to new API
export interface InviteTenantData {
  name: string
  email: string
  phone?: string
  propertyId: string
  unitId?: string // Optional unit selection
}

// Placeholder hooks for invitation system - will need API endpoint implementation
export function useInviteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_data: InviteTenantData) => {
      // TODO: Implement API endpoint for tenant invitations
      throw new Error('Tenant invitation API endpoint not yet implemented')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_tenantId: string) => {
      // TODO: Implement API endpoint for resending invitations
      throw new Error('Resend invitation API endpoint not yet implemented')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}

export function useDeletePendingInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mutationFn: async (_tenantId: string) => {
      // TODO: Implement API endpoint for deleting pending invitations
      throw new Error('Delete pending invitation API endpoint not yet implemented')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.lists() })
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    },
  })
}