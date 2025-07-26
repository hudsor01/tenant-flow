import { trpc } from '@/lib/clients'
import { toast } from 'sonner'
import { handleApiError } from '../../lib/utils'
import { toastMessages } from '../../lib/toast-messages'
import type { PropertyQuery } from '../../types/query-types'
import { 
  PROPERTY_TYPE_OPTIONS, 
  type PropertyType,
  type RouterInputs 
} from '@tenantflow/shared'

// TRPC client already has proper typing through lib/api

// Fallback type definitions if TRPC types are not properly inferred
interface Property {
	id: string
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	description: string | null
	propertyType: PropertyType
	imageUrl: string | null
	ownerId: string
	createdAt: Date
	updatedAt: Date
}

interface PropertyListResponse {
	properties: Property[]
	total: number
}

interface UpdatePropertyInput {
	id: string
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	description?: string
	propertyType?: PropertyType
	imageUrl?: string
}

/**
 * Consolidated property hooks with all features from both versions
 * Combines enhanced polling, error handling, toast notifications, and optimistic updates
 */

// Main property queries
export function useProperties(query?: PropertyQuery): ReturnType<typeof trpc.properties.list.useQuery> {
	// Build safe query with validated property type
	const safeQuery = query
		? {
				...query,
				limit: query.limit?.toString(),
				offset: query.offset?.toString(),
				// Validate propertyType is one of the allowed values
				propertyType:
					query.propertyType &&
					PROPERTY_TYPE_OPTIONS.includes(
						query.propertyType as PropertyType
					)
						? (query.propertyType as PropertyType)
						: undefined
			}
		: {}

	const result = trpc.properties.list.useQuery(safeQuery, {
		refetchInterval: 30000,
		retry: (failureCount: number, error: unknown) => {
			if (error && typeof error === 'object' && 'data' in error) {
				const errorData = error.data as { code?: string }
				if (errorData?.code === 'UNAUTHORIZED') {
					return false
				}
			}
			return failureCount < 3
		},
		enabled: true,
		staleTime: 5 * 60 * 1000
	})

	return result
}

export function useProperty(id: string): ReturnType<typeof trpc.properties.byId.useQuery> {
	const result = trpc.properties.byId.useQuery(
		{ id },
		{
			enabled: !!id,
			staleTime: 5 * 60 * 1000
		}
	)

	return result
}

export function usePropertyStats(): ReturnType<typeof trpc.properties.stats.useQuery> {
	return trpc.properties.stats.useQuery(undefined, {
		refetchInterval: 60000,
		retry: 2,
		staleTime: 2 * 60 * 1000
	})
}

// Property mutations
export function useCreateProperty(): ReturnType<typeof trpc.properties.add.useMutation> {
	const utils = trpc.useUtils()

	return trpc.properties.add.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.created('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateProperty(): ReturnType<typeof trpc.properties.update.useMutation> {
	const utils = trpc.useUtils()

	return trpc.properties.update.useMutation({
		onSuccess: (updatedProperty: Property) => {
			const property = updatedProperty as Property
			utils.properties.byId.setData({ id: property.id }, property)
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteProperty(): ReturnType<typeof trpc.properties.delete.useMutation> {
	const utils = trpc.useUtils()

	return trpc.properties.delete.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.deleted('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Optimistic update version
export function useOptimisticUpdateProperty(): ReturnType<typeof trpc.properties.update.useMutation> {
	const utils = trpc.useUtils()

	return trpc.properties.update.useMutation({
		onMutate: async (variables: UpdatePropertyInput) => {
			const updateInput = variables as UpdatePropertyInput
			if (!updateInput.id) return { previousProperty: null }

			await utils.properties.byId.cancel({ id: updateInput.id })

			const previousProperty = utils.properties.byId.getData({
				id: updateInput.id
			}) as Property | undefined

			if (previousProperty) {
				const updatedProperty: Property = {
					...previousProperty,
					...updateInput,
					updatedAt: new Date()
				}
				utils.properties.byId.setData(
					{ id: updateInput.id },
					updatedProperty
				)
			}

			return { previousProperty }
		},
		onError: (
			err: unknown,
			variables: UpdatePropertyInput,
			context: unknown
		) => {
			const updateInput = variables as UpdatePropertyInput
			if (
				context &&
				typeof context === 'object' &&
				'previousProperty' in context &&
				updateInput.id
			) {
				const mutationContext = context as {
					previousProperty?: Property
				}
				utils.properties.byId.setData(
					{ id: updateInput.id },
					mutationContext.previousProperty
				)
			}
			toast.error(handleApiError(err as unknown as Error))
		},
		onSuccess: (updatedProperty: Property) => {
			const property = updatedProperty as Property
			utils.properties.byId.setData({ id: property.id }, property)
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onSettled: (
			_data: Property | undefined,
			_error: unknown,
			variables: UpdatePropertyInput
		) => {
			const updateInput = variables as UpdatePropertyInput
			if (updateInput.id) {
				utils.properties.byId.invalidate({ id: updateInput.id })
			}
		}
	})
}

// Archive property mutation (using delete for now)
export function useArchiveProperty(): ReturnType<typeof trpc.properties.delete.useMutation> {
	const utils = trpc.useUtils()

	return trpc.properties.delete.useMutation({
		onSuccess: () => {
			utils.properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Combined property actions
export function usePropertyActions(): {
	data: Property[];
	loading: boolean;
	error: unknown;
	refresh: () => void;
	create: (variables: RouterInputs['properties']['add']) => void;
	update: (variables: RouterInputs['properties']['update']) => void;
	remove: (variables: RouterInputs['properties']['delete']) => void;
	archive: (variables: RouterInputs['properties']['delete']) => void;
	creating: boolean;
	updating: boolean;
	deleting: boolean;
	archiving: boolean;
	anyLoading: boolean;
} {
	const propertiesQuery = useProperties()
	const createMutation = useCreateProperty()
	const updateMutation = useUpdateProperty()
	const deleteMutation = useDeleteProperty()
	const archiveMutation = useArchiveProperty()

	const propertyList = propertiesQuery.data as
		| PropertyListResponse
		| undefined

	return {
		data: propertyList?.properties || [],
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
			archiveMutation.isPending
	}
}
