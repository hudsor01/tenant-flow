/**
 * React Query hooks for Tenants
 * Direct TanStack Query usage - no factory abstractions
 */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-client'
import type {
	Tenant,
	TenantQuery,
	CreateTenantInput,
	UpdateTenantInput
} from '@repo/shared'
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'

/**
 * Fetch list of tenants with optional filters
 */
export function useTenants(
	query?: TenantQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Tenant[], Error> {
	return useQuery({
		queryKey: ['tenantflow', 'tenants', 'list', query],
		queryFn: async () => {
			const response = await apiClient.get<Tenant[]>('/tenants', {
				params: createQueryAdapter(query)
			})
			return response
		},
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000
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
			if (!id) throw new Error('Tenant ID is required')
			return await apiClient.get<Tenant>(`/tenants/${id}`)
		},
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000
	})
}

/**
 * Fetch tenant statistics
 */
export function useTenantStats(): UseQueryResult<
	{
		total: number
		active: number
		inactive: number
		withActiveLeases: number
	},
	Error
> {
	return useQuery({
		queryKey: ['tenantflow', 'tenants', 'stats'],
		queryFn: async () => {
			return await apiClient.get<{
				total: number
				active: number
				inactive: number
				withActiveLeases: number
			}>('/tenants/stats')
		},
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Create new tenant - simplified without complex optimistic updates
 */
export function useCreateTenant(): UseMutationResult<
	Tenant,
	Error,
	CreateTenantInput
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (data: CreateTenantInput) => {
			const response = await apiClient.post<Tenant>(
				'/tenants',
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: queryKeys.tenants() })
			toast.success('Tenant created successfully')
		},
		onError: (error, _variables) => {
			toast.error('Failed to create tenant')
			
			// Track API error
			if (typeof window !== 'undefined' && window.posthog) {
				window.posthog.capture('api_error_occurred', {
					endpoint: '/tenants',
					method: 'POST',
					error_message: error.message,
					operation: 'create_tenant'
				})
			}
		}
	})
}

/**
 * Update tenant - simplified without complex optimistic updates
 */
export function useUpdateTenant(): UseMutationResult<
	Tenant,
	Error,
	{ id: string; data: UpdateTenantInput }
> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async ({ id, data }) => {
			const response = await apiClient.put<Tenant>(
				`/tenants/${id}`,
				createMutationAdapter(data)
			)
			return response
		},
		onSuccess: () => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: queryKeys.tenants() })
			toast.success('Tenant updated successfully')
		},
		onError: (error, { id }) => {
			toast.error('Failed to update tenant')
			
			// Track API error
			if (typeof window !== 'undefined' && window.posthog) {
				window.posthog.capture('api_error_occurred', {
					endpoint: `/tenants/${id}`,
					method: 'PUT',
					error_message: error.message,
					operation: 'update_tenant',
					tenant_id: id
				})
			}
		}
	})
}

/**
 * Delete tenant - simplified without complex optimistic updates
 */
export function useDeleteTenant(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()
	
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/tenants/${id}`)
		},
		onSuccess: () => {
			// Invalidate and refetch related queries
			queryClient.invalidateQueries({ queryKey: queryKeys.tenants() })
			toast.success('Tenant deleted successfully')
		},
		onError: (error, id) => {
			toast.error('Failed to delete tenant')
			
			// Track API error
			if (typeof window !== 'undefined' && window.posthog) {
				window.posthog.capture('api_error_occurred', {
					endpoint: `/tenants/${id}`,
					method: 'DELETE',
					error_message: error.message,
					operation: 'delete_tenant',
					tenant_id: id
				})
			}
		}
	})
}
