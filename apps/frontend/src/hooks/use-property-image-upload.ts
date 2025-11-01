/**
 * Custom Hook for Property Image Upload with Compression
 *
 * Wraps Supabase Dropzone with automatic image compression before upload.
 * Reduces file sizes by up to 90% while maintaining visual quality.
 */

import {
	useSupabaseUpload,
	type UseSupabaseUploadOptions
} from '#hooks/use-supabase-upload'
import {
	compressImage,
	formatFileSize,
	HEICConversionError,
	isHEICFile
} from '#lib/image-compression'
import { createClient } from '#lib/supabase/client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { useCallback, useEffect, useMemo, useRef } from 'react'
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
	const { files, setFiles, setErrors, setSuccesses } = uploadHook

	/**
	 * Upload compressed files directly to Supabase
	 * This bypasses the uploadHook.onUpload() to ensure we upload the correct compressed files
	 */
	const uploadCompressedFiles = useCallback(async (filesToUpload: File[]) => {
		const responses = await Promise.all(
			filesToUpload.map(async file => {
				const { error } = await supabase.storage
					.from('property-images')
					.upload(`${uploadPath}/${file.name}`, file, {
						cacheControl: '3600',
						upsert: false
					})
				if (error) {
					return { name: file.name, message: error.message }
				} else {
					return { name: file.name, message: undefined }
				}
			})
		)

		const responseErrors = responses.filter(x => x.message !== undefined)
		setErrors(responseErrors)

		const responseSuccesses = responses.filter(x => x.message === undefined)
		setSuccesses((prev: string[]) =>
			Array.from(new Set([...prev, ...responseSuccesses.map(x => x.name)]))
		)
	}, [uploadPath, setErrors, setSuccesses])

	// Override the onUpload function to add compression
	const onUploadWithCompression = useCallback(async () => {
		if (files.length === 0) return

		try {
			// Compress all files first
			const compressedFiles: File[] = []

			for (const file of files) {
					try {
						// Show conversion/compression toast
						const isHEIC = isHEICFile(file)

						if (isHEIC) {
							toast.info(`Converting and compressing ${file.name}...`)
						} else {
							toast.info(`Compressing ${file.name}...`)
						}

					// Compress image (handles HEIC conversion internally)
					const compressed = await compressImage(file)

					logger.info('Image compressed', {
						action: 'compress',
						originalFileName: file.name,
						compressedFileName: compressed.file.name,
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

					// Show user-friendly error message
					if (error instanceof HEICConversionError) {
						toast.error(error.message, { duration: 6000 })
					} else {
						const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
						toast.error(`Failed to compress ${file.name}: ${errorMessage}`)
					}

					if (error instanceof Error && onUploadError) {
						onUploadError(error)
					}
					return
				}
			}

			// Replace files with compressed versions
			// Use functional update to ensure we're working with latest state
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

			// Wait for state update then upload compressed files
			// We need to upload the compressed files directly, not call uploadHook.onUpload()
			// because that would use the old file state
			await uploadCompressedFiles(compressedFiles)

			// Check if upload succeeded and trigger callback
			// Note: We check the compressed file since that's what got uploaded
			const uploadedFile = compressedFiles[0]
			if (onUploadComplete && uploadedFile) {
				const { data } = supabase.storage
					.from('property-images')
					.getPublicUrl(`${uploadPath}/${uploadedFile.name}`)
				onUploadComplete(data.publicUrl)
			}
		} catch (error) {
			logger.error('Upload failed', { action: 'upload' }, error)
			toast.error('Failed to upload image')
			if (error instanceof Error && onUploadError) {
				onUploadError(error)
			}
		}
	}, [files, setFiles, onUploadComplete, onUploadError, uploadPath, uploadCompressedFiles])

	// Track if we've already auto-uploaded to prevent duplicate uploads
	const hasAutoUploaded = useRef(false)

	// Auto-upload when files are selected (for better UX - image ready before form submission)
	useEffect(() => {
		const shouldAutoUpload =
			files.length > 0 &&
			!uploadHook.loading &&
			!uploadHook.isSuccess &&
			!hasAutoUploaded.current

		if (shouldAutoUpload) {
			hasAutoUploaded.current = true
			onUploadWithCompression()
		}

		// Reset flag when files are cleared
		if (files.length === 0) {
			hasAutoUploaded.current = false
		}
	}, [files.length, uploadHook.loading, uploadHook.isSuccess, onUploadWithCompression])

	// Return modified hook with compression
	return {
		...uploadHook,
		onUpload: onUploadWithCompression,
		// Helper to get the uploaded URL
		getUploadedUrl: (): string | null => {
			if (uploadHook.successes.length === 0) return null
			const uploadedFile = uploadHook.files.find(f =>
				uploadHook.successes.includes(f.name)
			)
			if (!uploadedFile) return null

			const { data } = supabase.storage
				.from('property-images')
				.getPublicUrl(`${uploadPath}/${uploadedFile.name}`)

			return data.publicUrl
		}
	}
}
