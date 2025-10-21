/**
 * Image Compression Utility
 *
 * Compresses images before upload to minimize storage and bandwidth costs.
 * Uses browser-image-compression for client-side processing.
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'
import imageCompression from 'browser-image-compression'

const logger = createLogger({ component: 'ImageCompression' })

export interface CompressionOptions {
	/**
	 * Maximum file size in MB
	 * @default 0.5 (500KB)
	 */
	maxSizeMB?: number

	/**
	 * Maximum width or height in pixels
	 * @default 1920 (Full HD)
	 */
	maxWidthOrHeight?: number

	/**
	 * Use web worker for non-blocking compression
	 * @default true
	 */
	useWebWorker?: boolean

	/**
	 * Initial quality (0-1)
	 * @default 0.8 (80%)
	 */
	initialQuality?: number

	/**
	 * File type to convert to
	 * @default 'image/jpeg'
	 */
	fileType?: string
}

export interface CompressionResult {
	/**
	 * Compressed file ready for upload
	 */
	file: File

	/**
	 * Original file size in bytes
	 */
	originalSize: number

	/**
	 * Compressed file size in bytes
	 */
	compressedSize: number

	/**
	 * Compression ratio (0-1)
	 * Lower is better (e.g., 0.1 = 90% reduction)
	 */
	compressionRatio: number

	/**
	 * Preview URL for displaying compressed image
	 */
	previewUrl: string
}

/**
 * Default compression options optimized for property images
 */
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
	maxSizeMB: 0.5, // 500KB max - aggressive but reasonable for property photos
	maxWidthOrHeight: 1920, // Full HD - plenty for property listings
	useWebWorker: true, // Non-blocking compression
	initialQuality: 0.8, // 80% quality - visually lossless for photos
	fileType: 'image/jpeg' // JPEG is best for photos
}

/**
 * Compress an image file for upload
 *
 * @param file - Original image file from file input
 * @param options - Compression options (uses sensible defaults)
 * @returns Compressed file with metadata
 *
 * @example
 * ```tsx
 * const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
 *   const file = event.target.files?.[0]
 *   if (!file) return
 *
 *   const result = await compressImage(file)
 *   // Result contains originalSize, compressedSize, and compressionRatio
 *
 *   // Upload result.file to Supabase
 * }
 * ```
 */
export async function compressImage(
	file: File,
	options: CompressionOptions = {}
): Promise<CompressionResult> {
	const startTime = performance.now()
	const originalSize = file.size

	logger.info('Starting image compression', {
		action: 'compress',
		fileName: file.name,
		fileSize: originalSize,
		fileType: file.type
	})

	// Merge with defaults
	const compressionOptions = {
		...DEFAULT_OPTIONS,
		...options
	}

	try {
		// Compress the image
		const compressedFile = await imageCompression(file, compressionOptions)

		const compressedSize = compressedFile.size
		const compressionRatio = compressedSize / originalSize
		const compressionTime = performance.now() - startTime

		// Create preview URL
		const previewUrl = URL.createObjectURL(compressedFile)

		logger.info('Image compression completed', {
			action: 'compress',
			fileName: file.name,
			originalSize,
			compressedSize,
			compressionRatio: Math.round(compressionRatio * 100) / 100,
			reduction: `${Math.round((1 - compressionRatio) * 100)}%`,
			compressionTime: `${Math.round(compressionTime)}ms`
		})

		return {
			file: compressedFile,
			originalSize,
			compressedSize,
			compressionRatio,
			previewUrl
		}
	} catch (error) {
		logger.error('Image compression failed', { action: 'compress' }, error)
		throw new Error(
			`Failed to compress image: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}

/**
 * Validate if file is an acceptable image type
 *
 * @param file - File to validate
 * @returns true if file is a valid image type
 */
export function isValidImageFile(file: File): boolean {
	const validTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/webp',
		'image/heic',
		'image/heif'
	]
	return validTypes.includes(file.type.toLowerCase())
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - File size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'

	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

/**
 * Calculate compression savings
 *
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Object with savings details
 */
export function calculateCompressionSavings(
	originalSize: number,
	compressedSize: number
): {
	savedBytes: number
	savedPercentage: number
	compressionRatio: number
} {
	const savedBytes = originalSize - compressedSize
	const savedPercentage = Math.round((savedBytes / originalSize) * 100)
	const compressionRatio =
		Math.round((compressedSize / originalSize) * 100) / 100

	return {
		savedBytes,
		savedPercentage,
		compressionRatio
	}
}
