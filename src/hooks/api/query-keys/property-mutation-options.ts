/**
 * Property Mutation Options
 * mutationOptions() factories for property domain mutations.
 *
 * Contains ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled callbacks stay in hook files
 * (they need useQueryClient which is a React hook).
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import { createLogger, logger } from '#lib/frontend-logger'
import type { Property } from '#types/core'
import type {
	PropertyCreate,
	PropertyUpdate
} from '#lib/validation/properties'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const propertyMutations = {
	create: () =>
		mutationOptions<Property, unknown, PropertyCreate>({
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
			}
		}),

	update: () =>
		mutationOptions<Property, unknown, { id: string; data: PropertyUpdate; version?: number }>({
			mutationKey: mutationKeys.properties.update,
			mutationFn: async ({
				id,
				data,
				version
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
			}
		}),

	delete: () =>
		mutationOptions<void, unknown, string>({
			mutationKey: mutationKeys.properties.delete,
			mutationFn: async (id: string): Promise<void> => {
				const supabase = createClient()
				const { error } = await supabase
					.from('properties')
					.update({ status: 'inactive' })
					.eq('id', id)

				if (error) handlePostgrestError(error, 'properties')
			}
		}),

	markSold: () =>
		mutationOptions<{ success: boolean; message: string }, unknown, { id: string; dateSold: Date; salePrice: number }>({
			mutationKey: mutationKeys.properties.markSold,
			mutationFn: async ({
				id,
				dateSold,
				salePrice
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
			}
		}),

	deleteImage: () =>
		mutationOptions<{ success: boolean }, unknown, { imageId: string; property_id: string; imagePath?: string }>({
			mutationKey: mutationKeys.properties.deleteImage,
			mutationFn: async ({
				imageId,
				imagePath
			}) => {
				const supabase = createClient()
				const mutationLogger = createLogger({ component: 'PropertyMutations' })

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
			}
		})
}
