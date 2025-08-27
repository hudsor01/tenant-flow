/**
 * Storage and file upload types
 * All types related to file storage, uploads, and media management
 */

// Storage upload result type
export interface StorageUploadResult {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
	bucket: string
}

// File upload options
export interface FileUploadOptions {
	contentType?: string
	cacheControl?: string
	upsert?: boolean
}

// Supported entity types for storage organization
export type StorageEntityType = 'property' | 'tenant' | 'maintenance' | 'user'

// Supported file types for bucket organization
export type StorageFileType = 'document' | 'image' | 'avatar'