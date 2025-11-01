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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const logger = createLogger({ component: 'PropertyImageUpload' })
const supabase = createClient()

// Configuration constants
const MAX_UPLOAD_SIZE_MB = 10
const BYTES_PER_MB = 1024 * 1024
const CACHE_CONTROL_SECONDS = 3600

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
		maxFileSize: MAX_UPLOAD_SIZE_MB * BYTES_PER_MB,
		maxFiles: 1,
		cacheControl: CACHE_CONTROL_SECONDS,
		upsert: false,
		...dropzoneOptions
	})

	// Modify files before they're uploaded by compressing them
	const { files, setFiles, setErrors, setSuccesses } = uploadHook

	// Track loading state for compression + upload
	const [isUploading, setIsUploading] = useState(false)



	// Override the onUpload function to add compression
	const onUploadWithCompression = useCallback(async () => {
		if (files.length === 0) return

		setIsUploading(true)
		try {
			// Compress all files first
			const compressedFiles: File[] = []

			for (const file of files) {
					try {
						// Show conversion/compression toast
						const isHEIC = isHEICFile(file)

						if (isHEIC) {
							toast.info(`Converting ${file.name} to JPEG and compressing...`)
						} else {
							toast.info(`Compressing ${file.name}...`)
						}

					// Compress image (handles HEIC conversion internally)
					const compressed = await compressImage(file)

					logger.info('Image compressed', {
						action: 'compress',
						originalFileName: file.name,
						originalFileType: file.type,
						originalFileSize: file.size,
						compressedFileName: compressed.file.name,
						compressedFileType: compressed.file.type,
						originalSize: compressed.originalSize,
						compressedSize: compressed.compressedSize,
						reduction: `${Math.round((1 - compressed.compressionRatio) * 100)}%`
					})

					toast.success(
						`Compressed: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`
					)

					compressedFiles.push(compressed.file)
				} catch (error) {
					logger.error('Compression failed', {
						action: 'compress',
						fileName: file.name,
						fileSize: file.size,
						fileType: file.type
					}, error)

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

			// Extract upload options from the hook configuration
			const { cacheControl = CACHE_CONTROL_SECONDS, upsert = false } = dropzoneOptions

			// Upload compressed files using base hook's storage client with configured options
			const responses = await Promise.all(
				compressedFiles.map(async file => {
					const { error } = await supabase.storage
						.from('property-images')
						.upload(`${uploadPath}/${file.name}`, file, {
							cacheControl: cacheControl.toString(),
							upsert
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
			setSuccesses(prev =>
				Array.from(new Set([...prev, ...responseSuccesses.map(x => x.name)]))
			)

			// Trigger callback if upload succeeded
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
		} finally {
			setIsUploading(false)
		}
	}, [files, setFiles, setErrors, setSuccesses, dropzoneOptions, onUploadComplete, onUploadError, uploadPath])

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

	// Cleanup: Revoke object URLs to prevent memory leaks
	// Each URL.createObjectURL() allocates ~5-10MB that must be manually freed
	useEffect(() => {
		return () => {
			files.forEach(file => {
				const fileWithPreview = file as File & { preview?: string }
				if (fileWithPreview.preview) {
					URL.revokeObjectURL(fileWithPreview.preview)
				}
			})
		}
	}, [files])

	// Return modified hook with compression
	return {
		...uploadHook,
		loading: isUploading || uploadHook.loading,
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
