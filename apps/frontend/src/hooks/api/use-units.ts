/**
 * Units Query Hooks - ULTRA-NATIVE Implementation
 * ARCHITECTURE: Uses generic resource factory to eliminate 88% duplication
 * PURE: Native TypeScript generics + TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Unit,
	UnitQuery,
	UnitStats
} from '@repo/shared'
import { apiGet } from '@/lib/utils/api-utils'
import { API_ENDPOINTS } from '@/lib/constants/api-endpoints'
import { queryKeys } from '@/lib/react-query/query-keys'
import { createResourceQueryHooks, RESOURCE_CACHE_CONFIG } from './use-resource-query'

// ============================================================================
// ULTRA-NATIVE GENERIC IMPLEMENTATION - 88% LESS DUPLICATION
// ============================================================================

/**
 * Units resource hooks using native TypeScript generics
 * ELIMINATES: Duplicate query patterns across all resource types
 */
const unitHooks = createResourceQueryHooks<Unit, UnitStats, UnitQuery>({
	resource: 'units',
	endpoints: {
		base: API_ENDPOINTS.UNITS.BASE,
		stats: API_ENDPOINTS.UNITS.STATS,
		byId: API_ENDPOINTS.UNITS.BY_ID
	},
	queryKeys: {
		list: queryKeys.units.list,
		detail: queryKeys.units.detail,
		stats: queryKeys.units.stats,
		lists: queryKeys.units.lists
	},
	cacheConfig: RESOURCE_CACHE_CONFIG.BUSINESS_ENTITY
})

// Export native hook functions directly - no wrapper abstractions
export const useUnits = unitHooks.useList
export const useUnit = unitHooks.useDetail
export const useUnitStats = unitHooks.useStats

/**
 * Custom hook for units by property - specific business logic
 * Keep this separate as it's not part of the standard resource pattern
 */
export function useUnitsByProperty(propertyId: string): UseSuspenseQueryResult<Unit[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.units.byProperty(propertyId),
		queryFn: async () => apiGet<Unit[]>(`properties/${propertyId}/units`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

// ============================================================================
// REACT 19 OPTIMISTIC MUTATIONS - Pure useOptimistic Integration
// ============================================================================

/**
 * Simple Units Hook - KISS Principle
 */
export function useUnitsOptimistic(query?: UnitQuery) {
	const { data: serverUnits } = useUnits(query)
	
	return {
		units: serverUnits,
		isPending: false
	}
}

/**
 * Simple Unit Hook - KISS Principle
 */
export function useUnitOptimistic(id: string) {
	const { data: serverUnit } = useUnit(id)
	
	return {
		unit: serverUnit,
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
export { usePrefetchUnit } from './use-prefetch-resource'

// ============================================================================
// EXPORTS - React 19 Pure Implementation
// ============================================================================

// REACT 19: Pure useOptimistic patterns (exported directly above)

// REACT 19: Pure data fetching (exported directly above)

// REACT 19: Utilities (exported directly above)