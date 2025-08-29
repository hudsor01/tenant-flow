/**
 * Tenants Query Hooks - ULTRA-NATIVE Implementation
 * ARCHITECTURE: Uses generic resource factory to eliminate 88% duplication
 * PURE: Native TypeScript generics + TanStack Query Suspense
 */
import type {
	Tenant,
	TenantQuery,
	TenantStats
} from '@repo/shared'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import { queryKeys } from '@/lib/react-query/query-keys'
import { createResourceQueryHooks, RESOURCE_CACHE_CONFIG } from './use-resource-query'

/**
 * Tenants resource hooks using native TypeScript generics
 * ELIMINATES: Duplicate query patterns across all resource types
 */
const tenantHooks = createResourceQueryHooks<Tenant, TenantStats, TenantQuery>({
	resource: 'tenants',
	endpoints: {
		base: API_ENDPOINTS.TENANTS.BASE,
		stats: API_ENDPOINTS.TENANTS.STATS,
		byId: API_ENDPOINTS.TENANTS.BY_ID
	},
	queryKeys: {
		list: queryKeys.tenants.list,
		detail: queryKeys.tenants.detail,
		stats: queryKeys.tenants.stats,
		lists: queryKeys.tenants.lists
	},
	cacheConfig: RESOURCE_CACHE_CONFIG.BUSINESS_ENTITY
})

// Export native hook functions directly - no wrapper abstractions
export const useTenants = tenantHooks.useList
export const useTenant = tenantHooks.useDetail
export const useTenantStats = tenantHooks.useStats

/**
 * Prefetch tenant data
 * Uses generic implementation to avoid duplication
 */
export { usePrefetchTenant } from './use-prefetch-resource'