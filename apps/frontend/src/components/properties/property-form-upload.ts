import { toast } from 'sonner'
import type { RefObject } from 'react'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import type { FileWithStatus } from './sections/property-images-create-section'

const logger = createLogger({ component: 'PropertyFormUpload' })

interface UploadImagesParams {
	propertyId: string
	files: FileWithStatus[]
	supabase: SupabaseClient
	queryClient: QueryClient
	isMountedRef: RefObject<boolean>
	setUploadingImages: (uploading: boolean) => void
	setFilesWithStatus: (
		updater: (prev: FileWithStatus[]) => FileWithStatus[]
	) => void
}

export async function uploadPropertyImages({
	propertyId,
	files,
	supabase,
	queryClient,
	isMountedRef,
	setUploadingImages,
	setFilesWithStatus
}: UploadImagesParams): Promise<void> {
	setUploadingImages(true)
	try {
		const uploadPromises = files.map(async (fileWithStatus, index) => {
			const { file } = fileWithStatus

			setFilesWithStatus(prev =>
				prev.map((f, i) =>
					i === index ? { ...f, status: 'uploading' as const } : f
				)
			)

			try {
				const fileExt = file.name.split('.').pop()
				const fileName = `${crypto.randomUUID()}.${fileExt}`
				const filePath = `${propertyId}/${fileName}`

				const { error: uploadError } = await supabase.storage
					.from('property-images')
					.upload(filePath, file, { cacheControl: '3600', upsert: false })

				if (uploadError) throw uploadError

				setFilesWithStatus(prev =>
					prev.map((f, i) =>
						i === index ? { ...f, status: 'success' as const } : f
					)
				)
			} catch (error) {
				logger.error('Storage upload failed', {
					action: 'image_upload_error',
					metadata: {
						fileName: file.name,
						propertyId,
						error: error instanceof Error ? error.message : String(error)
					}
				})
				setFilesWithStatus(prev =>
					prev.map((f, i) =>
						i === index
							? {
									...f,
									status: 'error' as const,
									error:
										error instanceof Error ? error.message : 'Upload failed'
								}
							: f
					)
				)
				throw error
			}
		})

		const results = await Promise.allSettled(uploadPromises)
		const successCount = results.filter(r => r.status === 'fulfilled').length
		const errorCount = results.filter(r => r.status === 'rejected').length

		logger.info('Images upload completed', { propertyId, successCount, errorCount })

		queryClient.invalidateQueries({
			queryKey: propertyQueries.detail(propertyId).queryKey
		})
		queryClient.invalidateQueries({
			queryKey: propertyQueries.images(propertyId).queryKey
		})

		if (errorCount === 0) {
			toast.success(`Property created with ${successCount} image(s)`)
		} else if (successCount > 0) {
			toast.warning(
				`Property created. ${successCount} image(s) uploaded, ${errorCount} failed`
			)
		} else {
			toast.error('Property created but all images failed to upload')
		}
	} catch (error) {
		logger.error('Failed to upload images', { error })
		toast.error('An unexpected error occurred during image upload')
	} finally {
		setUploadingImages(false)
		setTimeout(() => {
			if (isMountedRef.current) {
				setFilesWithStatus(prev => {
					for (const { objectUrl } of prev) {
						URL.revokeObjectURL(objectUrl)
					}
					return []
				})
			}
		}, 2000)
	}
}
