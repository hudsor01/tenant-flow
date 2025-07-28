import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'
import { FileUploadResult } from '@tenantflow/shared/types/file-upload'
import * as path from 'path'

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name)
	private readonly supabase: SupabaseClient

	constructor(
		@Inject(ConfigService) private configService: ConfigService,
		private errorHandler: ErrorHandlerService
	) {
		const supabaseUrl = this.configService.get<string>('VITE_SUPABASE_URL') || this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

		if (!supabaseUrl || !supabaseServiceKey) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.BAD_REQUEST,
				'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required',
				{ operation: 'constructor', resource: 'storage' }
			)
		}

		this.supabase = createClient(supabaseUrl, supabaseServiceKey)
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
		if (normalized.startsWith('../') || normalized.includes('/../') || normalized === '..') {
			throw this.errorHandler.createBusinessError(
				ErrorCode.BAD_REQUEST,
				'Invalid file path detected',
				{ operation: 'validateFilePath', resource: 'file' }
			)
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
		const dangerousExtensions = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i
		
		if (hasControlChars || hasDangerousChars || dangerousExtensions.test(filename)) {
			throw this.errorHandler.createBusinessError(
				ErrorCode.BAD_REQUEST,
				'Invalid file name or extension',
				{ operation: 'validateFileName', resource: 'file' }
			)
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
	): Promise<FileUploadResult> {
		// SECURITY: Validate and sanitize the file path
		const safePath = this.validateFilePath(filePath)
		const filename = path.basename(safePath)
		this.validateFileName(filename)
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.upload(safePath, file, {
				contentType: options?.contentType,
				cacheControl: options?.cacheControl || '3600',
				upsert: options?.upsert || false
			})

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage upload failed', { error: error.message, path: safePath, bucket })
			throw this.errorHandler.createBusinessError(
				ErrorCode.STORAGE_ERROR,
				'Failed to upload file',
				{ operation: 'uploadFile', resource: 'file', metadata: { bucket, path: safePath, error: error.message } }
			)
		}

		const publicUrl = this.getPublicUrl(bucket, safePath)

		return {
			url: publicUrl,
			path: data.path,
			filename: safePath.split('/').pop() || safePath,
			size: file.length,
			mimeType: options?.contentType || 'application/octet-stream',
			bucket
		}
	}

	/**
	 * Get public URL for a file
	 */
	getPublicUrl(bucket: string, path: string): string {
		const { data } = this.supabase.storage
			.from(bucket)
			.getPublicUrl(path)

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
			this.logger.error('Storage delete failed', { error: error.message, path: safePath, bucket })
			throw this.errorHandler.createBusinessError(
				ErrorCode.STORAGE_ERROR,
				'Failed to delete file',
				{ operation: 'deleteFile', resource: 'file', metadata: { bucket, path: safePath, error: error.message } }
			)
		}

		return true
	}

	/**
	 * List files in a bucket/folder
	 */
	async listFiles(bucket: string, folder?: string) {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.list(folder)

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage list failed', { error: error.message, bucket, folder })
			throw this.errorHandler.createBusinessError(
				ErrorCode.STORAGE_ERROR,
				'Failed to list files',
				{ operation: 'listFiles', resource: 'file', metadata: { bucket, folder: folder || null, error: error.message } }
			)
		}

		return data
	}

	/**
	 * Generate unique filename with timestamp
	 */
	generateUniqueFilename(originalName: string): string {
		const timestamp = Date.now()
		const uniqueId = crypto.randomUUID().substring(0, 8)
		const extension = originalName.split('.').pop()
		const baseName = originalName.replace(/\.[^/.]+$/, "")
		
		return `${baseName}-${timestamp}-${uniqueId}.${extension}`
	}

	/**
	 * Get storage path for different entity types
	 */
	getStoragePath(entityType: 'property' | 'tenant' | 'maintenance' | 'user', entityId: string, filename: string): string {
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

	/**
	 * Upload tenant document
	 */
	async uploadTenantDocument(
		tenantId: string,
		fileData: Buffer,
		filename: string,
		mimeType: string,
		_documentType: string
	): Promise<FileUploadResult> {
		const bucket = this.getBucket('document')
		const filePath = this.getStoragePath('tenant', tenantId, filename)
		
		return this.uploadFile(bucket, filePath, fileData, {
			contentType: mimeType,
			cacheControl: '3600'
		})
	}
}