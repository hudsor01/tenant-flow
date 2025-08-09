/**
 * React Query hooks for Tenants
 * Provides type-safe data fetching and mutations with optimistic updates
 */
import { 
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
import { useListQuery, useDetailQuery, useMutationFactory } from '../query-factory'

/**
 * Fetch list of tenants with optional filters
 */
export function useTenants(
  query?: TenantQuery,
  _options?: { enabled?: boolean }
): UseQueryResult<Tenant[], Error> {
  return useListQuery(
    'tenants',
    async (params) => {
      const response = await apiClient.get<Tenant[]>('/tenants', { 
        params: createQueryAdapter(params as TenantQuery)
      })
      return response.data
    },
    query
  )
}

/**
 * Fetch single tenant by ID
 */
export function useTenant(
  id: string,
  options?: { enabled?: boolean }
): UseQueryResult<Tenant, Error> {
  return useDetailQuery(
    'tenants',
    Boolean(id) && (options?.enabled ?? true) ? id : undefined,
    async (id: string) => {
      const response = await apiClient.get<Tenant>(`/tenants/${id}`)
      return response.data
    }
  )
}

/**
 * Create new tenant with optimistic updates
 */
export function useCreateTenant(): UseMutationResult<
  Tenant,
  Error,
  CreateTenantInput
> {
  return useMutationFactory({
    mutationFn: async (data: CreateTenantInput) => {
      const response = await apiClient.post<Tenant>('/tenants', createMutationAdapter(data))
      return response.data
    },
    invalidateKeys: [queryKeys.tenants()],
    successMessage: 'Tenant created successfully',
    errorMessage: 'Failed to create tenant',
    optimisticUpdate: {
      queryKey: queryKeys.tenantList(),
      updater: (oldData: unknown, variables: CreateTenantInput) => {
        const previousTenants = oldData as Tenant[]
        return previousTenants ? [...previousTenants, { 
          ...variables, 
          id: `temp-${Date.now()}`,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Tenant] : []
      }
    },
    onError: (error, _variables) => {
      // Track API error
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('api_error_occurred', {
          endpoint: '/tenants',
          method: 'POST',
          error_message: error.message,
          operation: 'create_tenant',
        });
      }
    }
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
  return useMutationFactory({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put<Tenant>(
        `/tenants/${id}`,
        createMutationAdapter(data)
      )
      return response.data
    },
    invalidateKeys: [queryKeys.tenants()],
    successMessage: 'Tenant updated successfully',
    errorMessage: 'Failed to update tenant',
    onError: (error, { id }) => {
      // Track API error
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('api_error_occurred', {
          endpoint: `/tenants/${id}`,
          method: 'PUT',
          error_message: error.message,
          operation: 'update_tenant',
          tenant_id: id,
        });
      }
    }
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
  return useMutationFactory({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tenants/${id}`)
    },
    invalidateKeys: [queryKeys.tenants()],
    successMessage: 'Tenant deleted successfully',
    errorMessage: 'Failed to delete tenant',
    optimisticUpdate: {
      queryKey: queryKeys.tenantList(),
      updater: (oldData: unknown, id: string) => {
        const previousList = oldData as Tenant[]
        return previousList ? previousList.filter(t => t.id !== id) : []
      }
    },
    onError: (error, id) => {
      // Track API error
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('api_error_occurred', {
          endpoint: `/tenants/${id}`,
          method: 'DELETE',
          error_message: error.message,
          operation: 'delete_tenant',
          tenant_id: id,
        });
      }
    }
  })
}