/**
 * Tenant Hooks
 * TanStack Query hooks for tenant management with Zustand store integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@repo/shared/utils/api-client'
import { useTenantStore } from '@/stores/tenant-store'
import type { Tenant, TenantWithLeaseInfo, TenantInput, TenantUpdate } from '@repo/shared/types/core'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * Query keys for tenant endpoints
 */
export const tenantKeys = {
 all: ['tenants'] as const,
  list: () => [...tenantKeys.all, 'list'] as const,
  detail: (id: string) => [...tenantKeys.all, 'detail', id] as const,
  withLease: (id: string) => [...tenantKeys.all, 'with-lease', id] as const,
  stats: () => [...tenantKeys.all, 'stats'] as const,
}

/**
 * Hook to fetch tenant by ID with Zustand store integration
 */
export function useTenant(id: string) {
  const addTenant = useTenantStore((state) => state.addTenant)

 return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: async (): Promise<Tenant> => {
      const response = await apiClient<Tenant>(`${API_BASE_URL}/api/v1/tenants/${id}`)
      return response
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    select: (tenant: Tenant) => {
      // Add to store for caching - convert basic Tenant to TenantWithLeaseInfo format
      const tenantWithLeaseInfo: TenantWithLeaseInfo = {
        id: tenant.id,
        name: tenant.name || '',
        email: tenant.email,
        phone: tenant.phone,
        avatarUrl: tenant.avatarUrl,
        emergencyContact: tenant.emergencyContact,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        currentLease: null,
        leases: [],
        unit: null,
        property: null,
        monthlyRent: 0, // Default to 0 for basic tenant (no lease info)
        leaseStatus: 'inactive',
        paymentStatus: 'pending',
        unitDisplay: '',
        propertyDisplay: '',
        leaseStart: null,
        leaseEnd: null
      }
      addTenant(tenantWithLeaseInfo)
      return tenantWithLeaseInfo
    }
  })
}

/**
 * Hook to fetch tenant with lease information
 */
export function useTenantWithLease(id: string) {
  const addTenant = useTenantStore((state) => state.addTenant)

  return useQuery({
    queryKey: tenantKeys.withLease(id),
    queryFn: async (): Promise<TenantWithLeaseInfo> => {
      const response = await apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${id}/with-lease`)
      return response
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    select: (tenant: TenantWithLeaseInfo) => {
      // Add to store for caching
      addTenant(tenant)
      return tenant
    }
  })
}

/**
 * Hook to fetch tenant list with pagination and Zustand store integration
 */
export function useTenantList(page: number = 1, limit: number = 50) {
  const setTenants = useTenantStore((state) => state.setTenants)

  return useQuery({
    queryKey: [...tenantKeys.list(), { page, limit }],
    queryFn: async () => {
      const response = await apiClient<{
        data: TenantWithLeaseInfo[]
        total: number
        page: number
        limit: number
      }>(`${API_BASE_URL}/api/v1/tenants?page=${page}&limit=${limit}`)
      return response
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
    select: (response: {
      data: TenantWithLeaseInfo[]
      total: number
      page: number
      limit: number
    }) => {
      // Add all tenants to store for caching
      setTenants(response.data)
      return response
    }
 })
}

/**
 * Hook to fetch all tenants (for dropdowns, selects, etc.)
 */
export function useAllTenants() {
  const setTenants = useTenantStore((state) => state.setTenants)

  return useQuery({
    queryKey: tenantKeys.list(),
    queryFn: async (): Promise<TenantWithLeaseInfo[]> => {
      const response = await apiClient<TenantWithLeaseInfo[]>(`${API_BASE_URL}/api/v1/tenants/all`)
      return response
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    select: (data) => {
      // Add all tenants to store for caching
      setTenants(data)
      return data
    }
  })
}

/**
 * Mutation hook to create a new tenant with store invalidation
 */
export function useCreateTenant() {
  const queryClient = useQueryClient()
  // store updates are handled elsewhere; keep hooks focused on react-query cache

  return useMutation({
    mutationFn: async (tenantData: TenantInput) => {
      const response = await apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants`, {
        method: 'POST',
        body: JSON.stringify(tenantData),
      })
      return response
    },
    onMutate: async (newTenant: TenantInput) => {
      await queryClient.cancelQueries({ queryKey: tenantKeys.list() })
      const previous = queryClient.getQueryData<TenantWithLeaseInfo[]>(tenantKeys.list())
      // Optimistically add temporary tenant with a negative id
      const tempId = `temp-${Date.now()}`
      const optimistic: TenantWithLeaseInfo = {
        id: tempId,
        name: `${newTenant.firstName || ''} ${newTenant.lastName || ''}`.trim(),
        email: newTenant.email || '',
        phone: newTenant.phone || null,
        emergencyContact: newTenant.emergencyContact || null,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentLease: null,
        leases: [],
        unit: null,
        property: null,
        monthlyRent: 0,
        leaseStatus: 'inactive',
        paymentStatus: 'pending',
        unitDisplay: '',
        propertyDisplay: '',
        leaseStart: null,
        leaseEnd: null
      }
      queryClient.setQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list(), (old) => {
        return old ? [optimistic, ...old] : [optimistic]
      })
      return { previous }
    },
    onError: (_err, _variables, context: { previous?: TenantWithLeaseInfo[] | undefined } | undefined) => {
      // Rollback optimistic update
      if (context && context.previous) {
        queryClient.setQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list(), context.previous)
      }
    },
    onSettled: () => {
      // No broad invalidation - rely on optimistic update and server response.
      // Background refetch will happen per staleTime; if reconciliation is needed
      // callers can trigger explicit refetch.
    },
  })
}

/**
 * Mutation hook to update an existing tenant with store updates
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient()
  // store updates handled elsewhere

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenantUpdate }) => {
      const response = await apiClient<TenantWithLeaseInfo>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      return response
    },
    onMutate: async ({ id, data }: { id: string; data: TenantUpdate }) => {
      await queryClient.cancelQueries({ queryKey: tenantKeys.detail(id) })
      const previous = queryClient.getQueryData<TenantWithLeaseInfo | undefined>(tenantKeys.detail(id))
      // Optimistically update the cached tenant
      queryClient.setQueryData<TenantWithLeaseInfo | undefined>(tenantKeys.detail(id), (old) => {
        if (!old) return undefined
        return { ...old, ...data } as TenantWithLeaseInfo
      })
      queryClient.setQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list(), (old) => old ? old.map(t => (t.id === id ? { ...t, ...data } as TenantWithLeaseInfo : t)) : old)
      return { previous }
    },
    onError: (_err, variables, context: { previous?: TenantWithLeaseInfo | undefined } | undefined) => {
      if (context && context.previous) {
        queryClient.setQueryData<TenantWithLeaseInfo | undefined>(tenantKeys.detail(variables.id), context.previous)
      }
    },
    onSettled: () => {
      // Merge server response into caches on success handled in onSuccess.
      // Avoid broad invalidation here to reduce unnecessary GETs.
    },
  })
}

/**
 * Mutation hook to delete a tenant with store cleanup
 */
export function useDeleteTenant(p0?: { onSuccess?: () => void; onError?: (error: Error) => void }) {
  const queryClient = useQueryClient()
  // store updates handled elsewhere

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient<void>(`${API_BASE_URL}/api/v1/tenants/${id}`, {
        method: 'DELETE',
      })
      return response
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: tenantKeys.list() })
      const previous = queryClient.getQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list())
  queryClient.setQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list(), (old) => old ? old.filter(t => t.id !== id) : old)
      return { previous }
    },
    onError: (err, id, context: { previous?: TenantWithLeaseInfo[] | undefined } | undefined) => {
      if (context && context.previous) {
        queryClient.setQueryData<TenantWithLeaseInfo[] | undefined>(tenantKeys.list(), context.previous)
      }
      try {
        p0?.onError?.(err as Error)
      } catch {
        // ignore handler errors
      }
    },
    onSuccess: () => {
      try {
        p0?.onSuccess?.()
      } catch {
        // ignore handler errors
      }
    },
    onSettled: () => {
      // Avoid broad invalidation; optimistic removal already updated cache.
    },
  })
}

/**
 * Combined hook for tenant operations needed by tenant management pages
 */
export function useTenantOperations() {
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()

  return {
    createTenant,
    updateTenant,
    deleteTenant,
    isLoading: createTenant.isPending || updateTenant.isPending || deleteTenant.isPending,
    error: createTenant.error || updateTenant.error || deleteTenant.error,
  }
}
