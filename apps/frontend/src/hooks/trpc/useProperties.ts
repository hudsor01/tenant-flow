import { trpc } from '../../lib/api'
import { toast } from 'sonner'
import { handleApiError } from '../../lib/utils'
import type { PropertyQuery } from '../../types/query-types'

// No transformation needed - backend already returns ISO strings for dates

/**
 * Consolidated property hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and optimistic updates
 */

// Main property queries
export function useProperties(query?: PropertyQuery) {
	const result = trpc.properties.list.useQuery(query || {}, {
		refetchInterval: 30000,
		retry: (failureCount, error) => {
			if (error?.data?.code === 'UNAUTHORIZED') {
				return false
			}
			return failureCount < 3
		},
		enabled: true,
		staleTime: 5 * 60 * 1000,
	})

	return result
}

export function useProperty(id: string) {
	const result = trpc.properties.byId.useQuery({ id }, {
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
	})

	return result
}

export function usePropertyStats() {
	return trpc.properties.stats.useQuery(undefined, {
		refetchInterval: 60000,
		retry: 2,
		staleTime: 2 * 60 * 1000,
	})
}

// Property mutations
export function useCreateProperty() {
	const utils = trpc.useUtils()
	
	return trpc.properties.create.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success('Property created successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateProperty() {
	const utils = trpc.useUtils()
	
	return trpc.properties.update.useMutation({
		onSuccess: (updatedProperty) => {
			utils.properties.byId.setData({ id: updatedProperty.id }, updatedProperty)
			utils.properties.list.invalidate()
			toast.success('Property updated successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteProperty() {
	const utils = trpc.useUtils()
	
	return trpc.properties.delete.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success('Property deleted successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Optimistic update version
export function useOptimisticUpdateProperty() {
	const utils = trpc.useUtils()
	
	return trpc.properties.update.useMutation({
		onMutate: async (variables) => {
			await utils.properties.byId.cancel({ id: variables.id })
			
			const previousProperty = utils.properties.byId.getData({ id: variables.id })
			
			if (previousProperty) {
				utils.properties.byId.setData({ id: variables.id }, {
					...previousProperty,
					...variables,
					updatedAt: new Date(),
				})
			}
			
			return { previousProperty }
		},
		onError: (err, variables, context) => {
			if (context?.previousProperty) {
				utils.properties.byId.setData({ id: variables.id }, context.previousProperty)
			}
			toast.error(handleApiError(err as Error))
		},
		onSuccess: (updatedProperty) => {
			utils.properties.byId.setData({ id: updatedProperty.id }, updatedProperty)
			utils.properties.list.invalidate()
			toast.success('Property updated successfully')
		},
		onSettled: (data, error, variables) => {
			utils.properties.byId.invalidate({ id: variables.id })
		},
	})
}

// Archive property mutation (using delete for now)
export function useArchiveProperty() {
	const utils = trpc.useUtils()
	
	return trpc.properties.delete.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success('Property archived successfully')
		},
		onError: (error) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Combined property actions
export function usePropertyActions() {
	const propertiesQuery = useProperties()
	const createMutation = useCreateProperty()
	const updateMutation = useUpdateProperty()
	const deleteMutation = useDeleteProperty()
	const archiveMutation = useArchiveProperty()

	return {
		data: propertiesQuery.data?.properties || [],
		loading: propertiesQuery.isLoading,
		error: propertiesQuery.error,
		refresh: propertiesQuery.refetch,

		create: createMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,
		archive: archiveMutation.mutate,

		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,
		archiving: archiveMutation.isPending,

		anyLoading:
			propertiesQuery.isLoading ||
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending ||
			archiveMutation.isPending,
	}
}