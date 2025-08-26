<<<<<<< HEAD
import {
	Inject,
	Injectable,
	Logger,
	BadRequestException,
	InternalServerErrorException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
=======
import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ErrorHandlerService } from '../services/error-handler.service'
>>>>>>> origin/main
import * as path from 'path'

// Custom type that matches what we're returning
interface StorageUploadResult {
	url: string
	path: string
	filename: string
	size: number
	mimeType: string
	bucket: string
}

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name)
	private readonly supabase: SupabaseClient<Database>

<<<<<<< HEAD
	constructor(@Inject(ConfigService) private configService: ConfigService) {
=======
	constructor(
		@Inject(ConfigService) private configService: ConfigService,
		private errorHandler: ErrorHandlerService
	) {
>>>>>>> origin/main
		const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>(
			'SUPABASE_SERVICE_ROLE_KEY'
		)

		if (!supabaseUrl || !supabaseServiceKey) {
<<<<<<< HEAD
			throw new InternalServerErrorException(
				'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required'
=======
			throw this.errorHandler.createBusinessError(
				'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required',
				{ operation: 'constructor', resource: 'storage' }
>>>>>>> origin/main
			)
		}

		this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
	}

	/**
	 * Validate and sanitize file path to prevent path traversal attacks
	 */
	private validateFilePath(filePath: string): string {
		// Remove any path traversal attempts
		const sanitized = filePath.replace(/\.\./g, '').replace(/\/\//g, '/')

		// Normalize the path and ensure it doesn't escape the intended directory
		const normalized = path.normalize(sanitized)

		// Reject paths that try to go outside the storage root
		if (
			normalized.startsWith('../') ||
			normalized.includes('/../') ||
			normalized === '..'
		) {
<<<<<<< HEAD
			throw new BadRequestException('Invalid file path detected')
=======
			throw this.errorHandler.createBusinessError(
				'Invalid file path detected',
				{ operation: 'validateFilePath', resource: 'file' }
			)
>>>>>>> origin/main
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
<<<<<<< HEAD
			throw new BadRequestException('Invalid file name or extension')
=======
			throw this.errorHandler.createBusinessError(
				'Invalid file name or extension',
				{ operation: 'validateFileName', resource: 'file' }
			)
>>>>>>> origin/main
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
		options?: {
			contentType?: string
			cacheControl?: string
			upsert?: boolean
		}
	): Promise<StorageUploadResult> {
		// SECURITY: Validate and sanitize the file path
		const safePath = this.validateFilePath(filePath)
		const filename = path.basename(safePath)
		this.validateFileName(filename)
<<<<<<< HEAD

=======
>>>>>>> origin/main
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
<<<<<<< HEAD
			throw new BadRequestException(
				`Failed to upload file: ${error.message}`
=======
			throw this.errorHandler.createBusinessError(
				'Failed to upload file',
				{
					operation: 'uploadFile',
					resource: 'file',
					metadata: { bucket, path: safePath, error: error.message }
				}
>>>>>>> origin/main
			)
		}

		const publicUrl = this.getPublicUrl(bucket, safePath)

		return {
			url: publicUrl,
			path: safePath,
<<<<<<< HEAD
			filename: safePath.split('/').pop() ?? safePath,
=======
			filename: safePath.split('/').pop() || safePath,
>>>>>>> origin/main
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
<<<<<<< HEAD
			throw new BadRequestException(
				`Failed to delete file: ${error.message}`
=======
			throw this.errorHandler.createBusinessError(
				'Failed to delete file',
				{
					operation: 'deleteFile',
					resource: 'file',
					metadata: { bucket, path: safePath, error: error.message }
				}
>>>>>>> origin/main
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
<<<<<<< HEAD
			throw new BadRequestException(
				`Failed to list files: ${error.message}`
=======
			throw this.errorHandler.createBusinessError(
				'Failed to list files',
				{
					operation: 'listFiles',
					resource: 'file',
					metadata: {
						bucket,
						folder: folder || null,
						error: error.message
					}
				}
>>>>>>> origin/main
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
		entityType: 'property' | 'tenant' | 'maintenance' | 'user',
		entityId: string,
		filename: string
	): string {
		const uniqueFilename = this.generateUniqueFilename(filename)
		return `${entityType}/${entityId}/${uniqueFilename}`
	}

	/**
	 * Get appropriate bucket for file type
	 */
	getBucket(fileType: 'document' | 'image' | 'avatar'): string {
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
