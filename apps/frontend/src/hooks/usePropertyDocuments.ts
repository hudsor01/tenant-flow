// Refactored: usePropertyDocuments now uses tRPC for backend property image/document updates, but keeps Supabase for storage

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc, supabase } from '@/lib/api'
import { useAuth } from '@/hooks/useApiAuth'
import { logger } from '@/lib/logger'

export interface PropertyDocument {
	id: string
	name: string
	url: string
	type: string
	size: number
	uploadedAt: string
	propertyId: string
	category: string
	isUploading?: boolean
	progress?: number
}

/**
 * Get all documents for a specific property
 */
export function usePropertyDocuments(propertyId: string) {
	const { user } = useAuth()

	return useQuery({
		queryKey: ['property-documents', propertyId],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user token')
			if (!supabase) throw new Error('Supabase client not initialized')

			try {
				const { data: files, error } = await supabase.storage
					.from('property-documents')
					.list(`${user.id}/${propertyId}`, {
						limit: 100,
						offset: 0
					})

				if (error) throw error

				const documents: PropertyDocument[] =
					files?.map(file => {
						if (!supabase)
							throw new Error('Supabase client not initialized')
						return {
							id:
								file.id ||
								`doc-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
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
							uploadedAt: file.created_at ?? undefined,
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
						}
					}) || []

				return documents
			} catch (error) {
				logger.error(
					'Failed to fetch property documents',
					error as Error
				)
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
	const { user } = useAuth()

	return useQuery({
		queryKey: ['property-images', propertyId],
		queryFn: async () => {
			if (!user?.id) throw new Error('No user ID')
			if (!supabase) throw new Error('Supabase client not initialized')

			try {
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
						?.map((file, index) => {
							if (!supabase)
								throw new Error(
									'Supabase client not initialized'
								)
							return {
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
							}
						}) || []

				return images
			} catch (error) {
				logger.error('Failed to fetch property images', error as Error)
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
	const { user } = useAuth()
	const updateProperty = trpc.properties.update.useMutation()

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
			if (!supabase) throw new Error('Supabase client not initialized')

			const uploadPromises = files.map(async (file, index) => {
				const isPrimary = setPrimaryIndex === index

				if (!supabase)
					throw new Error('Supabase client not initialized')
				const { error } = await supabase.storage
					.from('property-images')
					.upload(`${user.id}/${propertyId}/${file.name}`, file, {
						cacheControl: '3600',
						upsert: true
					})

				if (error) throw error

				if (!supabase)
					throw new Error('Supabase client not initialized')
				const publicUrl = supabase.storage
					.from('property-images')
					.getPublicUrl(`${user.id}/${propertyId}/${file.name}`)
					.data.publicUrl

				if (isPrimary) {
					await updateProperty.mutateAsync({
						id: propertyId,
						imageUrl: publicUrl
					})
				}

				return { url: publicUrl, name: file.name }
			})

			const results = await Promise.all(uploadPromises)
			return results
		},
		onSuccess: (_, variables) => {
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
	const { user } = useAuth()

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
			if (!supabase) throw new Error('Supabase client not initialized')

			try {
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
				logger.error('Failed to delete document', error as Error)
				throw error
			}
		},
		onSuccess: result => {
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
	const { user } = useAuth()
	const updateProperty = trpc.properties.update.useMutation()

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

			await updateProperty.mutateAsync({
				id: propertyId,
				imageUrl: imageUrl
			})

			return { documentId, propertyId, imageUrl }
		},
		onSuccess: result => {
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
	const { user } = useAuth()

	return useMutation({
		mutationFn: async () => {
			if (!user?.id) throw new Error('No user ID')
			if (!supabase) throw new Error('Supabase client not initialized')

			try {
				const { data: buckets, error: listError } =
					await supabase.storage.listBuckets()

				if (listError) throw listError

				const bucketNames = ['property-images', 'property-documents']
				const existingBuckets = buckets?.map(b => b.name) || []

				const IMAGE_FILE_SIZE_LIMIT = 5 * 1024 * 1024 // 5MB in bytes
				const DOCUMENT_FILE_SIZE_LIMIT = 10 * 1024 * 1024 // 10MB in bytes

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
										? IMAGE_FILE_SIZE_LIMIT
										: DOCUMENT_FILE_SIZE_LIMIT
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
				logger.error('Failed to ensure storage buckets', error as Error)
				throw error
			}
		}
	})
}
