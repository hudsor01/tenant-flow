/**
 * Property Mutation Hooks — CRUD, mark-sold, image deletion.
 * Query hooks remain in use-properties.ts.
 */

import { useMutation, usePrefetchQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { handleMutationError } from '#lib/mutation-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'

import { createLogger, logger } from '#lib/frontend-logger.js'
import type { Property } from '#types/core'
import type {
	PropertyCreate,
	PropertyUpdate
} from '#lib/validation/properties'

import { propertyQueries } from './query-keys/property-keys'
import { propertyStatsQueries } from './query-keys/property-stats-keys'
import { unitQueries } from './query-keys/unit-keys'
import { mutationKeys } from './mutation-keys'
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
		mutationKey: mutationKeys.properties.markSold,
		mutationFn: async ({
			id,
			dateSold,
			salePrice
		}: {
			id: string
			dateSold: Date
			salePrice: number
		}): Promise<{ success: boolean; message: string }> => {
			const supabase = createClient()
			const { data: updated, error } = await supabase
				.from('properties')
				.update({
					status: 'sold',
					date_sold: dateSold.toISOString(),
					sale_price: salePrice
				})
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'properties')

			logger.info('Property marked as sold', { property_id: id, updated })
			return { success: true, message: 'Property marked as sold' }
		},
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
		mutationKey: mutationKeys.properties.create,
		mutationFn: async (data: PropertyCreate): Promise<Property> => {
			const supabase = createClient()
			const user = await getCachedUser()
			const ownerId = requireOwnerUserId(user?.id)

			const { data: created, error } = await supabase
				.from('properties')
				.insert({ ...data, owner_user_id: ownerId })
				.select()
				.single()

			if (error) handlePostgrestError(error, 'properties')

			return created as Property
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property created successfully')
		},
		onError: (error: unknown) => handleMutationError(error, 'Create property')
	})
}

/** Update property mutation */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.update,
		mutationFn: async ({
			id,
			data,
			version
		}: {
			id: string
			data: PropertyUpdate
			version?: number
		}): Promise<Property> => {
			const supabase = createClient()
			const updatePayload = version ? { ...data, version } : { ...data }
			const { data: updated, error } = await supabase
				.from('properties')
				.update(updatePayload)
				.eq('id', id)
				.select()
				.single()

			if (error) handlePostgrestError(error, 'properties')

			return updated as Property
		},
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
		onError: (error: unknown) => handleMutationError(error, 'Update property')
	})
}

/**
 * Delete property mutation
 * Soft-delete: sets status to 'inactive' (7-year data retention policy)
 */
export function useDeletePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.properties.delete,
		mutationFn: async (id: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('properties')
				.update({ status: 'inactive' })
				.eq('id', id)

			if (error) handlePostgrestError(error, 'properties')
		},
		onSuccess: (_result, deletedId) => {
			queryClient.removeQueries({
				queryKey: propertyQueries.detail(deletedId).queryKey
			})
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
			toast.success('Property deleted successfully')
		},
		onError: (error: unknown) => handleMutationError(error, 'Delete property')
	})
}

/** Delete property image mutation */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient()
	const mutationLogger = createLogger({ component: 'PropertyMutations' })

	return useMutation({
		mutationKey: mutationKeys.properties.deleteImage,
		mutationFn: async ({
			imageId,
			imagePath
		}: {
			imageId: string
			property_id: string
			imagePath?: string
		}) => {
			const supabase = createClient()

			const { error: dbError } = await supabase
				.from('property_images')
				.delete()
				.eq('id', imageId)

			if (dbError) throw new Error(dbError.message)

			if (imagePath) {
				try {
					await supabase.storage.from('property-images').remove([imagePath])
				} catch {
					mutationLogger.warn('Storage deletion failed', {
						action: 'delete_storage_image_failed',
						metadata: { imagePath }
					})
				}
			}

			return { success: true }
		},
		onSuccess: (_, { property_id }) => {
			queryClient.invalidateQueries({
				queryKey: [...propertyQueries.detail(property_id).queryKey, 'images']
			})
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Image deleted successfully')
		},
		onError: (error: unknown) => handleMutationError(error, 'Delete image')
	})
}
