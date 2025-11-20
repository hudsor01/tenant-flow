/**
 * Property Mutation Options (TanStack Query v5 Pattern)
 *
 * Modern mutation patterns with proper error handling and cache invalidation.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clientFetch } from '#lib/api/client'
import type { CreatePropertyInput, UpdatePropertyInput } from '@repo/shared/types/api-contracts'
import type { Property } from '@repo/shared/types/core'
import { propertyQueries } from '../queries/property-queries'
import { unitQueries } from '../queries/unit-queries'
import { handleMutationError } from '#lib/mutation-error-handler'
import { toast } from 'sonner'

/**
 * Hook to get property images
 */
export function usePropertyImages(property_id: string) {
	return useQuery(propertyQueries.images(property_id))
}

/**
 * Create property mutation
 */
export function useCreatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: CreatePropertyInput) =>
			clientFetch<Property>('/api/v1/properties', {
				method: 'POST',
				body: JSON.stringify(data)
			}),
		onSuccess: (_newProperty) => {
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Property created successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Create property')
		}
	})
}

/**
 * Update property mutation
 */
export function useUpdatePropertyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ id, data, version }: { id: string; data: UpdatePropertyInput; version?: number }) =>
			clientFetch<Property>(`/api/v1/properties/${id}`, {
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
		mutationFn: (id: string) =>
			clientFetch(`/api/v1/properties/${id}`, {
				method: 'DELETE'
			}),
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
 */
export function useDeletePropertyImageMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({
			imageId
		}: {
			imageId: string
			property_id: string
		}) =>
			clientFetch<{ message: string }>(`/api/v1/properties/images/${imageId}`, {
				method: 'DELETE'
			}),
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

/**
 * Upload property image mutation
 */
export function useUploadPropertyImageMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			property_id,
			file,
			isPrimary = false,
			caption
		}: {
			property_id: string
			file: File
			isPrimary?: boolean
			caption?: string
		}) => {
			const formData = new FormData()
			formData.append('file', file)
			formData.append('isPrimary', String(isPrimary))
			if (caption) formData.append('caption', caption)

			return await clientFetch(
				`/api/v1/properties/${property_id}/images`,
				{
					method: 'POST',
					body: formData
				}
			)
		},
		onSuccess: (data, { property_id }) => {
			// Invalidate property images
			queryClient.invalidateQueries({
				queryKey: [...propertyQueries.detail(property_id).queryKey, 'images']
			})
			// Invalidate property list (primary image may have changed)
			queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			toast.success('Image uploaded successfully')
		},
		onError: (error) => {
			handleMutationError(error, 'Upload image')
		}
	})
}