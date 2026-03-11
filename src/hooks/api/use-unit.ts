/**
 * Unit Hooks
 * TanStack Query hooks for unit management with Zustand store integration
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * - Placeholder data from cache
 * - Proper error handling
 *
 * mutationFn logic lives in unitMutations factories (query-keys/unit-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import {
	useMutation,
	usePrefetchQuery,
	useQuery,
	useQueryClient
} from '@tanstack/react-query'
import type { Unit } from '#types/core'
import type { PaginatedResponse } from '#types/api-contracts'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

// Import query keys from separate file to avoid circular dependency
import { unitQueries } from './query-keys/unit-keys'
import { unitMutations } from './query-keys/unit-keys'
import { propertyQueries } from './query-keys/property-keys'
import { leaseQueries } from './query-keys/lease-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

/**
 * Extract data array from paginated response
 * Stable reference for TanStack Query select optimization
 */
const selectPaginatedData = <T>(response: PaginatedResponse<T>): T[] => response.data

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch unit by ID
 * Uses placeholderData from list cache for instant detail view
 */
export function useUnit(id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		...unitQueries.detail(id),
		placeholderData: () => {
			// Search all list caches for this unit
			const listCaches = queryClient.getQueriesData<Unit[]>({
				queryKey: unitQueries.lists()
			})

			for (const [, units] of listCaches) {
				const item = units?.find(u => u.id === id)
				if (item) return item
			}
			return undefined
		}
	})
}

/**
 * Hook to fetch units by property ID
 * Optimized for property detail pages showing all units
 * Uses queryOptions pattern with automatic prefetching of individual units
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations
 */
export function useUnitsByProperty(property_id: string) {
	return useQuery({
		...unitQueries.byProperty(property_id),
		...QUERY_CACHE_TIMES.LIST,
		gcTime: 30 * 60 * 1000, // 30 minutes cache time
		structuralSharing: true,
		// Only re-render when these properties change
		notifyOnChangeProps: ['data', 'error', 'isPending', 'isFetching']
	})
}

/**
 * Hook to fetch all units with optional filters
 * Base hook for other unit list functions
 *
 * Optimizations from TanStack Query docs:
 * - notifyOnChangeProps: Only re-render when data/error/isPending change
 * - select: Using stable function reference (selectPaginatedData)
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations
 */
export function useUnitList(filters?: Parameters<typeof unitQueries.list>[0]) {
	return useQuery({
		...unitQueries.list(filters),
		// Stable select function - defined outside component for referential equality
		select: selectPaginatedData,
		structuralSharing: true,
		// Only re-render when these properties change
		notifyOnChangeProps: ['data', 'error', 'isPending', 'isFetching']
	})
}

/**
 * Hook to fetch unit statistics
 */
export function useUnitStats() {
	return useQuery(unitQueries.stats())
}

/**
 * Hook to fetch vacant units only
 * Convenience hook for lease/maintenance forms
 */
export function useVacantUnits() {
	return useUnitList({ status: 'available' })
}

/**
 * Hook to fetch all units (no filtering)
 * Convenience hook for general dropdowns/selects
 */
export function useAllUnits() {
	return useUnitList()
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for unit detail
 * Prefetches when component mounts (route-level prefetching)
 *
 * For imperative prefetching (e.g., on hover), use:
 * queryClient.prefetchQuery(unitQueries.detail(id))
 */
export function usePrefetchUnitDetail(id: string) {
	usePrefetchQuery(unitQueries.detail(id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create unit mutation
 */
export function useCreateUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...unitMutations.create(),
		onSuccess: _newUnit => {
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Unit created successfully')
		},
		onError: error => {
			handleMutationError(error, 'Create unit')
		}
	})
}

/**
 * Update unit mutation
 */
export function useUpdateUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...unitMutations.update(),
		onSuccess: updatedUnit => {
			queryClient.setQueryData(
				unitQueries.detail(updatedUnit.id).queryKey,
				updatedUnit
			)
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Unit updated successfully')
		},
		onError: error => {
			handleMutationError(error, 'Update unit')
		}
	})
}

/**
 * Delete unit mutation
 */
export function useDeleteUnitMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...unitMutations.delete(),
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({
				queryKey: unitQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: leaseQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Unit deleted successfully')
		},
		onError: error => {
			handleMutationError(error, 'Delete unit')
		}
	})
}
