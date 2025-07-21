import { trpc } from '../../lib/api'
import { toast } from 'sonner'
import { handleApiError } from '../../lib/utils'
import { toastMessages } from '../../lib/toast-messages'
import type { PropertyQuery } from '../../types/query-types'

// No transformation needed - backend already returns ISO strings for dates

/**
 * Consolidated property hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and optimistic updates
 */

// Valid property type values
const VALID_PROPERTY_TYPES = ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL'] as const
type ValidPropertyType = (typeof VALID_PROPERTY_TYPES)[number]

// Main property queries
export function useProperties(query?: PropertyQuery) {
	// Build safe query with validated property type
	const safeQuery = query ? {
		...query,
		limit: query.limit?.toString(),
		offset: query.offset?.toString(),
		// Validate propertyType is one of the allowed values
		propertyType: query.propertyType && VALID_PROPERTY_TYPES.includes(query.propertyType as ValidPropertyType)
			? (query.propertyType as ValidPropertyType)
			: undefined
	} : {}
	
	const result = trpc.properties.list.useQuery(safeQuery, {
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
			toast.success(toastMessages.success.created('property'))
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
			toast.success(toastMessages.success.updated('property'))
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
			toast.success(toastMessages.success.deleted('property'))
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
			toast.error(handleApiError(err as unknown as Error))
		},
		onSuccess: (updatedProperty) => {
			utils.properties.byId.setData({ id: updatedProperty.id }, updatedProperty)
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
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
			toast.success(toastMessages.success.updated('property'))
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