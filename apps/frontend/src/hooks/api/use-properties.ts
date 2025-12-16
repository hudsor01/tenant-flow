/**
 * Properties Hooks
 * TanStack Query hooks for property management with complete CRUD operations
 * React 19 + TanStack Query v5 patterns with Suspense support

 * Expanded from read-only to full CRUD following use-tenant.ts pattern:
 * - Complete CRUD mutations (create, update, delete)
 * - Analytics hooks for performance, occupancy, financial, maintenance
 * - Optimistic updates with rollback
 * - Proper error handling
 */

import { apiRequest } from '#lib/api-request'

import { logger } from '@repo/shared/lib/frontend-logger'
import {
	handleConflictError,
	isConflictError,
	withVersion,
	incrementVersion
} from '@repo/shared/utils/optimistic-locking'
import type { PropertyCreate, PropertyUpdate } from '@repo/shared/validation/properties'
import type { PaginatedResponse } from '@repo/shared/types/api-contracts'
import type { Property, PropertyWithVersion } from '@repo/shared/types/core'
import { useMemo } from 'react'

import { useUser } from '#hooks/api/use-auth'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { propertyQueries, type PropertyFilters } from './queries/property-queries'

/**
 * Hook to fetch property by ID
 */
export function useProperty(id: string) {
	return useQuery(propertyQueries.detail(id))
}

/**
 * Hook to fetch property list with pagination and search
 * Returns plain array of properties with automatic detail prefetching
 */
export function usePropertyList(params?: {
	search?: string | null
	limit?: number
	offset?: number
}) {
	const { search = null, limit = 50, offset = 0 } = params || {}

	const filters: PropertyFilters = {
		...(search ? { search } : {}),
		limit,
		offset
	}

	const listQuery = propertyQueries.list(filters)

	return useQuery({
		...listQuery,
		...QUERY_CACHE_TIMES.LIST,
		// Extract data array for backward compatibility with components
		select: (response) => response.data,
		retry: 2,
		structuralSharing: true
	})
}

/**
 * Hook to fetch properties with their units
 * Optimized for property management pages
 */
export function usePropertiesWithUnits() {
	return useQuery(propertyQueries.withUnits())
}

/**
 * Hook to fetch property statistics
 */
export function usePropertyStats() {
	return useQuery(propertyQueries.stats())
}

/**
 * Hook to fetch property performance analytics
 */
export function usePropertyPerformanceAnalytics() {
	return useQuery(propertyQueries.performance())
}

/**
 * Hook to fetch property occupancy analytics
 */
export function usePropertyOccupancyAnalytics() {
	return useQuery(propertyQueries.analytics.occupancy())
}

/**
 * Hook to fetch property financial analytics
 */
export function usePropertyFinancialAnalytics() {
	return useQuery(propertyQueries.analytics.financial())
}

/**
 * Hook to fetch property maintenance analytics
 */
export function usePropertyMaintenanceAnalytics() {
	return useQuery(propertyQueries.analytics.maintenance())
}

/**
 * Mutation hook to create a new property with optimistic updates
 */
export function useCreateProperty() {
	const queryClient = useQueryClient()
	const { data: user } = useUser()

	return useMutation({
		mutationFn: async (
			propertyData: PropertyCreate
		): Promise<Property> => {
			const ownerUserId =
				user?.id ??
				(propertyData as unknown as { owner_user_id?: string })?.owner_user_id ??
				(propertyData as unknown as { property_owner_id?: string })?.property_owner_id ??
				null

			const payload = {
				...propertyData,
				owner_user_id: ownerUserId
			} as PropertyCreate & { owner_user_id?: string | null }

			return apiRequest<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(payload)
			})
		},
		onMutate: async (newProperty: PropertyCreate) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })

			// Snapshot previous state (cache stores PaginatedResponse<Property>)
			const previousLists = queryClient.getQueriesData<PaginatedResponse<Property>>({
				queryKey: propertyQueries.lists()
			})

			// Create optimistic property entry
			const tempId = `temp-${Date.now()}`
			const owner_user_id =
				user?.id ??
				(newProperty as unknown as { owner_user_id?: string })?.owner_user_id ??
				(newProperty as unknown as { property_owner_id?: string })?.property_owner_id ??
				null

			const optimisticProperty = {
				id: tempId,
				name: newProperty.name,
				address_line1: newProperty.address_line1,
				address_line2: newProperty.address_line2 || null,
				city: newProperty.city,
				state: newProperty.state,
				postal_code: newProperty.postal_code,
				country: newProperty.country || 'US',
				owner_user_id,
				property_type: newProperty.property_type || 'SINGLE_FAMILY',
				status: 'active',
				date_sold: null,
				sale_price: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			} as Property & { owner_user_id?: string | null }

			// Optimistically update all caches (handle PaginatedResponse structure)
			queryClient.setQueriesData<PaginatedResponse<Property>>(
				{ queryKey: propertyQueries.lists() },
				old => {
					if (!old) return old
					return {
						...old,
						data: [optimisticProperty, ...old.data],
						total: old.total + 1
					}
				}
			)

			return { previousLists, tempId }
		},
		onError: (err, _variables, context) => {
			// Rollback on error
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			handleMutationError(err, 'Create property')
		},
		onSuccess: (data, _variables, context) => {
			handleMutationSuccess(
				'Create property',
				`${data.name} has been added to your portfolio`
			)

			// Replace optimistic entry with real data (handle PaginatedResponse)
			queryClient.setQueriesData<PaginatedResponse<Property>>(
				{ queryKey: propertyQueries.lists() },
				old => {
					if (!old) return old
					return {
						...old,
						data: old.data.map(property =>
							property.id === context?.tempId ? data : property
						)
					}
				}
			)

			// Cache individual property details
			queryClient.setQueryData(propertyQueries.detail(data.id).queryKey, data)
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.stats().queryKey })
		}
	})
}

/**
 * Mutation hook to update an existing property with optimistic updates
 */
export function useUpdateProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: PropertyUpdate
			version?: number
		}): Promise<Property> => {
			return apiRequest<Property>(`/api/v1/properties/${id}`, {
				method: 'PUT',
				// OPTIMISTIC LOCKING: Include version if provided
				body: JSON.stringify(
					version !== null && version !== undefined
						? withVersion(data, version)
						: data
				)
			})
		},
		onMutate: async ({ id, data }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: propertyQueries.detail(id).queryKey })
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })

			// Snapshot previous state
			const previousDetail = queryClient.getQueryData<Property>(
				propertyQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Property[]>({
				queryKey: propertyQueries.lists()
			})

			// Optimistically update detail cache
		queryClient.setQueryData<PropertyWithVersion>(propertyQueries.detail(id).queryKey, old =>
			old ? incrementVersion(old, data as Partial<PropertyWithVersion>) : undefined
		)

			// Optimistically update list caches
		queryClient.setQueriesData<PropertyWithVersion[]>(
			{ queryKey: propertyQueries.lists() },
			old => {
				if (!old) return old
				return old.map(property =>
					property.id === id ? incrementVersion(property, data as Partial<PropertyWithVersion>) : property
				)
			}
		)

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					propertyQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			//Handle 409 Conflict using helper
			if (isConflictError(err)) {
				handleConflictError('properties', id, queryClient, [
					propertyQueries.detail(id).queryKey,
					propertyQueries.lists()
				])
			} else {
				handleMutationError(err, 'Update property')
			}
		},
		onSuccess: (data, { id }) => {
			handleMutationSuccess(
				'Update property',
				`${data.name} has been updated successfully`
			)

			// Replace optimistic update with real data (including correct version)
			queryClient.setQueryData(propertyQueries.detail(id).queryKey, data)

			queryClient.setQueriesData<Property[]>(
				{ queryKey: propertyQueries.lists() },
				old => (old ? old.map(property => (property.id === id ? data : property)) : old)
			)
		},
		onSettled: (_data, _error, { id }) => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertyQueries.detail(id).queryKey })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.stats().queryKey })
		}
	})
}

/**
 * Mark property as sold (7-year retention compliance)
 * Updates status to SOLD with required date_sold and sale_price fields
 */
export function useMarkPropertySold() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			id,
			dateSold,
			salePrice,
			saleNotes
		}: {
			id: string
			dateSold: Date
			salePrice: number
			saleNotes?: string
		}): Promise<{ success: boolean; message: string }> => {
			return apiRequest<{ success: boolean; message: string }>(
				`/api/v1/properties/${id}/mark-sold`,
				{
					method: 'PUT',
					body: JSON.stringify({
						dateSold: dateSold.toISOString(),
						salePrice,
						saleNotes
					})
				}
			)
		},
		onMutate: async ({ id }) => {
			// Cancel outgoing queries
			await queryClient.cancelQueries({ queryKey: propertyQueries.detail(id).queryKey })
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })

			// Snapshot previous state for rollback
			const previousDetail = queryClient.getQueryData<Property>(
				propertyQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Property[]>({
				queryKey: propertyQueries.lists()
			})

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
			// Rollback on error
			if (context?.previousDetail) {
				queryClient.setQueryData(
					propertyQueries.detail(id).queryKey,
					context.previousDetail
				)
			}
			if (context?.previousLists) {
				context.previousLists.forEach(([queryKey, data]) => {
					queryClient.setQueryData(queryKey, data)
				})
			}

			logger.error('Failed to mark property as sold', {
				property_id: id,
				error: err instanceof Error ? err.message : String(err)
			})
		},
		onSuccess: data => {
			logger.info('Property marked as sold', { message: data.message })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.stats().queryKey })
		}
	})
}

/**
 * Delete property with optimistic updates and rollback
 * Removes property from list immediately, rolls back on error
 */
export function useDeleteProperty() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string): Promise<{ message: string }> => {
			return apiRequest<{ message: string }>(`/api/v1/properties/${id}`, {
				method: 'DELETE'
			})
		},
		onMutate: async id => {
			// Cancel outgoing queries to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })
			await queryClient.cancelQueries({ queryKey: propertyQueries.detail(id).queryKey })

			// Snapshot previous state for rollback
			const previousList = queryClient.getQueryData<Property[]>(
				propertyQueries.list().queryKey
			)

			// Optimistically remove from list
			if (previousList) {
				queryClient.setQueryData<Property[]>(
					propertyQueries.list().queryKey,
					previousList.filter(prop => prop.id !== id)
				)
			}

			return { previousList }
		},
		onError: (error, id, context) => {
			// Rollback on error
			if (context?.previousList) {
				queryClient.setQueryData<Property[]>(
					propertyQueries.list().queryKey,
					context.previousList
				)
			}

			handleMutationError(error, 'Delete property')
		},
			onSuccess: (_, id) => {
			handleMutationSuccess(
				'Delete property',
				'Property has been removed from your portfolio'
			)

			// Remove individual property cache
			queryClient.removeQueries({ queryKey: propertyQueries.detail(id).queryKey })
		},
		onSettled: () => {
			// Refetch to ensure consistency
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: propertyQueries.stats().queryKey })
		}
	})
}

/**
 * Hook for prefetching property details (for hover states)
 */
export function usePrefetchProperty() {
	const queryClient = useQueryClient()

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: propertyQueries.detail(id).queryKey,
			queryFn: async (): Promise<Property> => {
				return apiRequest<Property>(`/api/v1/properties/${id}`)
			},
			...QUERY_CACHE_TIMES.DETAIL
		})
	}
}

/**
 * Combined hook for all property operations
 * Convenience hook for components that need multiple operations
 */
/**
 * Hook to fetch property images
 * Uses Supabase client directly with RLS
 */
export function usePropertyImages(property_id: string) {
	return useQuery(propertyQueries.images(property_id))
}

export function usePropertyOperations() {
	const create = useCreateProperty()
	const update = useUpdateProperty()
	const remove = useDeleteProperty()
	const markSold = useMarkPropertySold()

	return useMemo(
		() => ({
			create,
			update,
			delete: remove,
			markSold,
			isLoading: create.isPending || update.isPending || remove.isPending
		}),
		[create, update, remove, markSold]
	)
}
