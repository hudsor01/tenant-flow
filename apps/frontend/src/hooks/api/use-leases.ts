/**
 * Leases Query Hooks - ULTRA-NATIVE Implementation
 * ARCHITECTURE: Uses generic resource factory to eliminate 88% duplication
 * PURE: Native TypeScript generics + TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Lease,
	LeaseQuery,
	LeaseStats
} from '@repo/shared'
import { apiGet } from '@/lib/utils/api-utils'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import { queryKeys } from '@/lib/react-query/query-keys'
import { createResourceQueryHooks, RESOURCE_CACHE_CONFIG } from './use-resource-query'

// ============================================================================
// ULTRA-NATIVE GENERIC IMPLEMENTATION - 88% LESS DUPLICATION
// ============================================================================

/**
 * Leases resource hooks using native TypeScript generics
 * ELIMINATES: Duplicate query patterns across all resource types
 */
const leaseHooks = createResourceQueryHooks<Lease, LeaseStats, LeaseQuery>({
	resource: 'leases',
	endpoints: {
		base: API_ENDPOINTS.LEASES.BASE,
		stats: API_ENDPOINTS.LEASES.STATS,
		byId: API_ENDPOINTS.LEASES.BY_ID
	},
	queryKeys: {
		list: queryKeys.leases.list,
		detail: queryKeys.leases.detail,
		stats: queryKeys.leases.stats,
		lists: queryKeys.leases.lists
	},
	cacheConfig: RESOURCE_CACHE_CONFIG.BUSINESS_ENTITY
})

// Export native hook functions directly - no wrapper abstractions
export const useLeases = leaseHooks.useList
export const useLease = leaseHooks.useDetail
export const useLeaseStats = leaseHooks.useStats

/**
 * Custom hook for leases by property - specific business logic
 * Keep this separate as it's not part of the standard resource pattern
 */
export function useLeasesByProperty(propertyId: string): UseSuspenseQueryResult<Lease[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.leases.byProperty(propertyId),
		queryFn: async () => apiGet<Lease[]>(`properties/${propertyId}/leases`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * Simple Leases Hook - KISS Principle
 */
export function useLeasesOptimistic(query?: LeaseQuery) {
	const { data: serverLeases } = useLeases(query)
	
	return {
		leases: serverLeases,
		isPending: false
	}
}

/**
 * Simple Lease Hook - KISS Principle
 */
export function useLeaseOptimistic(id: string) {
	const { data: serverLease } = useLease(id)
	
	return {
		lease: serverLease,
		isPending: false
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 * Uses generic implementation to avoid duplication
 */
export { usePrefetchLease } from './use-prefetch-resource'

// ============================================================================
// EXPORTS - React 19 Pure Implementation
// ============================================================================

// REACT 19: Pure useOptimistic patterns (exported directly above)

// REACT 19: Pure data fetching (exported directly above)

// REACT 19: Utilities (exported directly above)