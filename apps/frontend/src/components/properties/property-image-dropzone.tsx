'use client'

/**
 * PropertyImageDropzone Component
 *
 * Direct-to-Supabase image upload for properties.
 * Uses official Supabase Dropzone pattern (Dec 2025 best practice).
 *
 * Flow:
 * 1. User drops/selects images
 * 2. Upload directly to Supabase Storage (property-images/{propertyId}/)
 * 3. RLS policy verifies ownership
 * 4. Database trigger auto-creates property_images records
 * 5. Query invalidation refreshes the gallery
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabaseUpload } from '#hooks/use-supabase-upload'
import {
	Dropzone,
	DropzoneContent,
	DropzoneEmptyState
} from '#components/ui/dropzone'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'PropertyImageDropzone' })

// Allowed image MIME types for property images
const ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif'
]

// Default upload configuration
const DEFAULT_MAX_FILES = 10
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface PropertyImageDropzoneProps {
	/**
	 * ID of the property to upload images for.
	 * Used as the folder path in storage: property-images/{propertyId}/
	 */
	propertyId: string

	/**
	 * Maximum number of files that can be uploaded at once.
	 * @default 10
	 */
	maxFiles?: number

	/**
	 * Maximum file size in bytes.
	 * @default 10485760 (10MB)
	 */
	maxFileSize?: number

	/**
	 * Callback fired when upload completes successfully.
	 * Use this to refresh the gallery or show success feedback.
	 */
	onUploadSuccess?: () => void

	/**
	 * Optional CSS class name
	 */
	className?: string
}

export function PropertyImageDropzone({
	propertyId,
	maxFiles = DEFAULT_MAX_FILES,
	maxFileSize = DEFAULT_MAX_FILE_SIZE,
	onUploadSuccess,
	className
}: PropertyImageDropzoneProps) {
	const queryClient = useQueryClient()

	// Use the Supabase upload hook with property-specific configuration
	const uploadState = useSupabaseUpload({
		bucketName: 'property-images',
		path: propertyId, // Files stored as property-images/{propertyId}/{filename}
		allowedMimeTypes: ALLOWED_MIME_TYPES,
		maxFileSize,
		maxFiles,
		cacheControl: 31536000, // 1 year cache (images rarely change)
		upsert: true, // Allow overwriting if same filename (UUID names make this rare)
		autoUpload: true // Upload immediately after file selection
	})

	const { isSuccess, successes, errors, setFiles } = uploadState

	// Handle successful upload - invalidate queries, clear files, and call callback
	useEffect(() => {
		if (isSuccess && successes.length > 0) {
			logger.info('Property images uploaded successfully', {
				action: 'upload_success',
				metadata: {
					propertyId,
					fileCount: successes.length,
					fileNames: successes
				}
			})

			// Clear the files from dropzone after successful upload
			setFiles([])

			// Invalidate property images query to refresh the gallery
			queryClient.invalidateQueries({
				queryKey: propertyQueries.images(propertyId).queryKey
			})

			// Also invalidate property lists (primary image may have changed)
			queryClient.invalidateQueries({
				queryKey: propertyQueries.lists()
			})

			// Call the success callback if provided
			onUploadSuccess?.()
		}
	}, [isSuccess, successes, propertyId, queryClient, onUploadSuccess, setFiles])

	// Log errors for debugging
	useEffect(() => {
		if (errors.length > 0) {
			logger.error('Property image upload failed', {
				action: 'upload_error',
				metadata: {
					propertyId,
					errors: errors.map(e => ({ name: e.name, message: e.message }))
				}
			})
		}
	}, [errors, propertyId])

	return (
		<Dropzone {...uploadState} {...(className ? { className } : {})}>
			<DropzoneEmptyState />
			<DropzoneContent />
		</Dropzone>
	)
}
