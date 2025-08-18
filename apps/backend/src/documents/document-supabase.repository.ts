import { Injectable } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import { BaseSupabaseRepository } from '../common/repositories/base-supabase.repository'
import { SupabaseService } from '../common/supabase/supabase.service'
import { MultiTenantSupabaseService } from '../common/supabase/multi-tenant-supabase.service'

type DocumentRow = Database['public']['Tables']['Document']['Row']
type DocumentInsert = Database['public']['Tables']['Document']['Insert']

export interface DocumentWithRelations extends DocumentRow {
	id: string // Explicit id field to ensure it's always available
	filename: string | null // Match database schema exactly
	Property?: {
		id: string
		name: string
		address: string
		ownerId: string
	}
	Lease?: {
		id: string
		startDate: string
		endDate: string
		Unit: {
			id: string
			unitNumber: string
			Property: {
				id: string
				name: string
				ownerId: string
			}
		}
	}
}

export interface DocumentQueryOptions {
	type?: string
	propertyId?: string
	leaseId?: string
	mimeType?: string
	createdFrom?: string
	createdTo?: string
	minFileSize?: number
	maxFileSize?: number
	search?: string
	limit?: number
	offset?: number
	page?: number
}

/**
 * Supabase repository for Document entity
 * Replaces the Prisma-based DocumentRepository
 * Documents are owned through property ownership or lease unit property ownership
 */
@Injectable()
export class DocumentSupabaseRepository extends BaseSupabaseRepository<DocumentRow> {
	protected readonly tableName = 'Document' as const

	constructor(
		supabaseService: SupabaseService,
		multiTenantService: MultiTenantSupabaseService
	) {
		super(supabaseService, multiTenantService)
	}

	/**
	 * Find documents by owner with full relationship data
	 * Documents are owned through property ownership or lease unit property ownership
	 */
	async findByOwnerWithDetails(
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const {
				search,
				type,
				propertyId,
				leaseId,
				mimeType,
				createdFrom,
				createdTo,
				minFileSize,
				maxFileSize,
				limit = 10,
				offset = 0,
				page
			} = options

			// Calculate actual offset
			const actualOffset = page ? (page - 1) * limit : offset

			// Build the query with nested relationships
			let query = client.from('Document').select(`
					*,
					Property (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						startDate,
						endDate,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								ownerId
							)
						)
					)
				`)

			// Filter by owner through relationships (property or lease)
			// Using OR to match either property ownership or lease unit property ownership
			query = query.or(
				`Property.ownerId.eq.${ownerId},Lease.Unit.Property.ownerId.eq.${ownerId}`
			)

			// Add filters
			if (type) {
				query = query.eq(
					'type',
					type as NonNullable<DocumentRow['type']>
				)
			}

			if (propertyId) {
				query = query.eq('propertyId', propertyId)
			}

			if (leaseId) {
				query = query.eq('leaseId', leaseId)
			}

			if (mimeType) {
				query = query.ilike('mimeType', `%${mimeType}%`)
			}

			if (createdFrom) {
				query = query.gte('createdAt', createdFrom)
			}

			if (createdTo) {
				query = query.lte('createdAt', createdTo)
			}

			if (minFileSize !== undefined) {
				query = query.gte('fileSizeBytes', minFileSize)
			}

			if (maxFileSize !== undefined) {
				query = query.lte('fileSizeBytes', maxFileSize)
			}

			// Add search filter (searches in name, filename, and mimeType)
			if (search) {
				query = query.or(
					`name.ilike.%${search}%,filename.ilike.%${search}%,mimeType.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(actualOffset, actualOffset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Error fetching documents with details:',
					error
				)
				throw error
			}

			return (data || []) as DocumentWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch documents by owner:', error)
			throw error
		}
	}

	/**
	 * Find document by ID with ownership validation
	 */
	async findByIdAndOwner(
		id: string,
		ownerId: string,
		includeDetails = true,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations | null> {
		try {
			const client = await this.getClient(userId, userToken)

			// Build query with optional details
			const selectQuery = includeDetails
				? `
					*,
					Property (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						startDate,
						endDate,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								ownerId
							)
						)
					)
				`
				: `
					*,
					Property (
						ownerId
					),
					Lease (
						Unit (
							Property (
								ownerId
							)
						)
					)
				`

			const { data, error } = await client
				.from('Document')
				.select(selectQuery)
				.eq('id', id)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					return null // Not found
				}
				throw error
			}

			// Validate ownership (property or lease unit property ownership)
			const hasPropertyOwnership = data?.Property?.ownerId === ownerId
			const hasLeaseOwnership =
				data?.Lease?.Unit?.Property?.ownerId === ownerId

			if (!hasPropertyOwnership && !hasLeaseOwnership) {
				return null // No ownership
			}

			return data as DocumentWithRelations
		} catch (error) {
			this.logger.error('Failed to find document by ID and owner:', error)
			throw error
		}
	}

	/**
	 * Find documents by property ID
	 */
	async findByProperty(
		propertyId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const { type, search, limit = 10, offset = 0 } = options

			let query = client
				.from('Document')
				.select(
					`
					*,
					Property!inner (
						id,
						name,
						address,
						ownerId
					)
				`
				)
				.eq('propertyId', propertyId)
				.eq('Property.ownerId', ownerId)

			// Add filters
			if (type) {
				query = query.eq(
					'type',
					type as NonNullable<DocumentRow['type']>
				)
			}

			if (search) {
				query = query.or(
					`name.ilike.%${search}%,filename.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error(
					'Error fetching documents by property:',
					error
				)
				throw error
			}

			return (data || []) as DocumentWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch documents by property:', error)
			throw error
		}
	}

	/**
	 * Find documents by lease ID
	 */
	async findByLease(
		leaseId: string,
		ownerId: string,
		options: DocumentQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations[]> {
		try {
			const client = await this.getClient(userId, userToken)
			const { type, search, limit = 10, offset = 0 } = options

			let query = client
				.from('Document')
				.select(
					`
					*,
					Lease!inner (
						id,
						startDate,
						endDate,
						Unit!inner (
							id,
							unitNumber,
							Property!inner (
								id,
								name,
								ownerId
							)
						)
					)
				`
				)
				.eq('leaseId', leaseId)
				.eq('Lease.Unit.Property.ownerId', ownerId)

			// Add filters
			if (type) {
				query = query.eq(
					'type',
					type as NonNullable<DocumentRow['type']>
				)
			}

			if (search) {
				query = query.or(
					`name.ilike.%${search}%,filename.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Error fetching documents by lease:', error)
				throw error
			}

			return (data || []) as DocumentWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch documents by lease:', error)
			throw error
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
			const client = await this.getClient(userId, userToken)
			const { search, limit = 10, offset = 0 } = options

			let query = client
				.from('Document')
				.select(
					`
					*,
					Property (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						startDate,
						endDate,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								ownerId
							)
						)
					)
				`
				)
				.eq('type', type as NonNullable<DocumentRow['type']>)
				.or(
					`Property.ownerId.eq.${ownerId},Lease.Unit.Property.ownerId.eq.${ownerId}`
				)

			if (search) {
				query = query.or(
					`name.ilike.%${search}%,filename.ilike.%${search}%`
				)
			}

			// Apply ordering and pagination
			query = query
				.order('createdAt', { ascending: false })
				.range(offset, offset + limit - 1)

			const { data, error } = await query

			if (error) {
				this.logger.error('Error fetching documents by type:', error)
				throw error
			}

			return (data || []) as DocumentWithRelations[]
		} catch (error) {
			this.logger.error('Failed to fetch documents by type:', error)
			throw error
		}
	}

	/**
	 * Get document statistics for an owner
	 */
	async getStatsByOwner(
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
			const client = await this.getClient(userId, userToken)

			// Get all documents for the owner
			const { data: documents, error } = await client
				.from('Document')
				.select(
					`
					type,
					fileSizeBytes,
					Property (
						ownerId
					),
					Lease (
						Unit (
							Property (
								ownerId
							)
						)
					)
				`
				)
				.or(
					`Property.ownerId.eq.${ownerId},Lease.Unit.Property.ownerId.eq.${ownerId}`
				)

			if (error) {
				this.logger.error('Error fetching document stats:', error)
				throw error
			}

			// Calculate statistics
			const stats = {
				total: documents?.length || 0,
				leaseDocuments: 0,
				invoices: 0,
				receipts: 0,
				propertyPhotos: 0,
				totalStorageBytes: 0
			}

			if (documents) {
				for (const doc of documents) {
					// Add to total storage
					stats.totalStorageBytes += doc.fileSizeBytes || 0

					// Count by type
					switch (doc.type) {
						case 'LEASE':
							stats.leaseDocuments++
							break
						case 'INVOICE':
							stats.invoices++
							break
						case 'RECEIPT':
							stats.receipts++
							break
						case 'PROPERTY_PHOTO':
							stats.propertyPhotos++
							break
					}
				}
			}

			return stats
		} catch (error) {
			this.logger.error('Failed to get document stats:', error)
			throw error
		}
	}

	/**
	 * Create document with property or lease validation
	 */
	async createWithValidation(
		documentData: DocumentInsert,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<DocumentWithRelations> {
		try {
			const client = await this.getClient(userId, userToken)

			// Validate ownership if linked to property
			if (documentData.propertyId) {
				const { data: property, error: propertyError } = await client
					.from('Property')
					.select('ownerId')
					.eq('id', documentData.propertyId)
					.single()

				if (propertyError || !property) {
					throw new Error('Property not found')
				}

				if (property.ownerId !== ownerId) {
					throw new Error('Property not owned by user')
				}
			}

			// Validate ownership if linked to lease
			if (documentData.leaseId) {
				const { data: lease, error: leaseError } = await client
					.from('Lease')
					.select(
						`
						Unit (
							Property (
								ownerId
							)
						)
					`
					)
					.eq('id', documentData.leaseId)
					.single()

				if (leaseError || !lease) {
					throw new Error('Lease not found')
				}

				if (lease.Unit?.Property?.ownerId !== ownerId) {
					throw new Error('Lease not owned by user')
				}
			}

			// Create the document
			const { data: createdDocument, error: createError } = await client
				.from('Document')
				.insert(documentData)
				.select(
					`
					*,
					Property (
						id,
						name,
						address,
						ownerId
					),
					Lease (
						id,
						startDate,
						endDate,
						Unit (
							id,
							unitNumber,
							Property (
								id,
								name,
								ownerId
							)
						)
					)
				`
				)
				.single()

			if (createError || !createdDocument) {
				this.logger.error('Error creating document:', createError)
				throw createError || new Error('Failed to create document')
			}

			return createdDocument as DocumentWithRelations
		} catch (error) {
			this.logger.error(
				'Failed to create document with validation:',
				error
			)
			throw error
		}
	}
}
