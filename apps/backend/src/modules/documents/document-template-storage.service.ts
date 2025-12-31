/**
 * Document Template Storage Service
 *
 * Uploads generated document templates to Supabase Storage with
 * owner_user_id scoping.
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { CompressionService } from './compression.service'

/** Cache control durations in seconds */
const CACHE_CONTROL = {
	/** 1 hour cache for PDF files */
	PDF: '3600',
	/** 1 minute cache for JSON definitions (allows quick updates) */
	JSON: '60'
} as const

export interface UploadDocumentTemplateResult {
	publicUrl: string
	path: string
	bucket: string
}

@Injectable()
export class DocumentTemplateStorageService {
	private readonly BUCKET_NAME = 'document-templates'
	private bucketInitialized = false

	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly compressionService: CompressionService
	) {}

	/**
	 * Ensure the storage bucket exists, creating it if necessary.
	 * This is called lazily on first upload to avoid startup overhead.
	 */
	private async ensureBucketExists(): Promise<void> {
		if (this.bucketInitialized) {
			return
		}

		const client = this.supabase.getAdminClient()

		try {
			const { data: buckets, error: listError } = await client.storage.listBuckets()

			if (listError) {
				this.logger.warn('Failed to list storage buckets', {
					error: listError.message
				})
				return
			}

			const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME)

			if (!bucketExists) {
				const { error: createError } = await client.storage.createBucket(
					this.BUCKET_NAME,
					{
						public: false,
						fileSizeLimit: 10 * 1024 * 1024 // 10MB limit
					}
				)

				if (createError && !createError.message.includes('already exists')) {
					this.logger.warn('Failed to create storage bucket', {
						bucket: this.BUCKET_NAME,
						error: createError.message
					})
					return
				}

				this.logger.log('Created storage bucket', { bucket: this.BUCKET_NAME })
			}

			this.bucketInitialized = true
		} catch (error) {
			this.logger.warn('Error checking/creating bucket', {
				bucket: this.BUCKET_NAME,
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}

	async uploadTemplatePdf(
		ownerId: string,
		templateType: string,
		pdfBuffer: Buffer
	): Promise<UploadDocumentTemplateResult> {
		const fileName = this.generateFileName(templateType)
		const filePath = this.buildTemplatePath(ownerId, templateType, fileName)

		this.logger.log('Uploading document template PDF', {
			ownerId,
			templateType,
			filePath,
			sizeBytes: pdfBuffer.length
		})

		await this.ensureBucketExists()

		try {
			const compressionResult = await this.compressionService.compressDocument(
				pdfBuffer,
				'application/pdf'
			)

			const uploadBuffer = compressionResult.compressed
			const client = this.supabase.getAdminClient()

			const { data, error } = await client.storage
				.from(this.BUCKET_NAME)
				.upload(filePath, uploadBuffer, {
					contentType: 'application/pdf',
					cacheControl: CACHE_CONTROL.PDF,
					upsert: true
				})

			if (error) {
				throw new Error(error.message)
			}

			const { data: urlData } = client.storage
				.from(this.BUCKET_NAME)
				.getPublicUrl(filePath)

			return {
				publicUrl: urlData.publicUrl,
				path: data.path,
				bucket: this.BUCKET_NAME
			}
		} catch (error) {
			this.logger.error('Failed to upload document template PDF', {
				ownerId,
				templateType,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new InternalServerErrorException(
				'Failed to upload document template PDF'
			)
		}
	}

	async uploadTemplateDefinition(
		ownerId: string,
		templateType: string,
		definition: Record<string, unknown>
	): Promise<UploadDocumentTemplateResult> {
		const fileName = 'definition.json'
		const filePath = this.buildTemplatePath(ownerId, templateType, fileName)
		const client = this.supabase.getAdminClient()
		const payload = Buffer.from(JSON.stringify(definition, null, 2))

		await this.ensureBucketExists()

		try {
			const { data, error } = await client.storage
				.from(this.BUCKET_NAME)
				.upload(filePath, payload, {
					contentType: 'application/json',
					cacheControl: CACHE_CONTROL.JSON,
					upsert: true
				})

			if (error) {
				throw new Error(error.message)
			}

			const { data: urlData } = client.storage
				.from(this.BUCKET_NAME)
				.getPublicUrl(filePath)

			return {
				publicUrl: urlData.publicUrl,
				path: data.path,
				bucket: this.BUCKET_NAME
			}
		} catch (error) {
			this.logger.error('Failed to upload document template definition', {
				ownerId,
				templateType,
				error: error instanceof Error ? error.message : String(error)
			})
			throw new InternalServerErrorException(
				'Failed to upload document template definition'
			)
		}
	}

	async getTemplateDefinition(
		ownerId: string,
		templateType: string
	): Promise<Record<string, unknown> | null> {
		const filePath = this.buildTemplatePath(ownerId, templateType, 'definition.json')
		const client = this.supabase.getAdminClient()

		try {
			const { data, error } = await client.storage
				.from(this.BUCKET_NAME)
				.download(filePath)

			if (error || !data) {
				return null
			}

			const text = await data.text()
			return text ? (JSON.parse(text) as Record<string, unknown>) : null
		} catch (error) {
			this.logger.warn('Failed to fetch document template definition', {
				ownerId,
				templateType,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	private generateFileName(templateType: string): string {
		const date = new Date().toISOString().replace(/[:.]/g, '-')
		const sanitizedTemplate = templateType
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
		return `${sanitizedTemplate}-${date}.pdf`
	}

	private buildTemplatePath(
		ownerId: string,
		templateType: string,
		fileName: string
	): string {
		return `owners/${ownerId}/templates/${templateType}/${fileName}`
	}
}
