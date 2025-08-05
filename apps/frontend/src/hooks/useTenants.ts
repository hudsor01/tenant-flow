import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/axios-client'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils'
import { toastMessages } from '@/lib/toast-messages'
import type { 
    Tenant, 
    TenantQuery,
    CreateTenantInput, 
    UpdateTenantInput,
    TenantListResponse,
    SuccessResponse,
    AppError
} from '@tenantflow/shared'

// Tenants list hook
export function useTenants(query?: TenantQuery) {
  const safeQuery = query ? {
    ...query,
    limit: query.limit?.toString(),
    offset: query.offset?.toString()
  } : {}

  return useQuery({
    queryKey: ['tenants', 'list', safeQuery],
    queryFn: async () => {
      const response = await api.tenants.list(safeQuery)
      return response.data as TenantListResponse
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: (failureCount, error) => {
      const appError = error as AppError
      if (appError?.code === 'UNAUTHORIZED') {
        return false
      }
      return failureCount < 3
    }
  })
}

// Single tenant hook
export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenants', 'byId', id],
    queryFn: async () => {
      const response = await api.tenants.get(id)
      return response.data as Tenant
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })
}

// Tenants by property hook
export function useTenantsByProperty(propertyId: string) {
  return useQuery({
    queryKey: ['tenants', 'byProperty', propertyId],
    queryFn: async () => {
      const response = await api.tenants.list({ propertyId })
      return response.data as TenantListResponse
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000
  })
}

// Create tenant mutation
export function useCreateTenant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const response = await api.tenants.create(input)
      return response.data as Tenant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.created('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Update tenant mutation
export function useUpdateTenant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: UpdateTenantInput) => {
      const { id, ...updateData } = input
      const response = await api.tenants.update(id, updateData)
      return response.data as Tenant
    },
    onSuccess: (updatedTenant: Tenant) => {
      queryClient.setQueryData(['tenants', 'byId', updatedTenant.id], updatedTenant)
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.updated('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Delete tenant mutation
export function useDeleteTenant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.tenants.delete(id)
      return response.data as SuccessResponse<{ message: string }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.deleted('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Upload tenant documents mutation
export function useUploadTenantDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ tenantId, file, documentType }: { tenantId: string; file: File; documentType: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      
      const response = await api.tenants.uploadDocument(tenantId, formData)
      return response.data as SuccessResponse<{ documentUrl: string; message: string }>
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'byId', variables.tenantId] }).catch(() => {
        // Invalidation failed, queries will stay stale
      })
      toast.success(toastMessages.success.uploaded('document'))
    },
    onError: (error) => {
      toast.error(handleApiError(error))
    }
  })
}

// Combined actions helper
export function useTenantActions() {
  const tenantsQuery = useTenants()
  const createMutation = useCreateTenant()
  const updateMutation = useUpdateTenant()
  const deleteMutation = useDeleteTenant()
  
  return {
    data: (tenantsQuery.data as TenantListResponse)?.tenants || [],
    loading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    refresh: () => tenantsQuery.refetch(),
    
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: (id: string) => deleteMutation.mutate(id),
    
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    
    anyLoading: tenantsQuery.isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  }
}