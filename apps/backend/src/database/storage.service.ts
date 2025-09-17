import {
	Injectable,
	BadRequestException
} from '@nestjs/common'
import { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { StorageUploadResult, FileUploadOptions, StorageEntityType, StorageFileType } from '@repo/shared/types/domain'
import * as path from 'path'
import { SupabaseService } from './supabase.service'

// StorageUploadResult now imported from @repo/shared to eliminate duplication

@Injectable()
export class StorageService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: Logger
	) {
		// Logger context handled automatically via app-level configuration
	}

	private get supabase(): SupabaseClient<Database> {
		return this.supabaseService.getAdminClient()
	}

	/**
	 * Validate and sanitize file path to prevent path traversal attacks
	 */
	private validateFilePath(filePath: string): string {
		// First check for path traversal attempts BEFORE sanitizing
		if (filePath.includes('..') || filePath === '..' || filePath.startsWith('../')) {
			throw new BadRequestException('Invalid file path detected')
		}

		// Remove double slashes and normalize
		const sanitized = filePath.replace(/\/\//g, '/')
		const normalized = path.normalize(sanitized)

		// Additional check after normalization
		if (
			normalized.startsWith('../') ||
			normalized.includes('/../') ||
			normalized === '..'
		) {
			throw new BadRequestException('Invalid file path detected')
		}

		// Ensure path doesn't start with /
		return normalized.startsWith('/') ? normalized.slice(1) : normalized
	}

	/**
	 * Validate file name to prevent malicious uploads
	 */
	private validateFileName(filename: string): string {
		// Reject files with dangerous characters or extensions
		// Check for control characters without using regex to avoid eslint error
		const hasControlChars = Array.from(filename).some(char => {
			const code = char.charCodeAt(0)
			return code >= 0 && code <= 31
		})

		const hasDangerousChars = /[<>:"|?*]/.test(filename)
		const dangerousExtensions =
			/\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i

		if (
			hasControlChars ||
			hasDangerousChars ||
			dangerousExtensions.test(filename)
		) {
			throw new BadRequestException('Invalid file name or extension')
		}

		return filename
	}

	/**
	 * Upload file to Supabase storage
	 */
	async uploadFile(
		bucket: string,
		filePath: string,
		file: Buffer,
		options?: FileUploadOptions
	): Promise<StorageUploadResult> {
		// SECURITY: Validate and sanitize the file path
		const safePath = this.validateFilePath(filePath)
		const filename = path.basename(safePath)
		this.validateFileName(filename)

		const { error } = await this.supabase.storage
			.from(bucket)
			.upload(safePath, file, {
				contentType: options?.contentType,
				cacheControl: options?.cacheControl ?? '3600',
				upsert: options?.upsert ?? false
			})

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage upload failed', {
				error: error.message,
				path: safePath,
				bucket
			})
			throw new BadRequestException(
				`Failed to upload file: ${error.message}`
			)
		}

		const publicUrl = this.getPublicUrl(bucket, safePath)

		return {
			url: publicUrl,
			path: safePath,
			filename: safePath.split('/').pop() ?? safePath,
			size: file.length,
			mimeType: options?.contentType ?? 'application/octet-stream',
			bucket
		}
	}

	/**
	 * Get public URL for a file
	 */
	getPublicUrl(bucket: string, path: string): string {
		const { data } = this.supabase.storage.from(bucket).getPublicUrl(path)

		return data.publicUrl
	}

	/**
	 * Delete file from storage
	 */
	async deleteFile(bucket: string, filePath: string): Promise<boolean> {
		// SECURITY: Validate file path before deletion
		const safePath = this.validateFilePath(filePath)
		const { error } = await this.supabase.storage
			.from(bucket)
			.remove([safePath])

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage delete failed', {
				error: error.message,
				path: safePath,
				bucket
			})
			throw new BadRequestException(
				`Failed to delete file: ${error.message}`
			)
		}

		return true
	}

	/**
	 * List files in a bucket/folder
	 */
	async listFiles(
		bucket: string,
		folder?: string
	): Promise<
		{
			name: string
			id?: string
			updated_at?: string
			created_at?: string
			last_accessed_at?: string
			metadata?: Record<string, unknown>
		}[]
	> {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.list(folder)

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage list failed', {
				error: error.message,
				bucket,
				folder
			})
			throw new BadRequestException(
				`Failed to list files: ${error.message}`
			)
		}

		return data ?? []
	}

	/**
	 * Generate unique filename with timestamp
	 */
	generateUniqueFilename(originalName: string): string {
		const timestamp = Date.now()
		const uniqueId = crypto.randomUUID().substring(0, 8)
		const extension = originalName.split('.').pop()
		const baseName = originalName.replace(/\.[^/.]+$/, '')

		return `${baseName}-${timestamp}-${uniqueId}.${extension}`
	}

	/**
	 * Get storage path for different entity types
	 */
	getStoragePath(
		entityType: StorageEntityType,
		entityId: string,
		filename: string
	): string {
		const uniqueFilename = this.generateUniqueFilename(filename)
		return `${entityType}/${entityId}/${uniqueFilename}`
	}

	/**
	 * Get appropriate bucket for file type
	 */
	getBucket(fileType: StorageFileType): string {
		switch (fileType) {
			case 'avatar':
				return 'avatars'
			case 'image':
				return 'property-images'
			case 'document':
			default:
				return 'documents'
		}
	}
}
