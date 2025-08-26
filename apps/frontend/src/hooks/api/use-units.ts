// apiClient import removed as it's not used directly in this file
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
import { unitApi } from '@/lib/api/units'
import { queryKeys } from '@/lib/react-query/query-keys'
import type {
	Unit,
	UnitQuery,
	CreateUnitInput,
	UpdateUnitInput,
	UnitStats
} from '@repo/shared'

/**
 * Fetch list of units with optional filters
 */
export function useUnits(
	query?: UnitQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Unit[]> {
	return useQuery({
		queryKey: queryKeys.units.list(query),
		queryFn: async () => unitApi.getAll(query),
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
): UseQueryResult<Unit> {
	return useQuery({
		queryKey: queryKeys.units.detail(id),
		queryFn: async () => unitApi.getById(id),
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
): UseQueryResult<Unit[]> {
	return useQuery({
		queryKey: queryKeys.units.byProperty(propertyId),
		queryFn: async () => unitApi.getByProperty(propertyId),
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
					{ queryKey: queryKeys.units.lists() },
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
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
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
				(old: Unit | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update unit in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.units.lists() },
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
					queryKeys.units.detail(id),
					context.previousUnit
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.units.lists() },
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
 * Delete unit with optimistic updates
 */
export function useDeleteUnit(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: unitApi.delete,
		onMutate: async id => {
			// Cancel queries
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
				(old: Unit[] | undefined) => old?.filter(unit => unit.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.units.lists() },
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
			void queryClient.invalidateQueries({
				queryKey: queryKeys.units.lists()
			})
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
						: undefined
			)

			// Optimistically update unit in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.units.lists() },
				(old: Unit[] | undefined) =>
					old?.map(unit =>
						unit.id === id
							? {
									...unit,
									status: newStatus,
									updatedAt: new Date()
								}
							: unit
					)
			)

			return { previousUnit, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousUnit) {
				queryClient.setQueryData(
					queryKeys.units.detail(id),
					context.previousUnit
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.units.lists() },
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
