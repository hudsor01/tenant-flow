import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
	private readonly supabase: SupabaseClient

	constructor(private configService: ConfigService) {
		const supabaseUrl = this.configService.get<string>('VITE_SUPABASE_URL') || this.configService.get<string>('SUPABASE_URL')
		const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

		if (!supabaseUrl || !supabaseServiceKey) {
			throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
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
			throw new Error(`Failed to upload file: ${error.message}`)
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
			throw new Error(`Failed to delete file: ${error.message}`)
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
			throw new Error(`Failed to list files: ${error.message}`)
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