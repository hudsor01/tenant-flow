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
	user_id?: string
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

/**
 * Options for Supabase upload hook
 */
export interface UseSupabaseUploadOptions {
	/**
	 * Name of bucket to upload files to in your Supabase project
	 */
	bucketName: string
	/**
	 * Folder to upload files to in the specified bucket within your Supabase project.
	 *
	 * Defaults to uploading files to the root of the bucket
	 *
	 * e.g If specified path is `test`, your file will be uploaded as `test/file_name`
	 */
	path?: string
	/**
	 * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
	 *
	 * Defaults to allowing uploading of all MIME types.
	 */
	allowedMimeTypes?: string[]
	/**
	 * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
	 */
	maxFileSize?: number
	/**
	 * Maximum number of files allowed per upload.
	 */
	maxFiles?: number
	/**
	 * The number of seconds the asset is cached in the browser and in the Supabase CDN.
	 *
	 * This is set in the Cache-Control: max-age=<seconds> header. Defaults to 3600 seconds.
	 */
	cacheControl?: number
	/**
	 * When set to true, the file is overwritten if it exists.
	 *
	 * When set to false, an error is thrown if the object already exists. Defaults to `false`
	 */
	upsert?: boolean
}
