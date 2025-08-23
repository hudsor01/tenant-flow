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
	UpdatePropertyInput
} from '@repo/shared'
import { apiClient } from '@/lib/api-client'

// Query keys for properties
export const propertyKeys = {
	all: ['properties'] as const,
	lists: () => [...propertyKeys.all, 'list'] as const,
	list: (filters?: PropertyQuery) =>
		[...propertyKeys.lists(), { filters }] as const,
	details: () => [...propertyKeys.all, 'detail'] as const,
	detail: (id: string) => [...propertyKeys.details(), id] as const,
	stats: () => [...propertyKeys.all, 'stats'] as const
}

export interface PropertyStats {
	total: number
	occupied: number
	vacant: number
	occupancyRate: number
	totalMonthlyRent: number
	averageRent: number
}

/**
 * Fetch list of properties with optional filters
 */
export function useProperties(
	query?: PropertyQuery,
	options?: { enabled?: boolean }
): UseQueryResult<Property[], Error> {
	return useQuery({
		queryKey: propertyKeys.list(query),
		queryFn: () =>
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
): UseQueryResult<Property, Error> {
	return useQuery({
		queryKey: propertyKeys.detail(id),
		queryFn: () => apiClient.get<Property>(`/properties/${id}`),
		enabled: Boolean(id) && (options?.enabled ?? true),
		staleTime: 2 * 60 * 1000 // 2 minutes
	})
}

/**
 * Fetch property statistics
 */
export function usePropertyStats(): UseQueryResult<PropertyStats, Error> {
	return useQuery({
		queryKey: propertyKeys.stats(),
		queryFn: () => apiClient.get<PropertyStats>('/properties/stats'),
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
		mutationFn: (data: CreatePropertyInput) =>
			apiClient.post<Property>('/properties', data),
		onMutate: async newProperty => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: propertyKeys.lists() })

			// Snapshot the previous value
			const previousProperties = queryClient.getQueryData(
				propertyKeys.lists()
			)

			// Optimistically update all property lists
			queryClient.setQueriesData(
				{ queryKey: propertyKeys.lists() },
				(old: Property[] | undefined) => {
					if (!old) return []
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
					{ queryKey: propertyKeys.lists() },
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
			queryClient.invalidateQueries({ queryKey: propertyKeys.lists() })
			queryClient.invalidateQueries({ queryKey: propertyKeys.stats() })
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
		mutationFn: ({ id, data }) =>
			apiClient.put<Property>(`/properties/${id}`, data),
		onMutate: async ({ id, data }) => {
			// Cancel queries for this property
			await queryClient.cancelQueries({
				queryKey: propertyKeys.detail(id)
			})
			await queryClient.cancelQueries({ queryKey: propertyKeys.lists() })

			// Snapshot the previous values
			const previousProperty = queryClient.getQueryData(
				propertyKeys.detail(id)
			)
			const previousList = queryClient.getQueryData(propertyKeys.lists())

			// Optimistically update property detail
			queryClient.setQueryData(
				propertyKeys.detail(id),
				(old: Property | undefined) =>
					old ? { ...old, ...data, updatedAt: new Date() } : undefined
			)

			// Optimistically update property in lists
			queryClient.setQueriesData(
				{ queryKey: propertyKeys.lists() },
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
					propertyKeys.detail(id),
					context.previousProperty
				)
			}
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: propertyKeys.lists() },
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
			queryClient.invalidateQueries({ queryKey: propertyKeys.detail(id) })
			queryClient.invalidateQueries({ queryKey: propertyKeys.lists() })
			queryClient.invalidateQueries({ queryKey: propertyKeys.stats() })
		}
	})
}

/**
 * Delete property with optimistic updates
 */
export function useDeleteProperty(): UseMutationResult<void, Error, string> {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (id: string) => apiClient.delete<void>(`/properties/${id}`),
		onMutate: async id => {
			// Cancel queries
			await queryClient.cancelQueries({ queryKey: propertyKeys.lists() })

			// Snapshot previous list
			const previousList = queryClient.getQueryData(propertyKeys.lists())

			// Optimistically remove property from lists
			queryClient.setQueriesData(
				{ queryKey: propertyKeys.lists() },
				(old: Property[] | undefined) =>
					old?.filter(property => property.id !== id)
			)

			return { previousList }
		},
		onError: (err, id, context) => {
			// Revert optimistic update
			if (context?.previousList) {
				queryClient.setQueriesData(
					{ queryKey: propertyKeys.lists() },
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
			queryClient.invalidateQueries({ queryKey: propertyKeys.lists() })
			queryClient.invalidateQueries({ queryKey: propertyKeys.stats() })
		}
	})
}

/**
 * Prefetch property data (for hover effects, etc.)
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: propertyKeys.detail(id),
			queryFn: () => apiClient.get<Property>(`/properties/${id}`),
			staleTime: 10 * 1000 // 10 seconds
		})
	}
}
