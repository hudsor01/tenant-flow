import { trpc } from '@/lib/clients'
import { toast } from 'sonner'
import { handleApiError } from '../../lib/utils'
import { toastMessages } from '../../lib/toast-messages'
import type { PropertyQuery } from '../../types/query-types'
import { 
  PROPERTY_TYPE_OPTIONS, 
  type PropertyType
} from '@tenantflow/shared'

// Type assertion to ensure TypeScript recognizes the properties router
const propertiesRouter = (trpc as any).properties

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
export function useProperties(query?: PropertyQuery) {
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

	const result = propertiesRouter.list.useQuery(safeQuery, {
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

export function useProperty(id: string) {
	const result = propertiesRouter.byId.useQuery(
		{ id },
		{
			enabled: !!id,
			staleTime: 5 * 60 * 1000
		}
	)

	return result
}

export function usePropertyStats() {
	return propertiesRouter.stats.useQuery(undefined, {
		refetchInterval: 60000,
		retry: 2,
		staleTime: 2 * 60 * 1000
	})
}

// Property mutations
export function useCreateProperty() {
	const utils = trpc.useUtils()

	return propertiesRouter.add.useMutation({
		onSuccess: () => {
			;(utils as any).properties.list.invalidate()
			toast.success(toastMessages.success.created('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useUpdateProperty() {
	const utils = trpc.useUtils()

	return propertiesRouter.update.useMutation({
		onSuccess: (updatedProperty: Property) => {
			const property = updatedProperty as Property
			;(utils as any).properties.byId.setData({ id: property.id }, property)
			;(utils as any).properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

export function useDeleteProperty() {
	const utils = trpc.useUtils()

	return propertiesRouter.delete.useMutation({
		onSuccess: () => {
			;(utils as any).properties.list.invalidate()
			toast.success(toastMessages.success.deleted('property'))
		},
		onError: (error: unknown) => {
			toast.error(handleApiError(error as unknown as Error))
		}
	})
}

// Optimistic update version
export function useOptimisticUpdateProperty() {
	const utils = trpc.useUtils()

	return propertiesRouter.update.useMutation({
		onMutate: async (variables: UpdatePropertyInput) => {
			const updateInput = variables as UpdatePropertyInput
			if (!updateInput.id) return { previousProperty: null }

			await (utils as any).properties.byId.cancel({ id: updateInput.id })

			const previousProperty = (utils as any).properties.byId.getData({
				id: updateInput.id
			}) as Property | undefined

			if (previousProperty) {
				const updatedProperty: Property = {
					...previousProperty,
					...updateInput,
					updatedAt: new Date()
				}
				;(utils as any).properties.byId.setData(
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
				;(utils as any).properties.byId.setData(
					{ id: updateInput.id },
					mutationContext.previousProperty
				)
			}
			toast.error(handleApiError(err as unknown as Error))
		},
		onSuccess: (updatedProperty: Property) => {
			const property = updatedProperty as Property
			;(utils as any).properties.byId.setData({ id: property.id }, property)
			;(utils as any).properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onSettled: (
			_data: Property | undefined,
			_error: unknown,
			variables: UpdatePropertyInput
		) => {
			const updateInput = variables as UpdatePropertyInput
			if (updateInput.id) {
				;(utils as any).properties.byId.invalidate({ id: updateInput.id })
			}
		}
	})
}

// Archive property mutation (using delete for now)
export function useArchiveProperty() {
	const utils = trpc.useUtils()

	return propertiesRouter.delete.useMutation({
		onSuccess: () => {
			;(utils as any).properties.list.invalidate()
			toast.success(toastMessages.success.updated('property'))
		},
		onError: (error: unknown) => {
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

	const propertyList = propertiesQuery.data as
		| PropertyListResponse
		| undefined

	return {
		data: propertyList?.properties || [],
		loading: propertiesQuery.isLoading,
		error: propertiesQuery.error,
		refresh: () => propertiesQuery.refetch(),

		create: (variables: any) => createMutation.mutate(variables),
		update: (variables: any) => updateMutation.mutate(variables),
		remove: (variables: any) => deleteMutation.mutate(variables),
		archive: (variables: any) => archiveMutation.mutate(variables),

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