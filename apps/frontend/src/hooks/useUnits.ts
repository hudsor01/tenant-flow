// Refactored: useUnits hooks now use tRPC for backend calls instead of legacy apiClient

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import { queryKeys, cacheConfig } from '@/lib/query-keys'
import { handleApiError } from '@/lib/utils'
import { toast } from 'sonner'
import type { UnitWithDetails } from '@/types/api'
import type { UnitQuery } from '@/types/query-types'

/**
 * 🚀 UNITS REVOLUTION: ~150 lines → 25 lines (83% reduction!)
 */

// 🎯 Main units resource
export const useUnits = (query?: UnitQuery) => {
	return useQuery({
		queryKey: [...queryKeys.properties.all, 'units', query],
		queryFn: () => trpc.units.getAll.fetch(query),
		...cacheConfig.reference,
		enabled: true,
	})
}

// 🎯 Units by property with dedicated caching
export const useUnitsByProperty = (propertyId: string) => {
	return useQuery({
		queryKey: queryKeys.properties.units(propertyId),
		queryFn: () => trpc.units.getAll.fetch({ propertyId }),
		...cacheConfig.reference,
		enabled: !!propertyId,
	})
}

// 🎯 Single unit with smart caching
export const useUnit = (id: string) => {
	return useQuery({
		queryKey: [...queryKeys.properties.all, 'units', 'detail', id],
		queryFn: () => trpc.units.getById.fetch(id),
		...cacheConfig.reference,
		enabled: !!id,
	})
}

// 🎯 Unit mutations
export const useCreateUnit = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: any) => trpc.units.create.mutateAsync(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties.all })
			toast.success('Unit created successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}

export const useUpdateUnit = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) => trpc.units.update.mutateAsync({ id, ...data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties.all })
			toast.success('Unit updated successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}

export const useDeleteUnit = () => {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => trpc.units.delete.mutateAsync(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.properties.all })
			toast.success('Unit deleted successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error))
		}
	})
}

// 🎯 Combined actions with enhanced capabilities
export function useUnitActions() {
	const unitsQuery = useUnits()
	const createMutation = useCreateUnit()
	const updateMutation = useUpdateUnit()
	const deleteMutation = useDeleteUnit()

	return {
		// Query data
		data: unitsQuery.data || [],
		loading: unitsQuery.isLoading,
		error: unitsQuery.error,
		refresh: unitsQuery.refetch,

		// CRUD operations
		create: createMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,

		// Loading states
		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,

		// Enhanced status
		anyLoading:
			unitsQuery.isLoading ||
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending
	}
}
