import { Injectable, Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'

export interface FileUploadResult {
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
	 * Upload file to Supabase storage
	 */
	async uploadFile(
		bucket: string,
		path: string,
		file: Buffer,
		options?: {
			contentType?: string
			cacheControl?: string
			upsert?: boolean
		}
	): Promise<FileUploadResult> {
		const { data, error } = await this.supabase.storage
			.from(bucket)
			.upload(path, file, {
				contentType: options?.contentType,
				cacheControl: options?.cacheControl || '3600',
				upsert: options?.upsert || false
			})

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage upload failed', { error: error.message, path, bucket })
			throw this.errorHandler.createBusinessError(
				ErrorCode.STORAGE_ERROR,
				'Failed to upload file',
				{ operation: 'uploadFile', resource: 'file', metadata: { bucket, path, error: error.message } }
			)
		}

		const publicUrl = this.getPublicUrl(bucket, path)

		return {
			url: publicUrl,
			path: data.path,
			filename: path.split('/').pop() || path,
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
	async deleteFile(bucket: string, path: string): Promise<boolean> {
		const { error } = await this.supabase.storage
			.from(bucket)
			.remove([path])

		if (error) {
			// Log detailed error for debugging but don't expose to client
			this.logger.error('Storage delete failed', { error: error.message, path, bucket })
			throw this.errorHandler.createBusinessError(
				ErrorCode.STORAGE_ERROR,
				'Failed to delete file',
				{ operation: 'deleteFile', resource: 'file', metadata: { bucket, path, error: error.message } }
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
				{ operation: 'listFiles', resource: 'file', metadata: { bucket, folder, error: error.message } }
			)
		}

		return data
	}

	/**
	 * Generate unique filename with timestamp
	 */
	generateUniqueFilename(originalName: string): string {
		const timestamp = Date.now()
		const random = Math.round(Math.random() * 1e9)
		const extension = originalName.split('.').pop()
		const baseName = originalName.replace(/\.[^/.]+$/, "")
		
		return `${baseName}-${timestamp}-${random}.${extension}`
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
}