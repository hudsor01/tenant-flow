/**
 * File upload related types shared between frontend and backend
 * Enhanced with comprehensive security validation and audit capabilities
 */

/**
 * Result of a successful file upload with security context
 */
export interface FileUploadResult {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
	bucket: string
	hash?: string
	uploadedAt: Date
	uploadedBy?: string
	securityScanStatus?: 'pending' | 'clean' | 'quarantined' | 'malicious'
}

/**
 * Enhanced options for secure file upload operations
 */
export interface FileUploadOptions {
	maxSize?: number
	allowedMimeTypes?: string[]
	allowedExtensions?: string[]
	generateUniqueName?: boolean
	preserveOriginalName?: boolean
	path?: string
	scanForMalware?: boolean
	validateContent?: boolean
	quarantineOnSuspicion?: boolean
	userId?: string
	context?: FileUploadContext
	// Supabase Storage specific options
	contentType?: string
	cacheControl?: string
	upsert?: boolean
}

/**
 * File upload context for security categorization
 */
export type FileUploadContext =
	| 'documents'
	| 'images'
	| 'avatar'
	| 'maintenance'
	| 'contracts'
	| 'reports'

/**
 * Enhanced file validation configuration
 */
export interface FileValidationConfig {
	maxFileSize: number
	allowedMimeTypes: string[]
	allowedExtensions: string[]
	allowedMagicNumbers: Record<string, number[][]>
	scanForMalware: boolean
	validateContent: boolean
	quarantineOnSuspicion: boolean
}

/**
 * Enhanced file validation result with security context
 */
export interface FileValidationResult {
	isValid: boolean
	errors?: string[]
	warnings?: string[]
	fileInfo?: {
		name: string
		size: number
		mimeType: string
		extension: string
		magicNumber?: string
		hash?: string
	}
	securityFlags?: {
		containsScript: boolean
		containsMacros: boolean
		potentialMalware: boolean
		suspiciousName: boolean
		oversized: boolean
	}
}
