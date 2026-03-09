/**
 * Property Mutation Hooks -- CRUD, mark-sold, image deletion.
 * Query hooks remain in use-properties.ts.
 *
 * mutationFn logic lives in propertyMutations factories (query-keys/property-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, usePrefetchQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { handleMutationError } from '#lib/mutation-error-handler'

import { logger } from '#lib/frontend-logger'
import type { Property } from '#types/core'

import { propertyQueries } from './query-keys/property-keys'
import { propertyMutations } from './query-keys/property-mutation-options'
import { propertyStatsQueries } from './query-keys/property-stats-keys'
import { unitQueries } from './query-keys/unit-keys'
import { ownerDashboardKeys } from './use-owner-dashboard'

// ============================================================================
// PREFETCH HOOKS
// ============================================================================

/**
 * Declarative prefetch hook for property detail
 * Prefetches when component mounts (route-level prefetching)
 */
export function usePrefetchPropertyDetail(id: string) {
	usePrefetchQuery(propertyQueries.detail(id))
}

/**
 * Declarative prefetch hook for property with related units
 */
export function usePrefetchPropertyWithUnits(id: string) {
	usePrefetchQuery(propertyQueries.detail(id))
	usePrefetchQuery(unitQueries.byProperty(id))
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mark property as sold (7-year retention compliance)
 */
export function useMarkPropertySoldMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.markSold(),
		onMutate: async ({ id }) => {
			await queryClient.cancelQueries({
				queryKey: propertyQueries.detail(id).queryKey
			})
			await queryClient.cancelQueries({ queryKey: propertyQueries.lists() })

			const previousDetail = queryClient.getQueryData<Property>(
				propertyQueries.detail(id).queryKey
			)
			const previousLists = queryClient.getQueriesData<Property[]>({
				queryKey: propertyQueries.lists()
			})

			return { previousDetail, previousLists }
		},
		onError: (err, { id }, context) => {
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
			handleMutationError(err, 'Mark property as sold')
		},
		onSuccess: data => {
			logger.info('Property marked as sold', { message: data.message })
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({
				queryKey: propertyStatsQueries.stats().queryKey
			})
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
		}
	})
}

/** Create property mutation */
export function useCreatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.create(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property created successfully')
		},
		onError: error => handleMutationError(error, 'Create property')
	})
}

/** Update property mutation */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.update(),
		onSuccess: updatedProperty => {
			queryClient.setQueryData(
				propertyQueries.detail(updatedProperty.id).queryKey,
				updatedProperty
			)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.analytics.stats() })
			toast.success('Property updated successfully')
		},
		onError: error => handleMutationError(error, 'Update property')
	})
}

/**
 * Delete property mutation
 * Soft-delete: sets status to 'inactive' (7-year data retention policy)
 */
export function useDeletePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.delete(),
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({
				queryKey: propertyQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property deleted successfully')
		},
		onError: error => handleMutationError(error, 'Delete property')
	})
}

/** Delete property image mutation */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.deleteImage(),
		onSuccess: (_, { property_id }) => {
			queryClient.invalidateQueries({
				queryKey: [...propertyQueries.detail(property_id).queryKey, 'images']
			})
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Image deleted successfully')
		},
		onError: error => handleMutationError(error, 'Delete image')
	})
}
