import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SecurityEventType } from '@repo/shared'
import {
	DocumentQueryOptions,
	DocumentSupabaseRepository,
	DocumentWithRelations
} from './document-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { SecurityAuditService } from '../common/security/audit.service'
import { ValidationException } from '../common/exceptions/base.exception'
import {
	DocumentFileSizeException,
	DocumentFileTypeException,
	DocumentNotFoundException,
	DocumentUrlException
} from '../common/exceptions/document.exceptions'
import { CreateDocumentDto, UpdateDocumentDto } from './dto'

type DocumentInsert = Database['public']['Tables']['Document']['Insert']
type DocumentUpdate = Database['public']['Tables']['Document']['Update']

/**
 * Documents service using Supabase
 * Handles document management with property and lease ownership validation
 */
@Injectable()
export class DocumentsService {
	private readonly logger = new Logger(DocumentsService.name)

	// File size limits (in bytes)
	private readonly MAX_FILE_SIZE = 104857600 // 100MB

	// Allowed MIME types for property management documents
	private readonly ALLOWED_MIME_TYPES = [
		'application/pdf',
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'text/plain',
		'text/csv'
	]

	constructor(
		private readonly repository: DocumentSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService,
		private readonly auditService: SecurityAuditService
	) {}

	/**
	 * Create a new document with validation
	 */
	async create(
		data: CreateDocumentDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations> {
		try {
			// Validate file constraints
			this.validateFileConstraints(data)

			const documentData: DocumentInsert = {
				name: data.name,
				filename: data.filename,
				url: data.url,
				mimeType: data.mimeType,
				fileSizeBytes: data.fileSizeBytes,
				type: data.type,
				propertyId: data.propertyId,
				leaseId: data.leaseId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const document = await this.repository.createWithValidation(
				documentData,
				ownerId,
				userId,
				userToken
			)

			// Log security audit
			await this.auditService.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: 'document',
				action: 'create',
				details: JSON.stringify({
					documentId: document.id,
					type: data.type,
					fileSize: data.fileSizeBytes
				})
			})

			this.logger.log('Document created successfully', {
				documentId: document.id,
				name: data.name,
				type: data.type,
				ownerId
			})

			return document
		} catch (error) {
			this.logger.error('Failed to create document:', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'create',
				resource: 'document',
				metadata: { name: data.name, type: data.type, ownerId }
			})
		}
	}

	/**
	 * Validate file constraints
	 */
	private validateFileConstraints(
		dto: CreateDocumentDto | UpdateDocumentDto
	): void {
		// Validate file size
		if (dto.fileSizeBytes && dto.fileSizeBytes > this.MAX_FILE_SIZE) {
			throw new DocumentFileSizeException(
				dto.filename || dto.name || 'Unknown',
				dto.fileSizeBytes,
				this.MAX_FILE_SIZE
			)
		}

		// Validate MIME type
		if (dto.mimeType && !this.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
			throw new DocumentFileTypeException(
				dto.filename || dto.name || 'Unknown',
				dto.mimeType,
				this.ALLOWED_MIME_TYPES
			)
		}

		// Validate URL accessibility (basic check)
		if (dto.url && !this.isValidUrl(dto.url)) {
			throw new DocumentUrlException(dto.url, 'Invalid URL format')
		}
	}

	/**
	 * Validate URL format
	 */
	private isValidUrl(url: string): boolean {
		try {
			const parsedUrl = new URL(url)
			return ['http:', 'https:'].includes(parsedUrl.protocol)
		} catch {
			return false
		}
	}

	/**
	 * Find document by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations> {
		try {
			const document = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!document) {
				throw new DocumentNotFoundException(id)
			}

			return document
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findById',
				resource: 'document',
				metadata: { documentId: id, ownerId }
			})
		}
	}

	/**
	 * Get all documents for an owner
	 */
	async findByOwner(
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			if (
				!ownerId ||
				typeof ownerId !== 'string' ||
				ownerId.trim().length === 0
			) {
				throw new ValidationException('Owner ID is required', 'ownerId')
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByOwner',
				resource: 'document',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Alias for findByOwner to match controller expectations
	 */
	async getByOwner(
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		return this.findByOwner(ownerId, options, userId, userToken)
	}

	/**
	 * Alias for findByProperty to match controller expectations
	 */
	async getByProperty(
		propertyId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		return this.findByProperty(
			propertyId,
			ownerId,
			options,
			userId,
			userToken
		)
	}

	/**
	 * Alias for findByLease to match controller expectations
	 */
	async getByLease(
		leaseId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		return this.findByLease(leaseId, ownerId, options, userId, userToken)
	}

	/**
	 * Alias for findByType to match controller expectations
	 */
	async getByType(
		type: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		return this.findByType(type, ownerId, options, userId, userToken)
	}

	/**
	 * Alias for findById with error throwing behavior
	 */
	async getByIdOrThrow(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations> {
		return this.findById(id, ownerId, userId, userToken)
	}

	/**
	 * Update document
	 */
	async update(
		id: string,
		data: UpdateDocumentDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations> {
		try {
			// Get existing document for validation
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!existing) {
				throw new DocumentNotFoundException(id)
			}

			// Validate file constraints
			this.validateFileConstraints(data)

			const updateData: DocumentUpdate = {
				...data,
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			// Log security audit
			await this.auditService.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: 'document',
				action: 'update',
				details: JSON.stringify({
					documentId: id,
					changes: Object.keys(data)
				})
			})

			this.logger.log('Document updated successfully', {
				documentId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'update',
				resource: 'document',
				metadata: { documentId: id, ownerId }
			})
		}
	}

	/**
	 * Delete document
	 */
	async delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new DocumentNotFoundException(id)
			}

			await this.repository.delete(id, userId, userToken)

			// Log security audit
			await this.auditService.logSecurityEvent({
				eventType: SecurityEventType.ADMIN_ACTION,
				userId: ownerId,
				resource: 'document',
				action: 'delete',
				details: JSON.stringify({
					documentId: id,
					filename: existing.filename
				})
			})

			this.logger.log('Document deleted successfully', {
				documentId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'delete',
				resource: 'document',
				metadata: { documentId: id, ownerId }
			})
		}
	}

	/**
	 * Get document statistics for owner
	 */
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		leaseDocuments: number
		invoices: number
		receipts: number
		propertyPhotos: number
		totalStorageBytes: number
	}> {
		try {
			return await this.repository.getStatsByOwner(
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'getStats',
				resource: 'document',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Find documents by property
	 */
	async findByProperty(
		propertyId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			if (!propertyId || !ownerId) {
				throw new ValidationException(
					'Property ID and Owner ID are required'
				)
			}

			return await this.repository.findByProperty(
				propertyId,
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByProperty',
				resource: 'document',
				metadata: { propertyId, ownerId }
			})
		}
	}

	/**
	 * Find documents by lease
	 */
	async findByLease(
		leaseId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			if (!leaseId || !ownerId) {
				throw new ValidationException(
					'Lease ID and Owner ID are required'
				)
			}

			return await this.repository.findByLease(
				leaseId,
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByLease',
				resource: 'document',
				metadata: { leaseId, ownerId }
			})
		}
	}

	/**
	 * Find documents by type
	 */
	async findByType(
		type: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			if (!type || !ownerId) {
				throw new ValidationException('Type and Owner ID are required')
			}

			return await this.repository.findByType(
				type,
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByType',
				resource: 'document',
				metadata: { type, ownerId }
			})
		}
	}

	/**
	 * Search documents by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const searchOptions = {
				...options,
				search: searchTerm
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				searchOptions,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'search',
				resource: 'document',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Get documents by file size range
	 */
	async findByFileSizeRange(
		ownerId: string,
		minSizeBytes: number,
		maxSizeBytes: number,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const options: DocumentQueryOptions = {
				minFileSize: minSizeBytes,
				maxFileSize: maxSizeBytes
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByFileSizeRange',
				resource: 'document',
				metadata: { ownerId, minSizeBytes, maxSizeBytes }
			})
		}
	}

	/**
	 * Get documents by MIME type
	 */
	async findByMimeType(
		ownerId: string,
		mimeType: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const options: DocumentQueryOptions = {
				mimeType
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByMimeType',
				resource: 'document',
				metadata: { ownerId, mimeType }
			})
		}
	}
}
