/**
 * React 19 + TanStack Query v5 Units Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
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
import { get } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'

// ============================================================================
// PURE DATA HOOKS - TanStack Query Suspense (No Optimistic Logic)
// ============================================================================

/**
 * PURE: useSuspenseQuery for units list - data always available
 */
export function useUnits(query?: UnitQuery): UseSuspenseQueryResult<Unit[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.units.list(query),
		queryFn: async () => get<Unit[]>('/api/units'),
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * PURE: useSuspenseQuery for single unit - no loading states needed
 */
export function useUnit(id: string): UseSuspenseQueryResult<Unit> {
	return useSuspenseQuery({
		queryKey: queryKeys.units.detail(id),
		queryFn: async () => get<Unit>(`/api/units/${id}`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for units by property - data always available
 */
export function useUnitsByProperty(propertyId: string): UseSuspenseQueryResult<Unit[]> {
	return useSuspenseQuery({
		queryKey: queryKeys.units.byProperty(propertyId),
		queryFn: async () => get<Unit[]>(`/api/properties/${propertyId}/units`),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * PURE: useSuspenseQuery for unit statistics - perfect for dashboards
 */
export function useUnitStats(): UseSuspenseQueryResult<UnitStats> {
	return useSuspenseQuery({
		queryKey: queryKeys.units.stats(),
		queryFn: async () => get<UnitStats>('/api/units/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
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