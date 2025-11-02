/**
 * Image Compression Utility
 *
 * Compresses images before upload to minimize storage and bandwidth costs.
 * Uses browser-image-compression for client-side processing.
 */

import { createLogger } from '@repo/shared/lib/frontend-logger'
import imageCompression from 'browser-image-compression'
import heic2any from 'heic2any'

const logger = createLogger({ component: 'ImageCompression' })

export class HEICConversionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'HEICConversionError'
	}
}

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHEICFile(file: File): boolean {
	return (
		file.type === 'image/heic' ||
		file.type === 'image/heif' ||
		file.name.toLowerCase().endsWith('.heic') ||
		file.name.toLowerCase().endsWith('.heif')
	)
}

/**
 * Check if browser supports HEIC conversion
 * Some browsers (Chrome, Firefox) may not support HEIC decoding
 * Safari supports it natively
 */
async function canConvertHEIC(): Promise<boolean> {
	try {
		// Check if heic2any library is available
		if (typeof heic2any === 'undefined') {
			return false
		}

		// Additional check: Some browsers may have heic2any but still fail
		// We can't reliably test without actual HEIC data, so we assume
		// if the library loaded, it should work. The actual conversion
		// will catch any issues.
		return true
	} catch {
		return false
	}
}

/**
 * Get user-friendly browser name for error messages
 */
function getBrowserName(): string {
	const userAgent = navigator.userAgent
	if (userAgent.includes('Firefox')) return 'Firefox'
	if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome'
	if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
	if (userAgent.includes('Edg')) return 'Edge'
	return 'your browser'
}

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

	let fileToCompress = file

	// Convert HEIC/HEIF to JPEG first
	const isHEIC = isHEICFile(file)

	if (isHEIC) {
		// Check browser support before attempting conversion
		const supported = await canConvertHEIC()
		if (!supported) {
			const browserName = getBrowserName()
			logger.error('HEIC conversion not supported', {
				action: 'convert',
				fileName: file.name,
				browser: browserName
			})
			throw new HEICConversionError(
				`${browserName} does not fully support HEIC images. Please convert your image to JPEG or PNG first, or try using Safari.`
			)
		}

		try {
			logger.info('Converting HEIC to JPEG', {
				action: 'convert',
				fileName: file.name
			})

			// Convert HEIC to JPEG using heic2any
			const convertedBlob = await heic2any({
				blob: file,
				toType: 'image/jpeg',
				quality: 0.9 // High quality for conversion
			})

			// heic2any can return Blob or Blob[], handle both cases
			const blob = Array.isArray(convertedBlob) 
				? (convertedBlob.length > 0 ? convertedBlob[0] : undefined)
				: convertedBlob

			if (!blob) {
				throw new Error('HEIC conversion returned empty result')
			}

			// Create a new File from the converted Blob
			const originalName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
			fileToCompress = new File([blob], originalName, {
				type: 'image/jpeg',
				lastModified: Date.now()
			})

			logger.info('HEIC conversion successful', {
				action: 'convert',
				originalFormat: file.type,
				convertedFormat: fileToCompress.type,
				originalSize: file.size,
				convertedSize: fileToCompress.size
			})
		} catch (conversionError) {
			logger.error('HEIC conversion failed', { action: 'convert' }, conversionError)

			// Provide helpful error message
			const browserName = getBrowserName()
			throw new HEICConversionError(
				`Failed to convert HEIC image in ${browserName}. Please convert it to JPEG or PNG manually, or try using Safari.`
			)
		}
	}

	// Merge with defaults
	const compressionOptions = {
		...DEFAULT_OPTIONS,
		...options
	}

	try {
		// Compress the image (either original or converted)
		const compressedFile = await imageCompression(fileToCompress, compressionOptions)

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

		// Provide specific error messages for common issues
		if (error instanceof Error) {
			// Browser-image-compression specific errors
			if (error.message.includes('MIME')) {
				throw new Error(
					`Unsupported image format. Please use JPEG, PNG, or WebP images.`
				)
			}
			if (error.message.includes('memory') || error.message.includes('Out of memory')) {
				throw new Error(
					`Image is too large to process. Please use a smaller image or reduce the resolution.`
				)
			}
			throw new Error(`Failed to compress image: ${error.message}`)
		}

		throw new Error('Failed to compress image: Unknown error')
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
	// Also check file extension for browsers that don't set MIME type correctly
	const fileName = file.name.toLowerCase()
	const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']

	return validTypes.includes(file.type.toLowerCase()) || validExtensions.some(ext => fileName.endsWith(ext))
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
