/**
 * File and Document types - Using Supabase generated types
 * Types for file uploads and document management
 */

import type { Database } from './supabase-generated.js'
import type { Document } from './supabase.js'

// Use Supabase types instead of duplicating
export type DocumentType = Database['public']['Enums']['DocumentType']
export type { Document }
export type File = Database['public']['Tables']['file']['Row']

// File upload related types
export interface FileUploadProgress {
	loaded: number
	total: number
	percentage: number
}

export type { FileUploadOptions } from './file-upload'

export interface FileUploadResult {
	file: File
	url: string
	success: boolean
	error?: string
}
