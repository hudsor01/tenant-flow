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

import { clientFetch } from '#lib/api/client'
import { logger } from '@repo/shared/lib/frontend-logger'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { handleMutationError } from '#lib/mutation-error-handler'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'
import type {
	CreateUnitInput,
	UpdateUnitInput
} from '@repo/shared/types/api-inputs'
import type { Unit, UnitWithVersion } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { unitQueries, type UnitFilters } from './queries/unit-queries'

/**
 * @deprecated Use unitQueries from './queries/unit-queries' instead
 * Keeping for backward compatibility during migration
 */
export const unitKeys = {
	all: unitQueries.all(),
	list: (params?: {
		property_id?: string
		status?: string
		search?: string
		limit?: number
		offset?: number
	}) => {
		// Convert params to UnitFilters format, only including defined values
		const filters: UnitFilters | undefined = params ? Object.assign({},
			params.property_id ? { property_id: params.property_id } : {},
			params.status ? { status: params.status as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' } : {},
			params.search ? { search: params.search } : {},
			params.limit !== undefined ? { limit: params.limit } : {},
			params.offset !== undefined ? { offset: params.offset } : {}
		) as UnitFilters : undefined
		return unitQueries.list(filters).queryKey
	},
	detail: (id: string) => unitQueries.detail(id).queryKey,
	byProperty: (property_id: string) => unitQueries.byProperty(property_id).queryKey,
	stats: () => unitQueries.stats().queryKey
}

/**
 * Hook to fetch unit by ID
 */
export function useUnit(id: string) {
	return useQuery(unitQueries.detail(id))
}

/**
 * Hook to fetch units by property ID
 * Optimized for property detail pages showing all units
 */
export function useUnitsByProperty(property_id: string) {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: unitKeys.byProperty(property_id),
		queryFn: async (): Promise<{ data: Unit[]; total: number }> => {
			const response = await clientFetch<Unit[]>(
				`/api/v1/units/by-property/${property_id}`
			)

			// Prefetch individual unit details for faster navigation
			response?.forEach?.(unit => {
				queryClient.setQueryData(unitKeys.detail(unit.id), unit)
			})

			// Transform to expected paginated format for backwards compatibility
			return {
				data: response || [],
				total: response?.length || 0
			}
		},
		enabled: !!property_id,
		...QUERY_CACHE_TIMES.DETAIL,
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to fetch unit list with pagination and filtering
 * Supports property filter, status filter, and search
 */
export function useUnitList(params?: {
	property_id?: string
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
	search?: string
	limit?: number
	offset?: number
}) {
	const { property_id, status, search, limit = 50, offset = 0 } = params || {}
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: unitKeys.list({
			...(property_id && { property_id }),
			...(status && { status }),
			...(search && { search }),
			...(limit !== 50 && { limit }),
			...(offset !== 0 && { offset })
		}),
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (property_id) searchParams.append('property_id', property_id)
			if (status) searchParams.append('status', status)
			if (search) searchParams.append('search', search)
			searchParams.append('limit', limit.toString())
			searchParams.append('offset', offset.toString())

			const response = await clientFetch<Unit[]>(
				`/api/v1/units?${searchParams.toString()}`
			)

			// Prefetch individual unit details for faster navigation
			response?.forEach?.(unit => {
				queryClient.setQueryData(unitKeys.detail(unit.id), unit)
			})

			// Transform to expected paginated format for backwards compatibility
			return {
				data: response || [],
				total: response?.length || 0,
				limit,
				offset
			}
		},
		...QUERY_CACHE_TIMES.LIST,
		gcTime: 30 * 60 * 1000, // 30 minutes cache time
		retry: 2,
		// Enable structural sharing to prevent re-renders when data hasn't changed
		structuralSharing: true
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
	return useUnitList({ status: 'VACANT' })
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
		mutationFn: (unitData: CreateUnitInput) =>
			clientFetch<Unit>('/api/v1/units', {
				method: 'POST',
				body: JSON.stringify(unitData)
			}),
		onMutate: async (newUnit: CreateUnitInput) => {
			// Cancel outgoing refetches to prevent overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: unitKeys.all })

			// Snapshot previous state for rollback
			const previousLists = queryClient.getQueriesData<{
				data: Unit[]
				total: number
			}>({
				queryKey: unitKeys.all
			})

			// Create optimistic unit entry
			const tempId = `temp-${Date.now()}`
			const optimisticUnit: Unit = {
			id: tempId,
			property_id: newUnit.property_id,
			property_owner_id: null,
			unit_number: newUnit.unit_number ?? null,
			bedrooms: newUnit.bedrooms ?? null,
			bathrooms: newUnit.bathrooms ?? null,
			square_feet: newUnit.square_feet ?? null,
			rent_amount: newUnit.rent_amount ?? 0,
			rent_currency: 'USD',
			rent_period: 'month',
			status: newUnit.status || 'AVAILABLE',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}

			// Optimistically update all relevant caches
			queryClient.setQueriesData<{ data: Unit[]; total: number }>(
				{ queryKey: unitKeys.all },
				old =>
					old
						? {
								...old,
								data: [optimisticUnit, ...old.data],
								total: old.total + 1
							}
						: { data: [optimisticUnit], total: 1 }
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
			queryClient.setQueriesData<{ data: Unit[]; total: number }>(
				{ queryKey: unitKeys.all },
				old => {
					if (!old) return { data: [data], total: 1 }
					return {
						...old,
						data: old.data.map(unit =>
							unit.id === context?.tempId ? data : unit
						)
					}
				}
			)

			// Cache individual unit details
			queryClient.setQueryData(unitKeys.detail(data.id), data)

			logger.info('Unit created successfully', { unit_id: data.id })
		},
		onSettled: () => {
			// Refetch to ensure consistency with server
			queryClient.invalidateQueries({ queryKey: unitKeys.all })
			queryClient.invalidateQueries({ queryKey: unitKeys.stats() })
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
			data: UpdateUnitInput
			version?: number
		}): Promise<Unit> => {
			return clientFetch<Unit>(`/api/v1/units/${id}`, {
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
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.all })

			// Snapshot all relevant caches for comprehensive rollback
			const previousDetail = queryClient.getQueryData<Unit>(unitKeys.detail(id))
			const previousLists = queryClient.getQueriesData<{
				data: Unit[]
				total: number
			}>({
				queryKey: unitKeys.all
			})

			// Optimistically update detail cache
		if (previousDetail) {
			queryClient.setQueryData<UnitWithVersion>(
				unitKeys.detail(id),
				(old: UnitWithVersion | undefined) =>
					old ? incrementVersion(old, data) : undefined
			)
		}

			// Return context for rollback
			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Comprehensive rollback: restore all caches
			if (context?.previousDetail) {
				queryClient.setQueryData(unitKeys.detail(id), context.previousDetail)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			//Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('units', id, queryClient, [
					unitKeys.detail(id),
					unitKeys.all
				])
			} else {
				handleMutationError(err, 'Update unit')
			}
		},
		onSuccess: (data, { id }) => {
			// Replace optimistic update with real server data (including correct version)
			queryClient.setQueryData(unitKeys.detail(id), data)

			queryClient.setQueriesData<{ data: Unit[]; total: number }>(
				{ queryKey: unitKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(unit => (unit.id === id ? data : unit))
					}
				}
			)

			logger.info('Unit updated successfully', { unit_id: id })
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: unitKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: unitKeys.all })
			queryClient.invalidateQueries({ queryKey: unitKeys.stats() })
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
			await clientFetch(`/api/v1/units/${id}`, {
				method: 'DELETE'
			})
			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Unit>(unitKeys.detail(id))
			const previousLists = queryClient.getQueriesData<{
				data: Unit[]
				total: number
			}>({
				queryKey: unitKeys.all
			})

			// Optimistically remove from all caches
			queryClient.removeQueries({ queryKey: unitKeys.detail(id) })
			queryClient.setQueriesData<{ data: Unit[]; total: number }>(
				{ queryKey: unitKeys.all },
				old =>
					old
						? {
								...old,
								data: old.data.filter(unit => unit.id !== id),
								total: old.total - 1
							}
						: old
			)

			return { previousDetail, previousLists }
		},
		onError: (err, id, context) => {
			// Rollback: restore previous state
			if (context?.previousDetail) {
				queryClient.setQueryData(unitKeys.detail(id), context.previousDetail)
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
			queryClient.invalidateQueries({ queryKey: unitKeys.all })
			queryClient.invalidateQueries({ queryKey: unitKeys.stats() })
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
			queryKey: unitKeys.detail(id),
			queryFn: async (): Promise<Unit> => {
				return clientFetch<Unit>(`/api/v1/units/${id}`)
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
	return {
		create: useCreateUnit(),
		update: useUpdateUnit(),
		delete: useDeleteUnit()
	}
}
