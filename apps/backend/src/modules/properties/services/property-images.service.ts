import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	Optional
} from '@nestjs/common'
import type { Request } from 'express'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import { StorageService } from '../../../database/storage.service'
import { SupabaseService } from '../../../database/supabase.service'

// Helper to extract JWT token from request
function getTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.substring(7)
}

@Injectable()
export class PropertyImagesService {
	private readonly logger: Logger

	constructor(
		private readonly supabase: SupabaseService,
		private readonly storage: StorageService,
		@Optional() logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertyImagesService.name)
	}

	/**
	 * Upload property image
	 * Stores image in property-images bucket and records in property_images table
	 * Cleans up orphaned files if DB insert fails
	 */
	async uploadPropertyImage(
		req: AuthenticatedRequest,
		property_id: string,
		file: Express.Multer.File
	) {
		const startTime = Date.now()
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('[IMAGE:UPLOAD] No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const user_id = req.user.id

		this.logger.log('[IMAGE:UPLOAD:START] Image upload initiated', {
			user_id,
			property_id,
			fileName: file.originalname,
			fileSize: file.size,
			mimeType: file.mimetype
		})

		// Verify property ownership
		this.logger.debug('[IMAGE:UPLOAD:VERIFY] Verifying property ownership', {
			user_id,
			property_id
		})

		const { data: property } = await client
			.from('properties')
			.select('id')
			.eq('id', property_id)
			.single()

		if (!property) {
			this.logger.warn('[IMAGE:UPLOAD:SECURITY] Property not found', {
				user_id,
				property_id
			})
			throw new NotFoundException('Property not found')
		}

		this.logger.debug('[IMAGE:UPLOAD:VERIFY] Property ownership verified', {
			user_id,
			property_id
		})

		// Generate unique file path
		const timestamp = Date.now()
		const filename = `${property_id}/${timestamp}-${file.originalname}`

		// Upload to storage
		this.logger.log('[IMAGE:UPLOAD:STORAGE] Uploading file to storage bucket', {
			user_id,
			property_id,
			filename,
			fileSize: file.size
		})

		const storageStartTime = Date.now()
		const uploadResult = await this.storage.uploadFile(
			'property-images',
			filename,
			file.buffer,
			{ contentType: file.mimetype }
		)

		const storageTime = Date.now() - storageStartTime
		this.logger.log('[IMAGE:UPLOAD:STORAGE:COMPLETE] File uploaded to storage', {
			user_id,
			property_id,
			filename,
			url: uploadResult.url,
			duration_ms: storageTime
		})

		// Get next display order
		this.logger.debug('[IMAGE:UPLOAD:ORDER] Fetching display order', {
			user_id,
			property_id
		})

		const { count } = await client
			.from('property_images')
			.select('*', { count: 'exact', head: true })
			.eq('property_id', property_id)

		const displayOrder = (count || 0) + 1
		this.logger.debug('[IMAGE:UPLOAD:ORDER] Display order determined', {
			user_id,
			property_id,
			displayOrder
		})

		// Insert image record with error handling
		this.logger.log('[IMAGE:UPLOAD:DB] Inserting image record into database', {
			user_id,
			property_id,
			displayOrder,
			imageUrl: uploadResult.url
		})

		const dbStartTime = Date.now()
		const { data, error } = await client
			.from('property_images')
			.insert({
				property_id,
				image_url: uploadResult.url,
				display_order: displayOrder
			})
			.select()
			.single()

		const dbTime = Date.now() - dbStartTime

		if (error) {
			this.logger.error('[IMAGE:UPLOAD:DB:ERROR] Failed to insert image record', {
				user_id,
				property_id,
				error: error.message,
				errorCode: error.code,
				duration_ms: dbTime
			})

			// Cleanup: Delete uploaded file if DB insert fails
			try {
				this.logger.log('[IMAGE:UPLOAD:CLEANUP] Cleaning up orphaned file', {
					user_id,
					property_id,
					filename
				})

				await this.storage.deleteFile('property-images', filename)

				this.logger.log('[IMAGE:UPLOAD:CLEANUP:SUCCESS] Orphaned file cleaned up', {
					user_id,
					property_id,
					filename
				})
			} catch (cleanupError) {
				this.logger.error('[IMAGE:UPLOAD:CLEANUP:ERROR] Failed to cleanup orphaned file', {
					user_id,
					property_id,
					filename,
					dbError: error.message,
					cleanupError:
						cleanupError instanceof Error
							? cleanupError.message
							: String(cleanupError)
				})
			}
			throw new BadRequestException(`Failed to save image: ${error.message}`)
		}

		const totalTime = Date.now() - startTime
		this.logger.log('[IMAGE:UPLOAD:SUCCESS] Image upload completed successfully', {
			user_id,
			property_id,
			imageId: data?.id,
			fileName: file.originalname,
			fileSize: file.size,
			displayOrder,
			duration_ms: totalTime,
			phases: {
				storage: storageTime,
				database: dbTime
			},
			timestamp: new Date().toISOString()
		})

		return data
	}

	/**
	 * Get all images for a property
	 * Returns images ordered by display order
	 */
	async getPropertyImages(req: Request, property_id: string) {
		const startTime = Date.now()
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('[IMAGE:GET] No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		this.logger.log('[IMAGE:GET:START] Fetching images for property', {
			property_id
		})

		// Verify property ownership
		this.logger.debug('[IMAGE:GET:VERIFY] Verifying property ownership', {
			property_id
		})

		const { data: property } = await client
			.from('properties')
			.select('id')
			.eq('id', property_id)
			.single()

		if (!property) {
			this.logger.warn('[IMAGE:GET:SECURITY] Property not found', {
				property_id
			})
			throw new NotFoundException('Property not found')
		}

		this.logger.debug('[IMAGE:GET:VERIFY] Property ownership verified', {
			property_id
		})

		const { data, error } = await client
			.from('property_images')
			.select('*')
			.eq('property_id', property_id)
			.order('display_order', { ascending: true })

		if (error) {
			this.logger.error('[IMAGE:GET:ERROR] Failed to fetch images', {
				property_id,
				error: error.message
			})
			throw new BadRequestException(`Failed to fetch images: ${error.message}`)
		}

		const totalTime = Date.now() - startTime
		this.logger.log('[IMAGE:GET:SUCCESS] Images fetched successfully', {
			property_id,
			imageCount: data?.length || 0,
			duration_ms: totalTime,
			timestamp: new Date().toISOString()
		})

		return data || []
	}

	/**
	 * Delete property image
	 * Deletes database record first (critical), then storage file (non-blocking)
	 */
	async deletePropertyImage(req: Request, imageId: string) {
		const startTime = Date.now()
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('[IMAGE:DELETE] No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		this.logger.log('[IMAGE:DELETE:START] Image deletion initiated', {
			imageId
		})

		// Get image and verify ownership through RLS
		this.logger.debug('[IMAGE:DELETE:FETCH] Fetching image metadata', {
			imageId
		})

		const { data: image } = await client
			.from('property_images')
			.select('*, property:property_id(owner_id)')
			.eq('id', imageId)
			.single()

		if (!image) {
			this.logger.warn('[IMAGE:DELETE:SECURITY] Image not found', {
				imageId
			})
			throw new NotFoundException('Image not found')
		}

		this.logger.debug('[IMAGE:DELETE:VERIFY] Image found, extracting bucket path', {
			imageId,
			imageUrl: image.image_url
		})

		// Extract path from URL for storage deletion
		const urlPath = new URL(image.image_url).pathname
		const pathParts = urlPath.split('/property-images/')
		if (pathParts.length < 2 || !pathParts[1]) {
			this.logger.error('[IMAGE:DELETE:PARSE] Invalid image URL format', {
				imageId,
				imageUrl: image.image_url,
				urlPath
			})
			throw new BadRequestException('Invalid image URL format')
		}
		const bucketPath = pathParts[1]

		this.logger.debug('[IMAGE:DELETE:PARSE] Bucket path extracted', {
			imageId,
			bucketPath
		})

		// Delete database record FIRST
		this.logger.log('[IMAGE:DELETE:DB] Deleting image record from database', {
			imageId,
			bucketPath
		})

		const dbStartTime = Date.now()
		const { error } = await client
			.from('property_images')
			.delete()
			.eq('id', imageId)

		const dbTime = Date.now() - dbStartTime

		if (error) {
			this.logger.error('[IMAGE:DELETE:DB:ERROR] Failed to delete image record', {
				imageId,
				error: error.message,
				errorCode: error.code,
				duration_ms: dbTime
			})
			throw new BadRequestException(`Failed to delete image: ${error.message}`)
		}

		this.logger.log('[IMAGE:DELETE:DB:SUCCESS] Image record deleted from database', {
			imageId,
			duration_ms: dbTime
		})

		// Delete from storage SECOND (non-blocking, log failures)
		this.logger.log('[IMAGE:DELETE:STORAGE] Deleting file from storage bucket', {
			imageId,
			bucketPath
		})

		const storageStartTime = Date.now()
		try {
			await this.storage.deleteFile('property-images', bucketPath)

			const storageTime = Date.now() - storageStartTime
			this.logger.log('[IMAGE:DELETE:STORAGE:SUCCESS] File deleted from storage', {
				imageId,
				bucketPath,
				duration_ms: storageTime
			})
		} catch (storageError) {
			// Log warning but don't throw - DB cleanup is intact
			const storageTime = Date.now() - storageStartTime
			this.logger.warn(
				'[IMAGE:DELETE:STORAGE:ERROR] Storage deletion failed - DB cleanup is intact',
				{
					imageId,
					bucketPath,
					error:
						storageError instanceof Error
							? storageError.message
							: String(storageError),
					duration_ms: storageTime
				}
			)
		}

		const totalTime = Date.now() - startTime
		this.logger.log('[IMAGE:DELETE:SUCCESS] Image deletion completed successfully', {
			imageId,
			bucketPath,
			duration_ms: totalTime,
			timestamp: new Date().toISOString()
		})
	}


}
