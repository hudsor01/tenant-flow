import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Document } from '@/types/entities'

export interface PropertyDocument extends Document {
	// Additional properties for UI
	isUploading?: boolean
	progress?: number
}

/**
 * Get all documents for a specific property
 */
export function usePropertyDocuments(propertyId: string) {
	const { user } = useAuthStore()

	return useQuery({
		queryKey: ['property-documents', propertyId],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				// Use Supabase storage to list documents for this property
				const { data: files, error } = await supabase.storage
					.from('property-documents')
					.list(`${user.id}/${propertyId}`, {
						limit: 100,
						offset: 0
					})

				if (error) throw error

				const documents: PropertyDocument[] =
					files?.map(file => ({
						id: file.id || `doc-${Date.now()}-${Math.random()}`,
						name: file.name,
						type:
							file.metadata?.mimetype ||
							'application/octet-stream',
						size: file.metadata?.size || 0,
						url: supabase.storage
							.from('property-documents')
							.getPublicUrl(
								`${user.id}/${propertyId}/${file.name}`
							).data.publicUrl,
						uploadedAt: file.created_at || new Date().toISOString(),
						propertyId,
						category: file.name.toLowerCase().includes('lease')
							? 'lease'
							: file.name.toLowerCase().includes('inspection')
								? 'inspection'
								: file.name
											.toLowerCase()
											.includes('maintenance')
									? 'maintenance'
									: 'other'
					})) || []

				return documents
			} catch (error) {
				logger.error('Failed to fetch property documents', error)
				return []
			}
		},
		enabled: !!user?.id && !!propertyId
	})
}

/**
 * Get property images specifically
 */
export function usePropertyImages(propertyId: string) {
	const { user } = useAuthStore()

	return useQuery({
		queryKey: ['property-images', propertyId],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				// Use Supabase storage to list images for this property
				const { data: files, error } = await supabase.storage
					.from('property-images')
					.list(`${user.id}/${propertyId}`, {
						limit: 100,
						offset: 0
					})

				if (error) throw error

				const imageExtensions = [
					'.jpg',
					'.jpeg',
					'.png',
					'.gif',
					'.webp',
					'.bmp',
					'.svg'
				]
				const images: PropertyDocument[] =
					files
						?.filter(file =>
							imageExtensions.some(ext =>
								file.name.toLowerCase().endsWith(ext)
							)
						)
						?.map((file, index) => ({
							id: file.id || `img-${Date.now()}-${index}`,
							name: file.name,
							type: file.metadata?.mimetype || 'image/jpeg',
							size: file.metadata?.size || 0,
							url: supabase.storage
								.from('property-images')
								.getPublicUrl(
									`${user.id}/${propertyId}/${file.name}`
								).data.publicUrl,
							uploadedAt:
								file.created_at || new Date().toISOString(),
							propertyId,
							category: 'image'
						})) || []

				return images
			} catch (error) {
				logger.error('Failed to fetch property images', error)
				return []
			}
		},
		enabled: !!user?.id && !!propertyId
	})
}

/**
 * Upload property images
 */
export function useUploadPropertyImages() {
	const queryClient = useQueryClient()
	const { user } = useAuthStore()

	return useMutation({
		mutationFn: async ({
			files,
			propertyId,
			setPrimaryIndex
		}: {
			files: File[]
			propertyId: string
			setPrimaryIndex?: number
		}) => {
			if (!user) throw new Error('No user authenticated')

			// Use the API client for image upload
			const uploadPromises = files.map(async (file, index) => {
				const isPrimary = setPrimaryIndex === index
				const result = await apiClient.properties.uploadImage(
					propertyId,
					file
				)

				// If this is the primary image, update the property
				if (isPrimary) {
					await apiClient.properties.update(propertyId, {
						imageUrl: result.url
					})
				}

				return result
			})

			const results = await Promise.all(uploadPromises)
			return results
		},
		onSuccess: (_, variables) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: ['property-documents', variables.propertyId]
			})
			queryClient.invalidateQueries({
				queryKey: ['property-images', variables.propertyId]
			})
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			queryClient.invalidateQueries({
				queryKey: ['property', variables.propertyId]
			})
		}
	})
}

/**
 * Delete a property document
 */
export function useDeletePropertyDocument() {
	const queryClient = useQueryClient()
	const { user } = useAuthStore()

	return useMutation({
		mutationFn: async ({
			documentId,
			propertyId,
			fileName
		}: {
			documentId: string
			propertyId: string
			fileName: string
		}) => {
			if (!user?.id) throw new Error('No user ID')

			try {
				// Delete from Supabase storage
				const { error } = await supabase.storage
					.from('property-documents')
					.remove([`${user.id}/${propertyId}/${fileName}`])

				if (error) throw error

				logger.info('Document deleted successfully', undefined, {
					documentId,
					propertyId,
					fileName
				})

				return { documentId, propertyId, fileName }
			} catch (error) {
				logger.error('Failed to delete document', error)
				throw error
			}
		},
		onSuccess: result => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({
				queryKey: ['property-documents', result.propertyId]
			})
			queryClient.invalidateQueries({
				queryKey: ['property-images', result.propertyId]
			})
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			queryClient.invalidateQueries({
				queryKey: ['property', result.propertyId]
			})
		}
	})
}

/**
 * Set primary property image
 */
export function useSetPrimaryPropertyImage() {
	const queryClient = useQueryClient()
	const { user } = useAuthStore()

	return useMutation({
		mutationFn: async ({
			documentId,
			propertyId,
			imageUrl
		}: {
			documentId: string
			propertyId: string
			imageUrl: string
		}) => {
			if (!user?.id) throw new Error('No user ID')

			// Update property primary image using the API
			await apiClient.properties.update(propertyId, { imageUrl })

			return { documentId, propertyId, imageUrl }
		},
		onSuccess: result => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: ['properties'] })
			queryClient.invalidateQueries({
				queryKey: ['property', result.propertyId]
			})
		}
	})
}

/**
 * Create storage bucket for property images if it doesn't exist
 */
export function useEnsurePropertyImagesBucket() {
	const { user } = useAuthStore()

	return useMutation({
		mutationFn: async () => {
			if (!user?.id) throw new Error('No user ID')

			try {
				// Check if buckets exist, create if they don't
				const { data: buckets, error: listError } =
					await supabase.storage.listBuckets()

				if (listError) throw listError

				const bucketNames = ['property-images', 'property-documents']
				const existingBuckets = buckets?.map(b => b.name) || []

				for (const bucketName of bucketNames) {
					if (!existingBuckets.includes(bucketName)) {
						const { error: createError } =
							await supabase.storage.createBucket(bucketName, {
								public: true,
								allowedMimeTypes:
									bucketName === 'property-images'
										? [
												'image/jpeg',
												'image/png',
												'image/gif',
												'image/webp'
											]
										: [
												'application/pdf',
												'application/msword',
												'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
												'text/plain'
											],
								fileSizeLimit:
									bucketName === 'property-images'
										? 5242880
										: 10485760 // 5MB for images, 10MB for documents
							})

						if (createError) {
							logger.warn(
								`Bucket ${bucketName} might already exist`,
								createError
							)
						} else {
							logger.info(`Created storage bucket: ${bucketName}`)
						}
					}
				}

				return { success: true, buckets: bucketNames }
			} catch (error) {
				logger.error('Failed to ensure storage buckets', error)
				throw error
			}
		}
	})
}
