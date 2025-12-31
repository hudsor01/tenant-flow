/**
 * Unit Hooks
 * TanStack Query hooks for unit management with Zustand store integration
 * React 19 + TanStack Query v5 patterns with Suspense support
 *
 * Following the proven use-tenant.ts pattern with:
 * - Complete CRUD mutations
 * - Optimistic updates with rollback
 * - Placeholder data from cache
 * - Proper error handling
 */

import { apiRequest } from '#lib/api-request'

import { logger } from '@repo/shared/lib/frontend-logger'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { handleMutationError } from '#lib/mutation-error-handler'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'
import { useMemo } from 'react'
import type { UnitInput, UnitUpdate } from '@repo/shared/validation/units'
import type { Unit, UnitWithVersion } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { unitQueries } from './queries/unit-queries'

/**
 * Hook to fetch unit by ID
 */
export function useUnit(id: string) {
	return useQuery(unitQueries.detail(id))
}

/**
 * Hook to fetch units by property ID
 * Optimized for property detail pages showing all units
 * Uses queryOptions pattern with automatic prefetching of individual units
 */
export function useUnitsByProperty(property_id: string) {
	return useQuery({
		...unitQueries.byProperty(property_id),

		...QUERY_CACHE_TIMES.LIST,
		gcTime: 30 * 60 * 1000, // 30 minutes cache time
		retry: 2,
		// Enable structural sharing to prevent re-renders when data hasn't changed
		structuralSharing: true
	})
}

/**
 * Hook to fetch all units with optional filters
 * Base hook for other unit list functions
 */
export function useUnitList(filters?: Parameters<typeof unitQueries.list>[0]) {
	return useQuery({
		...unitQueries.list(filters),
		// Extract data array for backward compatibility with components
		select: response => response.data
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

/**
 * Mutation hook to create a new unit with enhanced optimistic updates
 * Includes automatic rollback on error with proper context preservation
 */
export function useCreateUnit() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (unitData: UnitInput) =>
			apiRequest<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify(unitData)
			}),
		onMutate: async (newUnit: UnitInput) => {
			// Cancel outgoing refetches to prevent overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: unitQueries.lists() })

			// Snapshot previous state for rollback
			const previousLists = queryClient.getQueriesData<Unit[]>({
				queryKey: unitQueries.lists()
			})

			// Create optimistic unit entry
			const tempId = `temp-${Date.now()}`
			const optimisticUnit: Unit = {
				id: tempId,
				property_id: newUnit.property_id,
				owner_user_id: '', // Placeholder - will be set by server
				unit_number: newUnit.unit_number ?? null,
				bedrooms: newUnit.bedrooms ?? null,
				bathrooms: newUnit.bathrooms ?? null,
				square_feet: newUnit.square_feet ?? null,
				rent_amount: newUnit.rent_amount ?? 0,
				rent_currency: 'USD',
				rent_period: 'month',
				status: (newUnit.status as Unit['status']) || 'available',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			// Optimistically update all relevant caches
			queryClient.setQueriesData<Unit[]>(
				{ queryKey: unitQueries.lists() },
				old => (old ? [optimisticUnit, ...old] : [optimisticUnit])
			)

			// Return context for rollback
			return { previousLists, tempId }
		},
		onError: (err, _variables, context) => {
			// Rollback: restore previous state
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			handleMutationError(err, 'Create unit')
		},
		onSuccess: (data, _variables, context) => {
			// Replace optimistic entry with real data
			queryClient.setQueriesData<Unit[]>(
				{ queryKey: unitQueries.lists() },
				old => {
					if (!old) return [data]
					return old.map(unit => (unit.id === context?.tempId ? data : unit))
				}
			)

			// Cache individual unit details
			queryClient.setQueryData(unitQueries.detail(data.id).queryKey, data)

			logger.info('Unit created successfully', { unit_id: data.id })
		},
		onSettled: () => {
			// Refetch to ensure consistency with server
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.stats().queryKey })
		}
	})
}

/**
 * Mutation hook to update an existing unit with enhanced optimistic updates
 * Includes comprehensive rollback mechanism for both detail and list caches
 */
export function useUpdateUnit() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: UnitUpdate
			version?: number
		}): Promise<Unit> => {
			return apiRequest<Unit>(`/api/v1/units/${id}`, {
				method: 'PUT',
				body: JSON.stringify(
					version !== null && version !== undefined
						? withVersion(data, version)
						: data
				)
			})
		},
		onMutate: async ({ id, data }) => {
			// Cancel all outgoing queries for this unit
			await queryClient.cancelQueries({
				queryKey: unitQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: unitQueries.lists() })

			// Snapshot all relevant caches for comprehensive rollback
			const previousDetail = queryClient.getQueryData<Unit>(
				unitQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Unit[]>({
				queryKey: unitQueries.lists()
			})

			// Optimistically update detail cache
			if (previousDetail) {
				queryClient.setQueryData<UnitWithVersion>(
					unitQueries.detail(id).queryKey,
					(old: UnitWithVersion | undefined) =>
						old
							? incrementVersion(old, data as Partial<UnitWithVersion>)
							: undefined
				)
			}

			// Return context for rollback
			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Comprehensive rollback: restore all caches
			if (context?.previousDetail) {
				queryClient.setQueryData(
					unitQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			//Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('units', id, queryClient, [
					unitQueries.detail(id).queryKey,
					unitQueries.lists()
				])
			} else {
				handleMutationError(err, 'Update unit')
			}
		},
		onSuccess: (data, { id }) => {
			// Replace optimistic update with real server data (including correct version)
			queryClient.setQueryData(unitQueries.detail(id).queryKey, data)

			queryClient.setQueriesData<Unit[]>(
				{ queryKey: unitQueries.lists() },
				old => (old ? old.map(unit => (unit.id === id ? data : unit)) : old)
			)

			logger.info('Unit updated successfully', { unit_id: id })
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({
				queryKey: unitQueries.detail(id).queryKey
			})
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.stats().queryKey })
		}
	})
}

/**
 * Mutation hook to delete a unit with optimistic removal
 * Includes automatic rollback on error
 */
export function useDeleteUnit(options?: {
	onSuccess?: () => void
	onError?: (error: Error) => void
}) {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<string> => {
			await apiRequest(`/api/v1/units/${id}`, {
				method: 'DELETE'
			})
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: unitQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: unitQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Unit>(
				unitQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Unit[]>({
				queryKey: unitQueries.lists()
			})

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: unitQueries.detail(id).queryKey })
			queryClient.setQueriesData<Unit[]>(
				{ queryKey: unitQueries.lists() },
				old => (old ? old.filter(unit => unit.id !== id) : old)
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback: restore previous state
			if (context?.previousDetail) {
				queryClient.setQueryData(
					unitQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			handleMutationError(err, 'Delete unit')
			options?.onError?.(err instanceof Error ? err : new Error(String(err)))
		},
		onSuccess: id => {
			logger.info('Unit deleted successfully', { unit_id: id })
			options?.onSuccess?.()
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.stats().queryKey })
		}
	})
}

/**
 * Hook for prefetching unit details (for hover states)
 */
export function usePrefetchUnit() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: unitQueries.detail(id).queryKey,
			queryFn: async (): Promise<Unit> => {
				return apiRequest<Unit>(`/api/v1/units/${id}`)
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Combined hook for all unit operations
 * Convenience hook for components that need multiple operations
 */
export function useUnitOperations() {
	const create = useCreateUnit()
	const update = useUpdateUnit()
	const remove = useDeleteUnit()

	return useMemo(
		() => ({
			create,
			update,
			delete: remove,
			isLoading: create.isPending || update.isPending || remove.isPending
		}),
		[create, update, remove]
	)
}
