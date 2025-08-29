/**
 * Simple Tenants Hooks - Native patterns only
 * ARCHITECTURE: Direct TanStack Query usage, no abstractions
 */
import {
	useSuspenseQuery,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Tenant,
	TenantQuery,
	TenantStats
} from '@repo/shared'
import { get } from '@/lib/api-client'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import { queryKeys } from '@/lib/react-query/query-keys'

/**
 * Get tenants list - uses Suspense for zero loading states
 */
export function useTenants(query?: TenantQuery): UseSuspenseQueryResult<Tenant[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.list(query),
		queryFn: async () => get<Tenant[]>(API_ENDPOINTS.TENANTS.BASE),
		staleTime: 5 * 60 * 1000 // 5 minutes
	})
}

/**
 * Get single tenant
 */
export function useTenant(id: string): UseSuspenseQueryResult<Tenant> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.detail(id),
		queryFn: async () => get<Tenant>(API_ENDPOINTS.TENANTS.BY_ID(id)),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Get tenant statistics
 */
export function useTenantStats(): UseSuspenseQueryResult<TenantStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.tenants.stats(),
		queryFn: async () => get<TenantStats>(API_ENDPOINTS.TENANTS.STATS),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Prefetch tenant data
 * Uses generic implementation to avoid duplication
 */
export { usePrefetchTenant } from './use-prefetch-resource'