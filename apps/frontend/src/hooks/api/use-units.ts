/**
 * React 19 + TanStack Query v5 Units Hooks - Pure useOptimistic Implementation
 * ARCHITECTURE: React 19 useOptimistic is the ONLY pattern - no legacy TanStack Query mutations
 * PURE: Combines native React 19 optimistic updates with TanStack Query Suspense
 */
import {
	useSuspenseQuery,
	useQueryClient,
	type UseSuspenseQueryResult
} from '@tanstack/react-query'
import type {
	Unit,
	UnitQuery,
	CreateUnitInput,
	UpdateUnitInput,
	UnitStats
} from '@repo/shared'
import { get, post, put, del } from '@/lib/api-client-temp'
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
 * React 19 useOptimistic for Units List - Replaces TanStack Query onMutate
 */
export function useUnitsOptimistic(query?: UnitQuery) {
	const { data: serverUnits } = useUnits(query)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for instant feedback
	const optimistic = useOptimisticList(serverUnits, {
		successMessage: (unit: Unit) => `Unit ${unit.unitNumber || unit.id} saved successfully`,
		errorMessage: 'Failed to save unit',
		onSuccess: () => {
			// Invalidate server cache after successful operations
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.stats()
			})
		}
	})

	// Server action wrappers
	const createUnitServer = async (data: CreateUnitInput): Promise<Unit> => {
		return await post<Unit>('/api/units', data)
	}

	const updateUnitServer = async (id: string, data: UpdateUnitInput): Promise<Unit> => {
		return await put<Unit>(`/api/units/${id}`, data)
	}

	const deleteUnitServer = async (id: string): Promise<void> => {
		await del<void>(`/api/units/${id}`)
	}

	return {
		// React 19 optimistic state
		units: optimistic.items,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,
		pendingCount: optimistic.pendingCount,

		// React 19 optimistic actions
		createUnit: (data: CreateUnitInput) => 
			optimistic.optimisticCreate(data, createUnitServer),
		updateUnit: (id: string, data: UpdateUnitInput) => 
			optimistic.optimisticUpdate(id, data, updateUnitServer),
		deleteUnit: (id: string) => 
			optimistic.optimisticDelete(id, () => deleteUnitServer(id)),
		
		// Utility actions
		revertAll: optimistic.revertAll
	}
}

/**
 * React 19 useOptimistic for Single Unit - Pure item updates
 */
export function useUnitOptimistic(id: string) {
	const { data: serverUnit } = useUnit(id)
	const queryClient = useQueryClient()

	// React 19 useOptimistic for single unit
	const optimistic = useOptimisticItem(serverUnit, {
		successMessage: 'Unit updated successfully',
		errorMessage: 'Failed to update unit',
		onSuccess: () => {
			// Invalidate related caches
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.stats()
			})
		}
	})

	// Server action wrapper
	const updateUnitServer = async (data: UpdateUnitInput): Promise<Unit> => {
		return await put<Unit>(`/api/units/${id}`, data)
	}

	return {
		// React 19 optimistic state
		unit: optimistic.item,
		isPending: optimistic.isPending,
		isOptimistic: optimistic.isOptimistic,

		// React 19 optimistic actions
		updateUnit: (data: UpdateUnitInput) => 
			optimistic.optimisticUpdate(data, updateUnitServer),
		revert: optimistic.revert
	}
}


// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * PURE: Enhanced prefetch for Suspense patterns - ensures data available when component mounts
 */
export function usePrefetchUnit() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.units.detail(id),
			queryFn: async () => get<Unit>(`/api/units/${id}`),
			staleTime: 10 * 1000 // 10 seconds
		})
	}
}

// ============================================================================
// EXPORTS - React 19 Pure Implementation
// ============================================================================

// REACT 19: Pure useOptimistic patterns (exported directly above)

// REACT 19: Pure data fetching (exported directly above)

// REACT 19: Utilities (exported directly above)