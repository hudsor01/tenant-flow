export const formatBytes = (
	bytes: number,
	decimals = 2,
	size?: 'bytes' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'EB' | 'ZB' | 'YB'
) => {
	const k = 1000
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${size || sizes[i]}`
}

export const formatFileSize = (size: number) => {
	const thresh = 1024
	if (Math.abs(size) < thresh) {
		return `${size} B`
	}
	const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	let u = -1
	do {
		size /= thresh
		++u
	} while (Math.abs(size) >= thresh && u < units.length - 1)
	return `${size.toFixed(1)} ${units[u]}`
}

// Backend-based file upload utilities (replaces storage-utils.ts)
import { apiClient } from './api'

export interface UploadOptions {
	maxSize?: number
	allowedMimeTypes?: string[]
}

export interface UploadResult {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
}

/**
 * Upload a property image using backend API
 */
export async function uploadPropertyImage(
	file: File,
	propertyId: string,
	options: UploadOptions = {}
): Promise<UploadResult> {
	const {
		maxSize = 10 * 1024 * 1024, // 10MB
		allowedMimeTypes = ['image/*']
	} = options

	// Validate file size
	if (file.size > maxSize) {
		throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
	}

	// Validate MIME type
	if (
		allowedMimeTypes.length > 0 &&
		!allowedMimeTypes.some(
			type =>
				type === '*' ||
				type === file.type ||
				(type.endsWith('/*') && file.type.startsWith(type.slice(0, -2)))
		)
	) {
		throw new Error(`File type ${file.type} is not allowed`)
	}

	// Upload via backend API
	const response = await apiClient.properties.uploadImage(propertyId, file)

	return {
		url: response.url,
		path: response.path || response.filename,
		filename: response.filename,
		size: response.size,
		mimeType: response.mimeType
	}
}

/**
 * Upload a tenant document using backend API
 */
export async function uploadTenantDocument(
	file: File,
	tenantId: string,
	documentType: string,
	options: UploadOptions = {}
): Promise<UploadResult> {
	const {
		maxSize = 10 * 1024 * 1024, // 10MB
		allowedMimeTypes = ['image/*', 'application/pdf', 'text/*']
	} = options

	// Validate file size
	if (file.size > maxSize) {
		throw new Error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`)
	}

	// Validate MIME type
	if (
		allowedMimeTypes.length > 0 &&
		!allowedMimeTypes.some(
			type =>
				type === '*' ||
				type === file.type ||
				(type.endsWith('/*') && file.type.startsWith(type.slice(0, -2)))
		)
	) {
		throw new Error(`File type ${file.type} is not allowed`)
	}

	// Upload via backend API
	const response = await apiClient.tenants.uploadDocument(
		tenantId,
		file,
		documentType
	)

	return {
		url: response.url,
		path: response.path || response.filename,
		filename: response.filename,
		size: response.size,
		mimeType: response.mimeType
	}
}

/**
 * Get property image URL with fallback to placeholder
 */
export function getPropertyImageUrl(property: {
	imageUrl?: string | null
}): string {
	// If property has an imageUrl, use it directly
	if (property.imageUrl) {
		return property.imageUrl
	}

	// Return a placeholder image
	return 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop&auto=format'
}

/**
 * Validate file upload constraints
 */
export function validateFile(
	file: File,
	options: UploadOptions = {}
): { valid: boolean; error?: string } {
	const { maxSize = 10 * 1024 * 1024, allowedMimeTypes = [] } = options

	// Check file size
	if (file.size > maxSize) {
		return {
			valid: false,
			error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
		}
	}

	// Check MIME type
	if (
		allowedMimeTypes.length > 0 &&
		!allowedMimeTypes.some(
			type =>
				type === '*' ||
				type === file.type ||
				(type.endsWith('/*') && file.type.startsWith(type.slice(0, -2)))
		)
	) {
		return {
			valid: false,
			error: `File type ${file.type} is not allowed`
		}
	}

	return { valid: true }
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/')
}

/**
 * Check if file is a PDF
 */
export function isPDFFile(file: File): boolean {
	return file.type === 'application/pdf'
}

/**
 * Create preview URL for file (if supported)
 */
export function createFilePreview(file: File): string | null {
	if (isImageFile(file)) {
		return URL.createObjectURL(file)
	}
	return null
}

/**
 * Cleanup preview URL
 */
export function cleanupFilePreview(previewUrl: string): void {
	URL.revokeObjectURL(previewUrl)
}
