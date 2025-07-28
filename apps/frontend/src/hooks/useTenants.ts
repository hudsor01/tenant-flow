import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils'
import { toastMessages } from '@/lib/toast-messages'
import type { Tenant } from '@tenantflow/shared/types/tenants'
import type { TenantQuery } from '@tenantflow/shared/types/api'
import type { CreateTenantInput, UpdateTenantInput } from '@tenantflow/shared/types/api-inputs'

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
      const client = await getHonoClient()
      const params = new URLSearchParams()
      Object.entries(safeQuery).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      return extractHonoData(client.api.v1.tenants.$get({
        query: Object.fromEntries(params)
      }))
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60000,
    retry: (failureCount, error) => {
      const typedError = error as Error & { data?: { code?: string } }
      if (typedError?.data?.code === 'UNAUTHORIZED') {
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
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.tenants[':id'].$get({
        param: { id }
      }))
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  })
}

// Tenant stats hook
export function useTenantStats() {
  return useQuery({
    queryKey: ['tenants', 'stats'],
    queryFn: async () => {
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.tenants.stats.$get())
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000
  })
}

// Realtime tenants hook with frequent updates
export function useRealtimeTenants(query?: TenantQuery) {
  const safeQuery = query ? {
    ...query,
    limit: query.limit?.toString(),
    offset: query.offset?.toString()
  } : {}

  return useQuery({
    queryKey: ['tenants', 'realtime', safeQuery],
    queryFn: async () => {
      const client = await getHonoClient()
      const params = new URLSearchParams()
      Object.entries(safeQuery).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value))
        }
      })
      return extractHonoData(client.api.v1.tenants.$get({
        query: Object.fromEntries(params)
      }))
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000
  })
}

// Create tenant mutation
export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.tenants.$post({
        json: input
      }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success(toastMessages.success.created('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Alias for backward compatibility
export const useInviteTenant = useCreateTenant

// Update tenant mutation
export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTenantInput): Promise<Tenant> => {
      const client = await getHonoClient()
      return extractHonoData<Tenant>(client.api.v1.tenants[':id'].$put({
        param: { id },
        json: input
      }))
    },
    onSuccess: (updatedTenant: Tenant) => {
      // Update cache for single entity
      queryClient.setQueryData(['tenants', 'byId', updatedTenant.id], updatedTenant)
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success(toastMessages.success.updated('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Delete tenant mutation
export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.tenants[':id'].$delete({
        param: { id: variables.id }
      }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success(toastMessages.success.deleted('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Archive tenant mutation (using delete for now)
export function useArchiveTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const client = await getHonoClient()
      return extractHonoData(client.api.v1.tenants[':id'].$delete({
        param: { id: variables.id }
      }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', 'list'] })
      toast.success(toastMessages.success.updated('tenant'))
    },
    onError: (error) => {
      toast.error(handleApiError(error as Error))
    }
  })
}

// Combined tenant actions hook
export function useTenantActions() {
  const listQuery = useTenants()
  const createMutation = useCreateTenant()
  const updateMutation = useUpdateTenant()
  const deleteMutation = useDeleteTenant()

  return {
    data: listQuery.data || [],
    isLoading: listQuery.isLoading,
    error: listQuery.error,
    refresh: () => listQuery.refetch(),

    create: (variables: CreateTenantInput) => createMutation.mutate(variables),
    update: (variables: UpdateTenantInput) => updateMutation.mutate(variables),
    remove: (variables: { id: string }) => deleteMutation.mutate(variables),

    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    anyLoading:
      listQuery.isLoading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending
  }
}

// Extended tenant actions with invite and archive functionality
export function useExtendedTenantActions() {
  const baseActions = useTenantActions()
  const archiveMutation = useArchiveTenant()

  return {
    ...baseActions,
    invite: baseActions.create, // Alias for invite
    archive: (variables: { id: string }) => archiveMutation.mutate(variables),
    inviting: baseActions.creating, // Alias for inviting
    archiving: archiveMutation.isPending,
    anyLoading: baseActions.anyLoading || archiveMutation.isPending,
    
    hasActive: (data?: Tenant[]) => {
      const tenants = data || (baseActions.data as Tenant[]) || []
      return tenants.some((t: Tenant) => t && t.id) // Check if any tenants exist
    }
  }
}