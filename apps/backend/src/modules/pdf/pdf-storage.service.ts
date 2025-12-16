/**
 * PDF Storage Service
 *
 * Handles uploading and managing lease PDF documents in Supabase Storage.
 * Implements retry logic, error handling, and proper file naming.
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

export interface UploadPdfResult {
	publicUrl: string
	path: string
	bucket: string
}

@Injectable()
export class PdfStorageService {
	private readonly BUCKET_NAME = 'lease-documents'
	private readonly MAX_RETRIES = 3
	private readonly RETRY_DELAY_MS = 1000

	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Upload filled lease PDF to Supabase Storage
	 * Returns public URL for DocuSeal integration
	 */
	async uploadLeasePdf(
		leaseId: string,
		pdfBuffer: Buffer,
		options?: {
			ownerId?: string
			retries?: number
		}
	): Promise<UploadPdfResult> {
		const retries = options?.retries ?? this.MAX_RETRIES
		const fileName = this.generateFileName(leaseId)
		const filePath = `leases/${leaseId}/${fileName}`

		this.logger.log('Uploading lease PDF to storage', {
			leaseId,
			filePath,
			sizeBytes: pdfBuffer.length
		})

		try {
			// Use admin client for storage operations (bypasses RLS)
			const client = this.supabase.getAdminClient()

			// Upload with retry logic
			let lastError: Error | null = null
			for (let attempt = 1; attempt <= retries; attempt++) {
				try {
					const { data, error } = await client.storage
						.from(this.BUCKET_NAME)
						.upload(filePath, pdfBuffer, {
							contentType: 'application/pdf',
							cacheControl: '3600',
							upsert: true // Overwrite if exists
						})

					if (error) {
						throw new Error(error.message)
					}

					// Get public URL
					const { data: urlData } = client.storage
						.from(this.BUCKET_NAME)
						.getPublicUrl(filePath)

					this.logger.log('Successfully uploaded lease PDF', {
						leaseId,
						path: data.path,
						attempt
					})

					return {
						publicUrl: urlData.publicUrl,
						path: data.path,
						bucket: this.BUCKET_NAME
					}
				} catch (err) {
					lastError = err instanceof Error ? err : new Error(String(err))
					this.logger.warn('PDF upload attempt failed', {
						leaseId,
						attempt,
						error: lastError.message
					})

					// Wait before retry (exponential backoff)
					if (attempt < retries) {
						await this.sleep(this.RETRY_DELAY_MS * attempt)
					}
				}
			}

			// All retries failed
			this.logger.error('Failed to upload lease PDF after all retries', {
				leaseId,
				retries,
				error: lastError?.message
			})

			throw new InternalServerErrorException(
				`Failed to upload lease PDF: ${lastError?.message || 'Unknown error'}`
			)
		} catch (error) {
			this.logger.error('Unexpected error uploading lease PDF', {
				leaseId,
				error: error instanceof Error ? error.message : String(error)
			})
			throw error
		}
	}

	/**
	 * Delete lease PDF from storage
	 * Used when lease is deleted or needs to be regenerated
	 */
	async deleteLeasePdf(leaseId: string): Promise<void> {
		const filePath = `leases/${leaseId}`

		try {
			const client = this.supabase.getAdminClient()

			// List all files for this lease
			const { data: files, error: listError } = await client.storage
				.from(this.BUCKET_NAME)
				.list(filePath)

			if (listError) {
				this.logger.warn('Failed to list lease PDFs for deletion', {
					leaseId,
					error: listError.message
				})
				return
			}

			if (!files || files.length === 0) {
				this.logger.log('No PDFs found to delete', { leaseId })
				return
			}

			// Delete all files
			const filePaths = files.map(f => `${filePath}/${f.name}`)
			const { error: deleteError } = await client.storage
				.from(this.BUCKET_NAME)
				.remove(filePaths)

			if (deleteError) {
				this.logger.error('Failed to delete lease PDFs', {
					leaseId,
					error: deleteError.message
				})
				return
			}

			this.logger.log('Successfully deleted lease PDFs', {
				leaseId,
				count: files.length
			})
		} catch (error) {
			this.logger.error('Unexpected error deleting lease PDF', {
				leaseId,
				error: error instanceof Error ? error.message : String(error)
			})
			// Don't throw - deletion errors shouldn't block other operations
		}
	}

	/**
	 * Get public URL for existing lease PDF
	 */
	async getLeasePdfUrl(leaseId: string): Promise<string | null> {
		const fileName = this.generateFileName(leaseId)
		const filePath = `leases/${leaseId}/${fileName}`

		try {
			const client = this.supabase.getAdminClient()

			// Check if file exists
			const { data: files } = await client.storage
				.from(this.BUCKET_NAME)
				.list(`leases/${leaseId}`)

			if (!files || files.length === 0) {
				return null
			}

			// Get public URL
			const { data } = client.storage
				.from(this.BUCKET_NAME)
				.getPublicUrl(filePath)

			return data.publicUrl
		} catch (error) {
			this.logger.error('Failed to get lease PDF URL', {
				leaseId,
				error: error instanceof Error ? error.message : String(error)
			})
			return null
		}
	}

	/**
	 * Generate consistent filename for lease PDF
	 */
	private generateFileName(leaseId: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		return `lease-${leaseId}-${timestamp}.pdf`
	}

	/**
	 * Sleep utility for retry delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	/**
	 * Ensure storage bucket exists (for initialization)
	 */
	async ensureBucketExists(): Promise<void> {
		try {
			const client = this.supabase.getAdminClient()

			const { data: buckets, error: listError } = await client.storage.listBuckets()

			if (listError) {
				this.logger.error('Failed to list storage buckets', {
					error: listError.message
				})
				return
			}

			const bucketExists = buckets?.some(b => b.name === this.BUCKET_NAME)

			if (!bucketExists) {
				this.logger.warn('Lease documents bucket does not exist', {
					bucket: this.BUCKET_NAME
				})
				// Note: Bucket should be created via Supabase dashboard or migration
			} else {
				this.logger.log('Lease documents bucket verified', {
					bucket: this.BUCKET_NAME
				})
			}
		} catch (error) {
			this.logger.error('Failed to verify storage bucket', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}
}
