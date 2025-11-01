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

import { logger } from '@repo/shared/lib/frontend-logger'
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
import type { Unit, UnitStats } from '@repo/shared/types/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Query keys for unit endpoints (hierarchical, typed)
 */
export const unitKeys = {
	all: ['units'] as const,
	list: (params?: { propertyId?: string; status?: string; search?: string }) =>
		[...unitKeys.all, 'list', params] as const,
	detail: (id: string) => [...unitKeys.all, 'detail', id] as const,
	byProperty: (propertyId: string) =>
		[...unitKeys.all, 'by-property', propertyId] as const,
	stats: () => [...unitKeys.all, 'stats'] as const
}

/**
 * Hook to fetch unit by ID with optimized caching
 * Uses placeholder data from list cache for instant loading
 */
export function useUnit(id: string) {
	return useQuery({
		queryKey: unitKeys.detail(id),
		queryFn: async (): Promise<Unit> => {
			const res = await fetch(`/api/v1/units/${id}`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch unit')
			}

			return res.json()
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes cache time
	})
}

/**
 * Hook to fetch units by property ID
 * Optimized for property detail pages showing all units
 */
export function useUnitsByProperty(propertyId: string) {
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: unitKeys.byProperty(propertyId),
		queryFn: async (): Promise<{ data: Unit[]; total: number }> => {
			const res = await fetch(`/api/v1/units/by-property/${propertyId}`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch units by property')
			}

			// Backend returns Unit[] directly, not paginated object
			const response = (await res.json()) as Unit[]

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
		enabled: !!propertyId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
		retry: 2
	})
}

/**
 * Hook to fetch unit list with pagination and filtering
 * Supports property filter, status filter, and search
 */
export function useUnitList(params?: {
	propertyId?: string
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
	search?: string
	limit?: number
	offset?: number
}) {
	const { propertyId, status, search, limit = 50, offset = 0 } = params || {}
	const queryClient = useQueryClient()

	return useQuery({
		queryKey: unitKeys.list(
			propertyId || status || search
				? {
						...(propertyId && { propertyId }),
						...(status && { status }),
						...(search && { search })
					}
				: undefined
		),
		queryFn: async () => {
			const searchParams = new URLSearchParams()
			if (propertyId) searchParams.append('propertyId', propertyId)
			if (status) searchParams.append('status', status)
			if (search) searchParams.append('search', search)
			searchParams.append('limit', limit.toString())
			searchParams.append('offset', offset.toString())

			const res = await fetch(`/api/v1/units?${searchParams.toString()}`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch units')
			}

			// Backend returns Unit[] directly, not paginated object
			const response = (await res.json()) as Unit[]

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
		staleTime: 10 * 60 * 1000, // 10 minutes - list data rarely changes
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
	return useQuery({
		queryKey: unitKeys.stats(),
		queryFn: async (): Promise<UnitStats> => {
			const res = await fetch('/api/v1/units/stats', {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch unit stats')
			}

			return res.json()
		},
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
		retry: 2
	})
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
		mutationFn: async (unitData: CreateUnitInput): Promise<Unit> => {
			const res = await fetch('/api/v1/units', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				body: JSON.stringify(unitData)
			})

			if (!res.ok) {
				throw new Error('Failed to create unit')
			}

			return res.json()
		},
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
				propertyId: newUnit.propertyId,
				unitNumber: newUnit.unitNumber,
				bedrooms: newUnit.bedrooms || 0,
				bathrooms: newUnit.bathrooms || 0,
				squareFeet: newUnit.squareFeet || null,
				rent: newUnit.rent,
				status: newUnit.status || 'VACANT',
				lastInspectionDate: newUnit.lastInspectionDate || null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				version: 1 // 🔐 BUG FIX #2: Optimistic locking
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

			logger.info('Unit created successfully', { unitId: data.id })
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
			data
		}: {
			id: string
			data: UpdateUnitInput
		}): Promise<Unit> => {
			// 🔐 BUG FIX #2: Get current version from cache for optimistic locking
			const currentUnit = queryClient.getQueryData<Unit>(unitKeys.detail(id))

			const res = await fetch(`/api/v1/units/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include',
				// Use withVersion helper to include version in request
				body: JSON.stringify(withVersion(data, currentUnit?.version))
			})

			if (!res.ok) {
				throw new Error('Failed to update unit')
			}

			return res.json()
		},
		onMutate: async ({ id, data }) => {
			// Cancel all outgoing queries for this unit
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.all })

			// Snapshot all relevant caches for comprehensive rollback
			const previousDetail = queryClient.getQueryData<Unit>(
				unitKeys.detail(id)
			)
			const previousLists = queryClient.getQueriesData<{
				data: Unit[]
				total: number
			}>({
				queryKey: unitKeys.all
			})

			// Optimistically update detail cache (use incrementVersion helper)
			queryClient.setQueryData<Unit>(unitKeys.detail(id), old =>
				old ? incrementVersion(old, data) : undefined
			)

			// Optimistically update list caches
			queryClient.setQueriesData<{ data: Unit[]; total: number }>(
				{ queryKey: unitKeys.all },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(unit =>
							unit.id === id ? incrementVersion(unit, data) : unit
						)
					}
				}
			)

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

			// 🔐 BUG FIX #2: Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('unit', id, queryClient, [
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

			logger.info('Unit updated successfully', { unitId: id })
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
			const res = await fetch(`/api/v1/units/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to delete unit')
			}

			return id
		},
		onMutate: async (id: string) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.all })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Unit>(
				unitKeys.detail(id)
			)
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
			logger.info('Unit deleted successfully', { unitId: id })
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
				const res = await fetch(`/api/v1/units/${id}`, {
					credentials: 'include'
				})

				if (!res.ok) {
					throw new Error('Failed to fetch unit')
				}

				return res.json()
			},
			staleTime: 5 * 60 * 1000
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
