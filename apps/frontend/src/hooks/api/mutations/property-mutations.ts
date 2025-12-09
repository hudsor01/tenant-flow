/**
 * Property Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 * Uses apiRequest for NestJS calls.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#utils/supabase/client'
import { apiRequest } from '#lib/api-request'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'
import type { PropertyCreate, PropertyUpdate } from '@repo/shared/validation/properties'
import type { Property } from '@repo/shared/types/core'
import { propertyQueries } from '../queries/property-queries'
import { unitQueries } from '../queries/unit-queries'
import { createCrudMutations } from '../crud-mutations'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const { useCreateMutation: useCreatePropertyMutationBase } =
	createCrudMutations<PropertyCreate, PropertyUpdate, Property>({
		entityName: 'Property',
		createEndpoint: '/api/v1/properties',
		updateEndpoint: (id) => `/api/v1/properties/${id}`,
		deleteEndpoint: (id) => `/api/v1/properties/${id}`,
		listQueryKey: propertyQueries.lists,
		detailQueryKey: (id) => propertyQueries.detail(id).queryKey
	})

/**
 * Hook to get property images
 */
export function usePropertyImages(property_id: string) {
	return useQuery(propertyQueries.images(property_id))
}

/**
 * Create property mutation
 */
export const useCreatePropertyMutation = useCreatePropertyMutationBase

/**
 * Update property mutation
 */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ id, data, version }: { id: string; data: PropertyUpdate; version?: number }) =>
			apiRequest<Property>(`/api/v1/properties/${id}`, {
				method: 'PUT',
				body: JSON.stringify(version ? { ...data, version } : data)
			}),
		onSuccess: (updatedProperty) => {
			queryClient.setQueryData(
				propertyQueries.detail(updatedProperty.id).queryKey,
				updatedProperty
			)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			toast.success('Property updated successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Update property')
		}
	})
}

/**
 * Delete property mutation
 */
export function useDeletePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async (id: string) =>
			apiRequest<void>(`/api/v1/properties/${id}`, { method: 'DELETE' }),
		onSuccess: (_result, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: propertyQueries.detail(deletedId).queryKey })
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			queryClient.invalidateQueries({ queryKey: unitQueries.lists() })
			toast.success('Property deleted successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete property')
		}
	})
}

/**
 * Delete property image mutation
 * Uses Supabase client directly with RLS (Dec 2025 best practice)
 */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient()
	const logger = createLogger({ component: 'PropertyMutations' })

	return useMutation({
		mutationFn: async ({
			imageId,
			imagePath
		}: {
			imageId: string
			property_id: string
			imagePath?: string // e.g., "property_id/filename.webp"
		}) => {
			const supabase = createClient()

			// Delete from database (RLS will verify ownership)
			const { error: dbError } = await supabase
				.from('property_images')
				.delete()
				.eq('id', imageId)

			if (dbError) throw new Error(dbError.message)

			// Delete from storage if path provided (non-blocking)
			if (imagePath) {
				try {
					await supabase.storage
						.from('property-images')
						.remove([imagePath])
				} catch {
					// Log warning but don't fail - DB cleanup is intact
					logger.warn('Storage deletion failed', {
						action: 'delete_storage_image_failed',
						metadata: { imagePath }
					})
				}
			}

			return { success: true }
		},
		onSuccess: (_, { property_id }) => {
			// Invalidate property images
			queryClient.invalidateQueries({
				queryKey: [...propertyQueries.detail(property_id).queryKey, 'images']
			})
			// Invalidate property list (primary image may have been deleted)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Image deleted successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Delete image')
		}
	})
}
