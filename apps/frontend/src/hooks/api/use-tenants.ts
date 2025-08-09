/**
 * React Query hooks for Tenants
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
  Tenant, 
  TenantQuery, 
  CreateTenantInput, 
  UpdateTenantInput 
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
import { toast } from 'sonner'

/**
 * Fetch list of tenants with optional filters
 */
export function useTenants(
  query?: TenantQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Tenant[], Error> {
  return useQuery({
    queryKey: queryKeys.tenantList(query),
    queryFn: async () => {
      const response = await apiClient.get<Tenant[]>('/tenants', { 
        params: createQueryAdapter(query)
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })
}

/**
 * Fetch single tenant by ID
 */
export function useTenant(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Tenant, Error> {
  return useQuery({
    queryKey: queryKeys.tenantDetail(id),
    queryFn: async () => {
      const response = await apiClient.get<Tenant>(`/tenants/${id}`)
      return response.data
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

/**
 * Create new tenant with optimistic updates
 */
export function useCreateTenant(): UseMutationResult<
  Tenant,
  Error,
  CreateTenantInput
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.createTenant,
    mutationFn: async (data: CreateTenantInput) => {
      const response = await apiClient.post<Tenant>('/tenants', createMutationAdapter(data))
      return response.data
    },
    onMutate: async (newTenant) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.tenants() 
      })

      const previousTenants = queryClient.getQueryData<Tenant[]>(
        queryKeys.tenantList()
      )

      if (previousTenants) {
        queryClient.setQueryData<Tenant[]>(
          queryKeys.tenantList(),
          [...previousTenants, { 
            ...newTenant, 
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Tenant]
        )
      }

      return { previousTenants }
    },
    onError: (err, newTenant, context) => {
      if (context?.previousTenants) {
        queryClient.setQueryData(
          queryKeys.tenantList(),
          context.previousTenants
        )
      }
      
      // Track API error
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('api_error_occurred', {
          endpoint: '/tenants',
          method: 'POST',
          error_message: err.message,
          operation: 'create_tenant',
        });
      }
      
      toast.error('Failed to create tenant')
    },
    onSuccess: () => {
      toast.success('Tenant created successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tenants() 
      })
    },
  })
}

/**
 * Update tenant with optimistic updates
 */
export function useUpdateTenant(): UseMutationResult<
  Tenant,
  Error,
  { id: string; data: UpdateTenantInput }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.updateTenant,
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Tenant>(
        `/tenants/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.tenantDetail(id) 
      })

      const previousTenant = queryClient.getQueryData<Tenant>(
        queryKeys.tenantDetail(id)
      )

      if (previousTenant) {
        queryClient.setQueryData<Tenant>(
          queryKeys.tenantDetail(id),
          { ...previousTenant, ...data }
        )
      }

      const previousList = queryClient.getQueryData<Tenant[]>(
        queryKeys.tenantList()
      )
      if (previousList) {
        queryClient.setQueryData<Tenant[]>(
          queryKeys.tenantList(),
          previousList.map(t => 
            t.id === id ? { ...t, ...data } : t
          )
        )
      }

      return { previousTenant, previousList }
    },
    onError: (err, { id }, context) => {
      if (context?.previousTenant) {
        queryClient.setQueryData(
          queryKeys.tenantDetail(id),
          context.previousTenant
        )
      }
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.tenantList(),
          context.previousList
        )
      }
      
      // Track API error
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('api_error_occurred', {
          endpoint: `/tenants/${id}`,
          method: 'PUT',
          error_message: err.message,
          operation: 'update_tenant',
          tenant_id: id,
        });
      }
      
      toast.error('Failed to update tenant')
    },
    onSuccess: (data, { id }) => {
      toast.success('Tenant updated successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tenantDetail(id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tenantList() 
      })
    },
  })
}

/**
 * Delete tenant with optimistic updates
 */
export function useDeleteTenant(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: mutationKeys.deleteTenant,
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenants/${id}`)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.tenants() 
      })

      const previousList = queryClient.getQueryData<Tenant[]>(
        queryKeys.tenantList()
      )

      if (previousList) {
        queryClient.setQueryData<Tenant[]>(
          queryKeys.tenantList(),
          previousList.filter(t => t.id !== id)
        )
      }

      return { previousList }
    },
    onError: (err, id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(
          queryKeys.tenantList(),
          context.previousList
        )
      }
      
      // Track API error
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture('api_error_occurred', {
          endpoint: `/tenants/${id}`,
          method: 'DELETE',
          error_message: err.message,
          operation: 'delete_tenant',
          tenant_id: id,
        });
      }
      
      toast.error('Failed to delete tenant')
    },
    onSuccess: () => {
      toast.success('Tenant deleted successfully')
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.tenants() 
      })
    },
  })
}