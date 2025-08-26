/**
 * React Query hooks for Properties
 * Direct React Query usage with built-in optimistic updates
 */
import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryResult,
	type UseMutationResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
	Property,
	PropertyQuery,
	CreatePropertyInput,
	UpdatePropertyInput,
	PropertyStats
} from '@repo/shared'
import { apiClient } from '@/lib/api-client'
import { queryKeys } from '@/lib/react-query/query-keys'

/**
 * Fetch list of properties with optional filters
 */
export function useProperties(
	query?: PropertyQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Property[]> {
	return useQuery({
		queryKey: queryKeys.properties.list(query),
		queryFn: async () =>
			apiClient.get<Property[]>('/properties', { params: query }),
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000 // 10 minutes
	})
}

/**
 * Fetch single property by ID
 */
export function useProperty(
	id: string,
	options?: { enabled?: boolean }
): UseQueryResult<Property> {
	return useQuery({
		queryKey: queryKeys.properties.detail(id),
		queryFn: async () => apiClient.get<Property>(`/properties/${id}`),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch property statistics
 */
export function usePropertyStats(): UseQueryResult<PropertyStats> {
	return useQuery({
		queryKey: queryKeys.properties.stats(),
		queryFn: async () => apiClient.get<PropertyStats>('/properties/stats'),
		staleTime: 2 * 60 * 1000, // 2 minutes
		refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
	})
}

/**
 * Create new property with optimistic updates
 */
export function useCreateProperty(): UseMutationResult<
	Property,
	Error,
	CreatePropertyInput
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (data: CreatePropertyInput) =>
			apiClient.post<Property>('/properties', data),
		onMutate: async newProperty => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.properties.lists() })

			// Snapshot the previous value
			const previousProperties = queryClient.getQueryData(
				queryKeys.properties.lists()
			)

			// Optimistically update all property lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.properties.lists() },
				(old: Property[] | undefined) => {
					if (!old) {return []}
					return [
						...old,
						{
							...newProperty,
							id: `temp-${Date.now()}`,
							createdAt: new Date(),
							updatedAt: new Date()
						} as Property
					]
				}
			)

			return { previousProperties }
		},
		onError: (err, newProperty, context) => {
			// Revert optimistic update on error
			if (context?.previousProperties) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.properties.lists() },
					context.previousProperties
				)
			}
			toast.error('Failed to create property')
		},
		onSuccess: () => {
			toast.success('Property created successfully')
		},
		onSettled: () => {
			// Always refetch after error or success
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
		}
	})
}

/**
 * Update property with optimistic updates
 */
export function useUpdateProperty(): UseMutationResult<
	Property,
	Error,
	{ id: string; data: UpdatePropertyInput }
> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data }) =>
			apiClient.put<Property>(`/properties/${id}`, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this property
			await queryClient.cancelQueries({
				queryKey: queryKeys.properties.detail(id)
			})
			await queryClient.cancelQueries({ queryKey: queryKeys.properties.lists() })

			// Snapshot the previous values
			const previousProperty = queryClient.getQueryData(
				queryKeys.properties.detail(id)
			)
			const previousList = queryClient.getQueryData(queryKeys.properties.lists())

			// Optimistically update property detail
			queryClient.setQueryData(
				queryKeys.properties.detail(id),
				(old: Property | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update property in lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.properties.lists() },
				(old: Property[] | undefined) =>
					old?.map(property =>
						property.id === id
							? { ...property, ...data, updatedAt: new Date() }
							: property
					)
			)

			return { previousProperty, previousList }
		},
		onError: (err, { id }, context) => {
			// Revert optimistic updates on error
			if (context?.previousProperty) {
				queryClient.setQueryData(
					queryKeys.properties.detail(id),
					context.previousProperty
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.properties.lists() },
					context.previousList
				)
			}
			toast.error('Failed to update property')
		},
		onSuccess: () => {
			toast.success('Property updated successfully')
		},
		onSettled: (data, err, { id }) => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.detail(id) })
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
		}
	})
}

/**
 * Delete property with optimistic updates
 */
export function useDeleteProperty(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) => apiClient.delete<void>(`/properties/${id}`),
		onMutate: async id => {
			// Cancel queries
			await queryClient.cancelQueries({ queryKey: queryKeys.properties.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(queryKeys.properties.lists())

			// Optimistically remove property from lists
			queryClient.setQueriesData(
				{ queryKey: queryKeys.properties.lists() },
				(old: Property[] | undefined) =>
					old?.filter(property => property.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: queryKeys.properties.lists() },
					context.previousList
				)
			}
			toast.error('Failed to delete property')
		},
		onSuccess: () => {
			toast.success('Property deleted successfully')
		},
		onSettled: () => {
			// Refetch to ensure consistency
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.lists() })
			void queryClient.invalidateQueries({ queryKey: queryKeys.properties.stats() })
		}
	})
}

/**
 * Prefetch property data (for hover effects, etc.)
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		void queryClient.prefetchQuery({
			queryKey: queryKeys.properties.detail(id),
			queryFn: async () => apiClient.get<Property>(`/properties/${id}`),
			staleTime: 10 * 1000 // 10 seconds
		})
	}
}
