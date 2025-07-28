/**
 * Format file size with configurable base (1000 or 1024)
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @param binary - Use binary (1024) or decimal (1000) base (default: true for binary)
 */
export const formatFileSize = (
	bytes: number,
	decimals = 2,
	binary = true
) => {
	if (bytes === 0) return '0 B'
	
	const base = binary ? 1024 : 1000
	const units = binary 
		? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
		: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	
	const dm = decimals < 0 ? 0 : decimals
	const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(base))
	
	return `${parseFloat((bytes / Math.pow(base, i)).toFixed(dm))} ${units[i]}`
}

// Alias for compatibility
export const formatBytes = formatFileSize

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
 * Convert file to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result as string
			// Remove data URL prefix (e.g., "data:image/jpeg;base64,")
			const base64 = result.split(',')[1]
			resolve(base64 || '')
		}
		reader.onerror = reject
		reader.readAsDataURL(file)
	})
}

/**
 * Upload a property image using Hono
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

	// Validate file
	const validation = validateFile(file, { maxSize, allowedMimeTypes })
	if (!validation.valid) {
		throw new Error(validation.error)
	}

	// Convert file to base64
	const base64Data = await fileToBase64(file)

	// Import Hono client dynamically to avoid circular imports
	const { getHonoClient } = await import('../clients/hono-client')

	// Upload via Hono
	const client = await getHonoClient()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uploadEndpoint = (client.api?.v1?.properties as any)?.[':id']?.upload?.$post
	
	if (!uploadEndpoint) {
		throw new Error('Property upload endpoint not available')
	}

	const response = await uploadEndpoint({
		param: { id: propertyId },
		json: {
			filename: file.name,
			mimeType: file.type,
			size: file.size,
			data: base64Data,
		},
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(errorText || `HTTP ${response.status}`)
	}

	return response.json()
}

/**
 * Upload a tenant document using Hono
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

	// Validate file
	const validation = validateFile(file, { maxSize, allowedMimeTypes })
	if (!validation.valid) {
		throw new Error(validation.error)
	}

	// Convert file to base64
	const base64Data = await fileToBase64(file)

	// Import Hono client dynamically to avoid circular imports
	const { getHonoClient } = await import('../clients/hono-client')

	// Upload via Hono
	const client = await getHonoClient()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uploadEndpoint = (client.api?.v1?.tenants as any)?.[':id']?.documents?.$post
	
	if (!uploadEndpoint) {
		throw new Error('Tenant document upload endpoint not available')
	}

	const response = await uploadEndpoint({
		param: { id: tenantId },
		json: {
			documentType,
			filename: file.name,
			mimeType: file.type,
			size: file.size,
			data: base64Data,
		},
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(errorText || `HTTP ${response.status}`)
	}

	return response.json()
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
