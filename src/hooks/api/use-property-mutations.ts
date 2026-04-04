/**
 * Property Mutation Hooks -- CRUD, mark-sold, image deletion.
 * Query hooks remain in use-properties.ts.
 *
 * mutationFn logic lives in propertyMutations factories (query-keys/property-mutation-options.ts).
 * This file spreads factories and adds onSuccess/onError/onSettled callbacks.
 */

import { useMutation, usePrefetchQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createMutationCallbacks } from '#hooks/create-mutation-callbacks'
import { handleMutationError } from '#lib/mutation-error-handler'

import { logger } from '#lib/frontend-logger'
import type { Property } from '#types/core'

import { propertyQueries } from './query-keys/property-keys'
import { propertyMutations } from './query-keys/property-keys'
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
		...createMutationCallbacks<
			{ message: string },
			{ id: string },
			{
				previousDetail: Property | undefined
				previousLists: [readonly unknown[], Property[] | undefined][]
			}
		>(queryClient, {
			invalidate: [
				propertyQueries.lists(),
				propertyStatsQueries.stats().queryKey,
				ownerDashboardKeys.all
			],
			errorContext: 'Mark property as sold',
			onSuccessExtra: (data) => {
				logger.info('Property marked as sold', { message: data.message })
			},
			optimistic: {
				cancel: (variables) => [
					propertyQueries.detail(variables.id).queryKey,
					propertyQueries.lists()
				],
				snapshot: (qc, variables) => ({
					previousDetail: qc.getQueryData<Property>(
						propertyQueries.detail(variables.id).queryKey
					),
					previousLists: qc.getQueriesData<Property[]>({
						queryKey: propertyQueries.lists()
					})
				}),
				rollback: (qc, context, variables) => {
					if (context.previousDetail) {
						qc.setQueryData(
							propertyQueries.detail(variables.id).queryKey,
							context.previousDetail
						)
					}
					if (context.previousLists) {
						context.previousLists.forEach(([queryKey, data]) => {
							qc.setQueryData(queryKey, data)
						})
					}
				}
			}
		})
	})
}

/** Create property mutation */
export function useCreatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.create(),
		...createMutationCallbacks(queryClient, {
			invalidate: [propertyQueries.lists(), ownerDashboardKeys.all],
			successMessage: 'Property created successfully',
			errorContext: 'Create property'
		})
	})
}

/** Update property mutation */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...propertyMutations.update(),
		...createMutationCallbacks<Property>(queryClient, {
			invalidate: [
				propertyQueries.lists(),
				unitQueries.lists(),
				ownerDashboardKeys.analytics.stats()
			],
			updateDetail: (property) => ({
				queryKey: propertyQueries.detail(property.id).queryKey,
				data: property
			}),
			successMessage: 'Property updated successfully',
			errorContext: 'Update property'
		})
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
