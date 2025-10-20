/**
 * Custom Hook for Property Image Upload with Compression
 *
 * Wraps Supabase Dropzone with automatic image compression before upload.
 * Reduces file sizes by up to 90% while maintaining visual quality.
 */

import {
	useSupabaseUpload,
	type UseSupabaseUploadOptions
} from '@/hooks/use-supabase-upload'
import { compressImage, formatFileSize } from '@/lib/image-compression'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'PropertyImageUpload' })
const supabase = createClient()

export interface PropertyImageUploadOptions
	extends Omit<UseSupabaseUploadOptions, 'bucketName'> {
	/**
	 * Property ID for organizing uploaded images
	 * If not provided, uses 'temp' folder
	 */
	propertyId?: string

	/**
	 * Callback when upload completes successfully with public URL
	 */
	onUploadComplete?: (url: string) => void

	/**
	 * Callback when upload fails
	 */
	onUploadError?: (error: Error) => void
}

/**
 * Hook for uploading property images with automatic compression
 *
 * Features:
 * - Automatic image compression (500KB max, 1920x1080 max dimensions)
 * - Drag & drop support via Supabase Dropzone
 * - Progress tracking
 * - Error handling
 * - Public URL generation
 *
 * @example
 * ```tsx
 * const upload = usePropertyImageUpload({
 *   propertyId: 'prop-123',
 *   onUploadComplete: (url) => setImageUrl(url)
 * })
 *
 * return (
 *   <Dropzone {...upload.getRootProps()} {...upload.getInputProps()}>
 *     <DropzoneEmptyState />
 *     <DropzoneContent />
 *   </Dropzone>
 * )
 * ```
 */
export function usePropertyImageUpload(
	options: PropertyImageUploadOptions = {}
) {
	const {
		propertyId,
		onUploadComplete,
		onUploadError,
		path: customPath,
		...dropzoneOptions
	} = options

	// Determine upload path
	const uploadPath = useMemo(() => {
		return (
			customPath ||
			(propertyId ? `properties/${propertyId}` : 'properties/temp')
		)
	}, [customPath, propertyId])

	// Use Supabase Dropzone with compression
	const uploadHook = useSupabaseUpload({
		bucketName: 'property-images',
		path: uploadPath,
		allowedMimeTypes: ['image/*'],
		maxFileSize: 10 * 1024 * 1024, // 10MB before compression
		maxFiles: 1,
		cacheControl: 3600,
		upsert: false,
		...dropzoneOptions
	})

	// Modify files before they're uploaded by compressing them
	const { files, setFiles } = uploadHook

	// Override the onUpload function to add compression
	const onUploadWithCompression = useCallback(async () => {
		if (files.length === 0) return

		try {
			// Compress all files first
			const compressedFiles: File[] = []

			for (const file of files) {
				try {
					// Show compression toast
					toast.info(`Compressing ${file.name}...`)

					// Compress image
					const compressed = await compressImage(file)

					logger.info('Image compressed', {
						action: 'compress',
						originalSize: compressed.originalSize,
						compressedSize: compressed.compressedSize,
						reduction: `${Math.round((1 - compressed.compressionRatio) * 100)}%`
					})

					toast.success(
						`Compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`
					)

					compressedFiles.push(compressed.file)
				} catch (error) {
					logger.error('Compression failed', { action: 'compress' }, error)
					toast.error(`Failed to compress ${file.name}`)
					if (error instanceof Error && onUploadError) {
						onUploadError(error)
					}
					return
				}
			}

			// Replace files with compressed versions
			setFiles(
				compressedFiles.map(file => {
					const fileWithPreview = file as File & {
						preview?: string
						errors: readonly { code: string; message: string }[]
					}
					fileWithPreview.preview = URL.createObjectURL(file)
					fileWithPreview.errors = []
					return fileWithPreview
				})
			)

			// Now call the original upload function
			await uploadHook.onUpload()

			// Check if upload succeeded and trigger callback
			if (uploadHook.isSuccess && onUploadComplete) {
				// Get the uploaded URL
				if (uploadHook.successes.length > 0) {
					const fileName = uploadHook.files.find(f =>
						uploadHook.successes.includes(f.name)
					)?.name
					if (fileName) {
						const { data } = supabase.storage
							.from('property-images')
							.getPublicUrl(`${uploadPath}/${fileName}`)
						onUploadComplete(data.publicUrl)
					}
				}
			}
		} catch (error) {
			logger.error('Upload failed', { action: 'upload' }, error)
			toast.error('Failed to upload image')
			if (error instanceof Error && onUploadError) {
				onUploadError(error)
			}
		}
	}, [files, setFiles, uploadHook, onUploadComplete, onUploadError, uploadPath])

	// Return modified hook with compression
	return {
		...uploadHook,
		onUpload: onUploadWithCompression,
		// Helper to get the uploaded URL
		getUploadedUrl: (): string | null => {
			if (uploadHook.successes.length === 0) return null
			const fileName = uploadHook.files.find(f =>
				uploadHook.successes.includes(f.name)
			)?.name
			if (!fileName) return null

			const { data } = supabase.storage
				.from('property-images')
				.getPublicUrl(`${uploadPath}/${fileName}`)

			return data.publicUrl
		}
	}
}
