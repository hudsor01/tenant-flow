<<<<<<< HEAD
// apiClient import removed as it's not used directly in this file
=======
import { apiClient } from '@/lib/api-client'
>>>>>>> origin/main
/**
 * React Query hooks for Units
 * Native TanStack Query implementation - no custom abstractions
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
<<<<<<< HEAD
import { unitApi } from '@/lib/api/units'
import { queryKeys } from '@/lib/react-query/query-keys'
=======
import { unitApi, unitKeys, type UnitStats } from '@/lib/api/units'
>>>>>>> origin/main
import type {
	Unit,
	UnitQuery,
	CreateUnitInput,
<<<<<<< HEAD
	UpdateUnitInput,
	UnitStats
=======
	UpdateUnitInput
>>>>>>> origin/main
} from '@repo/shared'

/**
 * Fetch list of units with optional filters
 */
export function useUnits(
	query?: UnitQuery,
	options?: { enabled?: boolean }
<<<<<<< HEAD
): UseQueryResult<Unit[]> {
	return useQuery({
		queryKey: queryKeys.units.list(query),
		queryFn: async () => unitApi.getAll(query),
=======
): UseQueryResult<Unit[], Error> {
	return useQuery({
		queryKey: unitKeys.list(query),
		queryFn: () => unitApi.getAll(query),
>>>>>>> origin/main
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch single unit by ID
 */
export function useUnit(
	id: string,
	options?: { enabled?: boolean }
<<<<<<< HEAD
): UseQueryResult<Unit> {
	return useQuery({
		queryKey: queryKeys.units.detail(id),
		queryFn: async () => unitApi.getById(id),
=======
): UseQueryResult<Unit, Error> {
	return useQuery({
		queryKey: unitKeys.detail(id),
		queryFn: () => unitApi.getById(id),
>>>>>>> origin/main
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch units by property ID
 */
export function useUnitsByProperty(
	propertyId: string,
	options?: { enabled?: boolean }
<<<<<<< HEAD
): UseQueryResult<Unit[]> {
	return useQuery({
		queryKey: queryKeys.units.byProperty(propertyId),
		queryFn: async () => unitApi.getByProperty(propertyId),
=======
): UseQueryResult<Unit[], Error> {
	return useQuery({
		queryKey: unitKeys.byProperty(propertyId),
		queryFn: () => unitApi.getByProperty(propertyId),
>>>>>>> origin/main
		enabled: Boolean(propertyId) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Create new unit with optimistic updates
 */
export function useCreateUnit(): UseMutationResult<
	Unit,
	Error,
	CreateUnitInput
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: unitApi.create,
		onMutate: async newUnit => {
			// Cancel any outgoing refetches
<<<<<<< HEAD
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.lists()
			})

			// Snapshot the previous value
			const previousUnits = queryClient.getQueryData(
				queryKeys.units.lists()
			)

			// Optimistically update all unit lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.units.lists() },
				(old: Unit[] | undefined) => {
					if (!old) {
						return []
					}
=======
			await queryClient.cancelQueries({ queryKey: unitKeys.lists() })

			// Snapshot the previous value
			const previousUnits = queryClient.getQueryData(unitKeys.lists())

			// Optimistically update all unit lists
			queryClient.setQueriesData(
				{ queryKey: unitKeys.lists() },
				(old: Unit[] | undefined) => {
					if (!old) return []
>>>>>>> origin/main
					return [
						...old,
						{
							...newUnit,
							id: `temp-${Date.now()}`,
							createdAt: new Date(),
							updatedAt: new Date()
						} as Unit
					]
				}
			)

			return { previousUnits }
		},
		onError: (err, newUnit, context) => {
			// Revert optimistic update on error
			if (context?.previousUnits) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.units.lists() },
=======
					{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
					context.previousUnits
				)
			}
			toast.error('Failed to create unit')
		},
		onSuccess: () => {
			toast.success('Unit created successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
=======
			queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
>>>>>>> origin/main
		}
	})
}

/**
 * Update unit with optimistic updates
 */
export function useUpdateUnit(): UseMutationResult<
	Unit,
	Error,
	{ id: string; data: UpdateUnitInput }
> {
	const queryClient = useQueryClient()

	return useMutation({
<<<<<<< HEAD
		mutationFn: async ({ id, data }) => unitApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this unit
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.lists()
			})

			// Snapshot the previous values
			const previousUnit = queryClient.getQueryData(
				queryKeys.units.detail(id)
			)
			const previousList = queryClient.getQueryData(
				queryKeys.units.lists()
			)

			// Optimistically update unit detail
			queryClient.setQueryData(
				queryKeys.units.detail(id),
=======
		mutationFn: ({ id, data }) => unitApi.update(id, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this unit
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.lists() })

			// Snapshot the previous values
			const previousUnit = queryClient.getQueryData(unitKeys.detail(id))
			const previousList = queryClient.getQueryData(unitKeys.lists())

			// Optimistically update unit detail
			queryClient.setQueryData(
				unitKeys.detail(id),
>>>>>>> origin/main
				(old: Unit | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update unit in lists
			queryClient.setQueriesData(
<<<<<<< HEAD
				{ queryKey: queryKeys.units.lists() },
=======
				{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
				(old: Unit[] | undefined) =>
					old?.map(unit =>
						unit.id === id
							? { ...unit, ...data, updatedAt: new Date() }
							: unit
					)
			)

			return { previousUnit, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousUnit) {
				queryClient.setQueryData(
<<<<<<< HEAD
					queryKeys.units.detail(id),
=======
					unitKeys.detail(id),
>>>>>>> origin/main
					context.previousUnit
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.units.lists() },
=======
					{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
					context.previousList
				)
			}
			toast.error('Failed to update unit')
		},
		onSuccess: () => {
			toast.success('Unit updated successfully')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
=======
			queryClient.invalidateQueries({ queryKey: unitKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
>>>>>>> origin/main
		}
	})
}

/**
 * Delete unit with optimistic updates
 */
export function useDeleteUnit(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: unitApi.delete,
		onMutate: async id => {
			// Cancel queries
<<<<<<< HEAD
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.lists()
			})

			// Snapshot previous list
			const previousList = queryClient.getQueryData(
				queryKeys.units.lists()
			)

			// Optimistically remove unit from lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.units.lists() },
=======
			await queryClient.cancelQueries({ queryKey: unitKeys.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(unitKeys.lists())

			// Optimistically remove unit from lists
			queryClient.setQueriesData(
				{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
				(old: Unit[] | undefined) => old?.filter(unit => unit.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.units.lists() },
=======
					{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
					context.previousList
				)
			}
			toast.error('Failed to delete unit')
		},
		onSuccess: () => {
			toast.success('Unit deleted successfully')
		},
		onSettled: () => {
			// Refetch to ensure consistency
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
=======
			queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
>>>>>>> origin/main
		}
	})
}

/**
 * Update unit availability status
 */
export function useUpdateUnitAvailability(): UseMutationResult<
	Unit,
	Error,
	{ id: string; isAvailable: boolean }
> {
	const queryClient = useQueryClient()

	return useMutation({
<<<<<<< HEAD
		mutationFn: async ({ id, isAvailable }) =>
			unitApi.updateAvailability(id, isAvailable),
		onMutate: async ({ id, isAvailable }) => {
			// Cancel queries for this unit
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.detail(id)
			})
			await queryClient.cancelQueries({
				queryKey: queryKeys.units.lists()
			})

			// Snapshot the previous values
			const previousUnit = queryClient.getQueryData(
				queryKeys.units.detail(id)
			)
			const previousList = queryClient.getQueryData(
				queryKeys.units.lists()
			)

			const newStatus = isAvailable ? 'VACANT' : 'OCCUPIED'

			// Optimistically update unit detail
			queryClient.setQueryData(
				queryKeys.units.detail(id),
				(old: Unit | undefined) =>
					old
						? { ...old, status: newStatus, updatedAt: new Date() }
=======
		mutationFn: ({ id, isAvailable }) =>
			unitApi.updateAvailability(id, isAvailable),
		onMutate: async ({ id, isAvailable }) => {
			// Cancel queries for this unit
			await queryClient.cancelQueries({ queryKey: unitKeys.detail(id) })
			await queryClient.cancelQueries({ queryKey: unitKeys.lists() })

			// Snapshot the previous values
			const previousUnit = queryClient.getQueryData(unitKeys.detail(id))
			const previousList = queryClient.getQueryData(unitKeys.lists())

			// Optimistically update unit detail
			queryClient.setQueryData(
				unitKeys.detail(id),
				(old: Unit | undefined) =>
					old
						? { ...old, isAvailable, updatedAt: new Date() }
>>>>>>> origin/main
						: undefined
			)

			// Optimistically update unit in lists
			queryClient.setQueriesData(
<<<<<<< HEAD
				{ queryKey: queryKeys.units.lists() },
				(old: Unit[] | undefined) =>
					old?.map(unit =>
						unit.id === id
							? {
									...unit,
									status: newStatus,
									updatedAt: new Date()
								}
=======
				{ queryKey: unitKeys.lists() },
				(old: Unit[] | undefined) =>
					old?.map(unit =>
						unit.id === id
							? { ...unit, isAvailable, updatedAt: new Date() }
>>>>>>> origin/main
							: unit
					)
			)

			return { previousUnit, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousUnit) {
				queryClient.setQueryData(
<<<<<<< HEAD
					queryKeys.units.detail(id),
=======
					unitKeys.detail(id),
>>>>>>> origin/main
					context.previousUnit
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
<<<<<<< HEAD
					{ queryKey: queryKeys.units.lists() },
=======
					{ queryKey: unitKeys.lists() },
>>>>>>> origin/main
					context.previousList
				)
			}
			toast.error('Failed to update unit availability')
		},
		onSuccess: () => {
			toast.success('Unit availability updated successfully')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
<<<<<<< HEAD
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.detail(id)
			})
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
		}
	})
}

/**
 * Fetch unit statistics
 */
export function useUnitStats(options?: {
	enabled?: boolean
}): UseQueryResult<UnitStats> {
	return useQuery({
		queryKey: queryKeys.units.stats(),
		queryFn: async () => unitApi.getStats(),
		enabled: options?.enabled ?? true,
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}
=======
			queryClient.invalidateQueries({ queryKey: unitKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: unitKeys.lists() })
		}
	})
}
>>>>>>> origin/main
