/**
 * Properties Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, native validation, no custom abstractions
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager'
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
	Optional,
	UnauthorizedException
} from '@nestjs/common'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/backend-domain'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import { propertyStatsSchema } from '@repo/shared/validation/database-rpc.schemas'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { Cache } from 'cache-manager'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { SagaBuilder, noCompensation } from '../../shared/patterns/saga.pattern'
import type { Request } from 'express'
import { parse } from 'csv-parse'
import { Readable } from 'stream'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import {
	querySingle,
	queryList,
	queryMutation
} from '../../shared/database/supabase-query-helpers'

type PropertyType = Database['public']['Enums']['PropertyType']

// Helper to extract JWT token from request
function getTokenFromRequest(req: Request): string | null {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return null
	}
	return authHeader.substring(7)
}

/**
 * Safe column list for property queries
 * PERFORMANCE: Explicit column list prevents over-fetching
 */
const SAFE_PROPERTY_COLUMNS = `
	id,
	ownerId,
	name,
	address,
	city,
	state,
	zipCode,
	propertyType,
	description,
	imageUrl,
	status,
	date_sold,
	sale_price,
	sale_notes,
	createdAt,
	updatedAt,
	version
`.trim()

// Validation constants (DRY principle)
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const
const VALID_PROPERTY_TYPES: PropertyType[] = [
	'SINGLE_FAMILY',
	'MULTI_UNIT',
	'APARTMENT',
	'COMMERCIAL',
	'CONDO',
	'TOWNHOUSE',
	'OTHER'
]

@Injectable()
export class PropertiesService {
	private readonly logger: Logger

	// CSV Import Configuration
	private readonly CSV_MAX_RECORD_SIZE_BYTES = 100_000 // 100KB max per record

	constructor(
		private readonly supabase: SupabaseService,
		private readonly storage: StorageService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
		@Optional() @Inject(Logger) logger?: Logger
	) {
		this.logger = logger ?? new Logger(PropertiesService.name)
	}

	/**
	 * Get all properties with search and pagination
	 */

	/**
	 * Invalidate property stats cache for a user
	 * Called after create/update/delete operations
	 */
	private async invalidatePropertyStatsCache(userId: string): Promise<void> {
		const cacheKey = `property-stats:${userId}`
		try {
			await this.cacheManager.del(cacheKey)
			this.logger.debug('Invalidated property stats cache', { userId })
		} catch (error) {
			this.logger.error('Failed to invalidate property stats cache', {
				error: error instanceof Error ? error.message : 'Unknown error',
				userId
			})
			// Don't throw - cache invalidation errors shouldn't fail the operation
		}
	}

	async findAll(
		userToken: string,
		query: { search?: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		// ✅ SECURITY FIX: Use user-scoped client (respects RLS with SUPABASE_PUBLISHABLE_KEY)
		const userClient = this.supabase.getUserClient(userToken)

		let queryBuilder = userClient
			.from('property')
			.select(SAFE_PROPERTY_COLUMNS)
			// ✅ No manual ownerId filter needed - RLS automatically applies: WHERE ownerId = auth.uid()
			.order('createdAt', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)

		// ✅ SECURITY: Already using safe multi-column search
		if (query.search) {
			const sanitized = sanitizeSearchInput(query.search)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['name', 'address', 'city'])
				)
			}
		}

		const { data, error } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch properties', { error })
			return []
		}

		return (data || []) as Property[]
	}

	/**
	 * Get single property by ID
	 */
	async findOne(req: Request, propertyId: string): Promise<Property | null> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			return null
		}
		const client = this.supabase.getUserClient(token)

		try {
			return await querySingle<Property>(
				client.from('property').select(SAFE_PROPERTY_COLUMNS).eq('id', propertyId).single(),
				{
					resource: 'property',
					id: propertyId,
					operation: 'fetch',
					logger: this.logger
				}
			)
		} catch (error) {
			// Return null for not found (soft failure for RLS/ownership checks)
			if (error instanceof NotFoundException) {
				return null
			}
			throw error
		}
	}

	/**
	 * Create property with validation
	 * ✅ October 2025: Validation now handled by ZodValidationPipe in controller
	 */
	async create(
		req: Request,
		request: CreatePropertyRequest
	): Promise<Property> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		// ✅ NOVEMBER 2025 FIX: req.user.id already contains users.id (from JWT)
		// RLS policy validates: ownerId IN (SELECT id FROM users WHERE supabaseId = auth.uid())
		// No need to query users table - just use the ID from the authenticated request
		const ownerId = (req as AuthenticatedRequest).user.id

		// Zod validation already handles trim().min(1) - no need for redundant checks

		const client = this.supabase.getUserClient(token)

		// Build insert object conditionally per exactOptionalPropertyTypes
		const insertData: Database['public']['Tables']['property']['Insert'] = {
			ownerId, // Use internal users.id for RLS compatibility
			name: request.name,
			address: request.address,
			city: request.city,
			state: request.state,
			zipCode: request.zipCode,
			propertyType: request.propertyType as PropertyType
		}

		if (request.description?.trim()) {
			insertData.description = request.description.trim()
		}

		if (request.imageUrl?.trim()) {
			insertData.imageUrl = request.imageUrl.trim()
		}

		this.logger.debug('Attempting to create property', { insertData })

		const property = await queryMutation<Property>(
			client.from('property').insert(insertData).select().single(),
			{
				resource: 'property',
				operation: 'create',
				logger: this.logger
			}
		)

		// 🚀 PERFORMANCE: Invalidate property stats cache after mutation
		await this.invalidatePropertyStatsCache(ownerId)

		this.logger.log('Property created successfully', {
			propertyId: property.id
		})
		return property
	}

	/**
	 * Bulk import properties from CSV file
	 * Ephemeral processing: parse → validate ALL rows → atomic insert → discard file
	 * Returns summary of success/errors for user feedback
	 */
	async bulkImport(
		req: Request,
		fileBuffer: Buffer
	): Promise<{
		success: boolean
		imported: number
		failed: number
		errors: Array<{ row: number; error: string }>
	}> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const userId = (req as AuthenticatedRequest).user.id

		try {
			// Parse CSV file using csv-parse (RFC 4180 compliant streaming parser)
			const records = await new Promise<Record<string, string>[]>(
				(resolve, reject) => {
					const rows: Record<string, string>[] = []
					const stream = Readable.from(fileBuffer.toString('utf-8'))

					stream
						.pipe(
							parse({
								columns: true, // Use first row as headers
								skip_empty_lines: true,
								trim: true,
								relax_quotes: true, // Allow quotes in unquoted fields
								relax_column_count: true, // Allow variable column counts
								max_record_size: this.CSV_MAX_RECORD_SIZE_BYTES
							})
						)
						.on('data', (row: unknown) => {
							// Validate row structure with type guard
							if (!this.isValidCsvRow(row)) {
								reject(
									new BadRequestException(
										'Invalid CSV row format: expected string values only'
									)
								)
								return
							}
							rows.push(row)
						})
						.on('error', (error: Error) => {
							reject(
								new BadRequestException(`CSV parsing failed: ${error.message}`)
							)
						})
						.on('end', () => {
							resolve(rows)
						})
				}
			)

			if (records.length === 0) {
				throw new BadRequestException('CSV file contains no data rows')
			}

			if (records.length > 100) {
				throw new BadRequestException(
					'Maximum 100 properties per import. Please split into smaller files.'
				)
			}

			// 🔒 Use userId from req.user.id (Supabase auth UUID) for RLS-compliant inserts
			const errors: Array<{ row: number; error: string }> = []
			const validRows: Array<
				Database['public']['Tables']['property']['Insert']
			> = []

			// PHASE 1: Validate ALL rows before inserting anything
			for (let i = 0; i < records.length; i++) {
				const row = records[i]
				if (!row) continue // Skip undefined rows

				const rowNumber = i + 2 // CSV row number (header is row 1)

				try {
					// Required field validation
					const name = this.getStringValue(row, 'name')
					const address = this.getStringValue(row, 'address')
					const city = this.getStringValue(row, 'city')
					const state = this.getStringValue(row, 'state')
					const zipCode = this.getStringValue(row, 'zipCode')

					if (!name?.trim()) {
						throw new Error('Property name is required')
					}
					if (!address?.trim()) {
						throw new Error('Property address is required')
					}
					if (!city?.trim() || !state?.trim() || !zipCode?.trim()) {
						throw new Error('City, state, and zip code are required')
					}

					// Optional field validation
					const propertyType = this.getStringValue(row, 'propertyType')
					if (
						propertyType &&
						!VALID_PROPERTY_TYPES.includes(propertyType as PropertyType)
					) {
						throw new Error(
							`Invalid property type: ${propertyType}. Must be one of: ${VALID_PROPERTY_TYPES.join(', ')}`
						)
					}

					const description = this.getStringValue(row, 'description')

					// Build insert object
					const insertData: Database['public']['Tables']['property']['Insert'] =
						{
							ownerId: userId,
							name: name.trim(),
							address: address.trim(),
							city: city.trim(),
							state: state.trim(),
							zipCode: zipCode.trim(),
							propertyType: (propertyType as PropertyType) || 'OTHER'
						}

					if (description?.trim()) {
						insertData.description = description.trim()
					}

					validRows.push(insertData)
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Validation failed'
					errors.push({
						row: rowNumber,
						error: errorMessage
					})
				}
			}

			// PHASE 2: If ANY validation errors, fail fast with ALL errors
			if (errors.length > 0) {
				this.logger.warn('Bulk import validation failed', {
					userId,
					totalRows: records.length,
					failedRows: errors.length
				})

				return {
					success: false,
					imported: 0,
					failed: errors.length,
					errors
				}
			}

			// PHASE 3: Atomic batch insert (all or nothing)
			const { data, error } = await client
				.from('property')
				.insert(validRows)
				.select()

			if (error) {
				this.logger.error('Bulk insert failed', { error, userId })
				throw new BadRequestException(
					`Database insert failed: ${error.message}`
				)
			}

			this.logger.log('Bulk import successful', {
				userId,
				imported: data?.length || 0
			})

			return {
				success: true,
				imported: data?.length || 0,
				failed: 0,
				errors: []
			}
		} catch (error) {
			this.logger.error('Bulk import error', { error, userId })

			if (error instanceof BadRequestException) {
				throw error
			}

			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error'
			throw new BadRequestException(
				`Failed to process CSV file: ${errorMessage}`
			)
		}
	}

	/**
	 * Type guard: Validate CSV row has expected string fields
	 * Prevents injection attacks and ensures data integrity
	 */
	private isValidCsvRow(row: unknown): row is Record<string, string> {
		if (!row || typeof row !== 'object') return false

		// CSV parser returns objects with string values
		// Validate all values are strings (not objects, arrays, etc.)
		return Object.values(row).every(
			value =>
				typeof value === 'string' || value === null || value === undefined
		)
	}

	/**
	 * Safe string extraction from CSV row with type guard
	 */
	private getStringValue(
		row: Record<string, string>,
		key: string
	): string | undefined {
		const value = row[key]
		if (value === null || value === undefined) return undefined
		return String(value)
	}

	/**
	 * Update property with validation
	 */
	async update(
		req: Request,
		propertyId: string,
		request: UpdatePropertyRequest,
		expectedVersion?: number //Optimistic locking
	): Promise<Property | null> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify ownership through RLS
		const existing = await this.findOne(req, propertyId)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		// Validate fields if provided
		if (request.name && !request.name.trim()) {
			throw new BadRequestException('Property name cannot be empty')
		}
		if (
			request.propertyType &&
			!VALID_PROPERTY_TYPES.includes(request.propertyType as PropertyType)
		) {
			throw new BadRequestException('Invalid property type')
		}

		// Build update object conditionally per exactOptionalPropertyTypes
		const updateData: Database['public']['Tables']['property']['Update'] = {
			updatedAt: new Date().toISOString(),
			// 🔐 OPTIMISTIC LOCKING: Increment version on every update
			version: (existing.version || 0) + 1
		}

		if (request.name !== undefined) updateData.name = request.name.trim()
		if (request.address !== undefined)
			updateData.address = request.address.trim()
		if (request.city !== undefined) updateData.city = request.city.trim()
		if (request.state !== undefined) updateData.state = request.state.trim()
		if (request.zipCode !== undefined)
			updateData.zipCode = request.zipCode.trim()
		if (request.description !== undefined) {
			updateData.description = request.description?.trim() || null
		}
		if (request.propertyType !== undefined) {
			updateData.propertyType = request.propertyType as PropertyType
		}

		//Add version check for optimistic locking
		let query = client.from('property').update(updateData).eq('id', propertyId)

		// Add version check if expectedVersion provided
		if (expectedVersion !== undefined) {
			query = query.eq('version', expectedVersion)
		}

		const { data, error } = await query.select().single()

		if (error || !data) {
			//Detect optimistic locking conflict
			if (error?.code === 'PGRST116' || !data) {
				// PGRST116 = 0 rows affected (version mismatch)
				this.logger.warn('Optimistic locking conflict detected', {
					propertyId,
					expectedVersion
				})
				throw new ConflictException(
					'Property was modified by another user. Please refresh and try again.'
				)
			}

			this.logger.error('Failed to update property', {
				error,
				propertyId
			})
			throw new BadRequestException('Failed to update property')
		}

		// 🚀 PERFORMANCE: Invalidate property stats cache after update
		const userId = (req as AuthenticatedRequest).user.id
		await this.invalidatePropertyStatsCache(userId)

		return data as Property
	}

	/**
	 * Delete property (soft delete)
	 */
	async remove(
		req: Request,
		propertyId: string
	): Promise<{ success: boolean; message: string }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const userId = (req as AuthenticatedRequest).user.id
		// 🔒 Use userId from req.user.id (Supabase auth UUID) for RLS-compliant inserts

		// Verify ownership through RLS
		const existing = await this.findOne(req, propertyId)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		//Use Saga pattern for transactional delete with compensation
		let imageFilePath: string | null = null
		let trashFilePath: string | null = null

		const result = await new SagaBuilder(this.logger)
			.addStep({
				name: 'Move property image to trash bucket',
				execute: async () => {
					if (!existing.imageUrl) {
						return { moved: false, originalPath: null, trashPath: null }
					}

					try {
						// Extract file path from imageUrl
						// Format: https://{project}.supabase.co/storage/v1/object/public/property-images/{path}
						const url = new URL(existing.imageUrl)
						const pathParts = url.pathname.split('/property-images/')
						if (pathParts.length > 1 && pathParts[1]) {
							imageFilePath = pathParts[1]

							// Create trash path with timestamp to avoid conflicts
							const timestamp = Date.now()
							trashFilePath = `property-images/${userId}/${timestamp}-${pathParts[1]}`

							// Move image to trash bucket (copy + delete original)
							await this.storage.moveFile(
								'property-images',
								imageFilePath,
								'trash',
								trashFilePath
							)

							this.logger.log('Moved property image to trash bucket', {
								propertyId,
								originalPath: imageFilePath,
								trashPath: trashFilePath
							})

							return {
								moved: true,
								originalPath: imageFilePath,
								trashPath: trashFilePath
							}
						}
					} catch (error) {
						this.logger.error('Failed to move property image to trash', {
							error: error instanceof Error ? error.message : 'Unknown error',
							propertyId,
							imageUrl: existing.imageUrl,
							originalPath: imageFilePath
						})
						// Don't fail the entire operation if image move fails, just log the error
					}
					return { moved: false, originalPath: null, trashPath: null }
				},
				compensate: async result => {
					// Compensation: Restore image from trash if it was moved
					if (result.moved && result.trashPath) {
						try {
							// Move image back from trash to original location
							await this.storage.moveFile(
								'trash',
								result.trashPath,
								'property-images',
								result.originalPath
							)

							this.logger.log(
								'Restored property image from trash during compensation',
								{
									propertyId,
									originalPath: result.originalPath,
									trashPath: result.trashPath
								}
							)
						} catch (error) {
							this.logger.error(
								'Failed to restore property image from trash during compensation',
								{
									error:
										error instanceof Error ? error.message : 'Unknown error',
									propertyId,
									originalPath: result.originalPath,
									trashPath: result.trashPath
								}
							)
							// Log error but don't throw - we don't want to mask the original error
						}
					}
					return noCompensation()
				}
			})
			.addStep({
				name: 'Mark property as INACTIVE in database',
				execute: async () => {
					const { data, error } = await client
						.from('property')
						.update({
							status:
								'INACTIVE' as Database['public']['Enums']['PropertyStatus'],
							updatedAt: new Date().toISOString(),
							// 🔐 OPTIMISTIC LOCKING: Increment version on soft delete
							version: (existing.version || 0) + 1
						})
						.eq('id', propertyId)
						.select()
						.single()

					if (error) {
						this.logger.error('Failed to mark property as inactive', {
							error,
							userId,
							propertyId
						})
						throw new BadRequestException('Failed to delete property')
					}

					this.logger.log('Marked property as INACTIVE', { propertyId })
					return { previousStatus: existing.status, data }
				},
				compensate: async result => {
					// Compensation: Restore original status
					const { error } = await client
						.from('property')
						.update({
							status: result.previousStatus,
							updatedAt: new Date().toISOString()
						})
						.eq('id', propertyId)

					if (error) {
						this.logger.error(
							'Failed to restore property status during compensation',
							{
								error,
								propertyId,
								previousStatus: result.previousStatus
							}
						)
						throw error
					}

					this.logger.log('Restored property status during compensation', {
						propertyId,
						status: result.previousStatus
					})
				}
			})
			.addStep({
				name: 'Permanently delete image from trash bucket',
				execute: async () => {
					// This step only runs if the database operation succeeds
					if (trashFilePath) {
						await this.storage.deleteFile('trash', trashFilePath)
						this.logger.log(
							'Permanently deleted property image from trash bucket',
							{
								propertyId,
								trashPath: trashFilePath
							}
						)
					}
					return { permanentDeleted: !!trashFilePath }
				},
				compensate: async result => {
					// This compensation runs if the permanent delete fails
					// In this case, the image remains in trash which is acceptable
					if (result.permanentDeleted && trashFilePath) {
						this.logger.warn(
							'Failed to permanently delete image from trash - file remains in trash',
							{
								propertyId,
								trashPath: trashFilePath
							}
						)
					}
					return noCompensation()
				}
			})
			.execute()

		// Handle saga result
		if (!result.success) {
			this.logger.error('Property deletion saga failed', {
				error: result.error?.message,
				propertyId,
				completedSteps: result.completedSteps,
				compensatedSteps: result.compensatedSteps
			})
			throw new BadRequestException(
				result.error?.message || 'Failed to delete property'
			)
		}

		this.logger.log('Property deletion saga completed successfully', {
			propertyId,
			completedSteps: result.completedSteps
		})

		// 🚀 PERFORMANCE: Invalidate property stats cache after deletion
		await this.invalidatePropertyStatsCache(userId)

		return { success: true, message: 'Property deleted successfully' }
	}

	/**
	 * Get property statistics with caching
	 * SECURITY FIX #6: User-specific cache key to prevent cache poisoning
	 */
	async getStats(req: Request): Promise<PropertyStats> {
		const userId = (req as AuthenticatedRequest).user.id

		// SECURITY FIX #6: Include userId in cache key to prevent cross-user data leakage
		const cacheKey = `property-stats:${userId}`

		// Try to get from cache first
		const cached = await this.cacheManager.get<PropertyStats>(cacheKey)
		if (cached) {
			this.logger.debug('Returning cached property stats', { userId })
			return cached
		}

		// ✅ RLS COMPLIANT: Use user-scoped client for RPC calls
		const token = getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('No authentication token found')
		}
		const client = this.supabase.getUserClient(token)
		const { data, error } = await client.rpc('get_property_stats', {
			p_user_id: userId
		} satisfies Database['public']['Functions']['get_property_stats']['Args'])

		if (error || !data) {
			this.logger.error('Failed to get property stats', { error, userId })
			return {
				total: 0,
				occupied: 0,
				vacant: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0,
				averageRent: 0
			}
		}

		// Runtime validation with Zod - fail fast on schema mismatch
		const validationResult = propertyStatsSchema.safeParse(data)
		if (!validationResult.success) {
			this.logger.error('Property stats validation failed', {
				userId,
				errors: validationResult.error.issues
			})
			throw new BadRequestException(
				'Invalid property stats response - schema validation failed'
			)
		}

		const stats: PropertyStats = validationResult.data

		// Cache for 5 minutes with user-specific key
		// Property stats change infrequently (only on property/unit mutations)
		// 5min cache reduces database load while keeping stats reasonably fresh
		await this.cacheManager.set(cacheKey, stats, 5 * 60 * 1000)

		return stats
	}

	/**
	 * Get all properties with their units
	 */
	async findAllWithUnits(
		req: Request,
		query: { search: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			return []
		}

		const client = this.supabase.getUserClient(token)

		// Clamp pagination values
		const limit = Math.min(Math.max(query.limit || 10, 1), 100)
		const offset = Math.max(query.offset || 0, 0)

		let queryBuilder = client
			.from('property')
			// 🚀 PERFORMANCE FIX: Eager load nested relations to prevent N+1 queries
			// Previously: .select('*, units:unit(*)')
			// Now includes lease data on units to avoid 200+ additional queries
			.select('*, units:unit(*, lease(*))')
			.order('createdAt', { ascending: false })
			.range(offset, offset + limit - 1)

		// SECURITY FIX #2: Use safe multi-column search to prevent SQL injection
		if (query.search) {
			const sanitized = sanitizeSearchInput(query.search)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['name', 'address'])
				)
			}
		}

		const { data, error } = await queryBuilder

		if (error) {
			this.logger.error('Failed to fetch properties with units', {
				error
			})
			return []
		}

		return (data || []) as Property[]
	}

	/**
	 * Get property performance analytics
	 */
	async getPropertyPerformanceAnalytics(
		req: Request,
		query: { propertyId?: string; timeframe: string; limit?: number }
	) {
		const userId = (req as AuthenticatedRequest).user.id

		// Validate using constant
		if (
			!VALID_TIMEFRAMES.includes(
				query.timeframe as (typeof VALID_TIMEFRAMES)[number]
			)
		) {
			throw new BadRequestException(
				`Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`
			)
		}

		// SECURITY FIX #3: Verify property ownership before calling RPC
		if (query.propertyId) {
			const property = await this.findOne(req, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// ✅ RLS COMPLIANT: Use user-scoped client for RPC calls
		const token = getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('No authentication token found')
		}
		const client = this.supabase.getUserClient(token)

		const rpcParams: Record<string, unknown> = {
			p_user_id: userId
		}
		if (query.timeframe) rpcParams.p_timeframe = query.timeframe
		if (query.propertyId) rpcParams.p_property_id = query.propertyId

		const { data, error } = await client.rpc(
			'get_property_maintenance_analytics',
			rpcParams as Database['public']['Functions']['get_property_maintenance_analytics']['Args']
		)

		if (error) {
			this.logger.error('Failed to get maintenance analytics', {
				error,
				userId
			})
			return []
		}

		return data || []
	}

	/**
	 * Get property occupancy analytics
	 */
	async getPropertyOccupancyAnalytics(
		req: Request,
		query: { propertyId?: string; period?: string }
	): Promise<unknown[]> {
		const userId = (req as AuthenticatedRequest).user.id

		// SECURITY FIX #3: Verify property ownership before calling RPC
		if (query.propertyId) {
			const property = await this.findOne(req, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// ✅ RLS COMPLIANT: Use user-scoped client for RPC calls
		const token = getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('No authentication token found')
		}
		const client = this.supabase.getUserClient(token)
		const rpcParams: Record<string, unknown> = {
			p_user_id: userId
		}
		if (query.period) rpcParams.p_period = query.period
		if (query.propertyId) rpcParams.p_property_id = query.propertyId

		const { data, error } = await client.rpc(
			'get_property_occupancy_analytics',
			rpcParams as Database['public']['Functions']['get_property_occupancy_analytics']['Args']
		)

		if (error) {
			this.logger.error('Failed to get occupancy analytics', { error, userId })
			return []
		}

		return data || []
	}

	/**
	 * Get property financial analytics
	 */
	async getPropertyFinancialAnalytics(
		req: Request,
		query: { propertyId?: string; timeframe?: string }
	): Promise<unknown[]> {
		const userId = (req as AuthenticatedRequest).user.id

		// SECURITY FIX #3: Verify property ownership before calling RPC
		if (query.propertyId) {
			const property = await this.findOne(req, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// ✅ RLS COMPLIANT: Use user-scoped client for RPC calls
		const token = getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('No authentication token found')
		}
		const client = this.supabase.getUserClient(token)
		const rpcParams: Record<string, unknown> = {
			p_user_id: userId
		}
		if (query.timeframe) rpcParams.p_timeframe = query.timeframe
		if (query.propertyId) rpcParams.p_property_id = query.propertyId

		const { data, error } = await client.rpc(
			'get_property_financial_analytics',
			rpcParams as Database['public']['Functions']['get_property_financial_analytics']['Args']
		)

		if (error) {
			this.logger.error('Failed to get financial analytics', { error, userId })
			return []
		}

		return data || []
	}

	/**
	 * Get property maintenance analytics
	 */
	async getPropertyMaintenanceAnalytics(
		req: Request,
		query: { propertyId?: string; timeframe?: string }
	): Promise<unknown[]> {
		const userId = (req as AuthenticatedRequest).user.id

		// SECURITY FIX #3: Verify property ownership before calling RPC
		if (query.propertyId) {
			const property = await this.findOne(req, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		// ✅ RLS COMPLIANT: Use user-scoped client for RPC calls
		const token = getTokenFromRequest(req)
		if (!token) {
			throw new UnauthorizedException('No authentication token found')
		}
		const client = this.supabase.getUserClient(token)

		const rpcParams: Record<string, unknown> = {
			p_user_id: userId
		}
		if (query.timeframe) rpcParams.p_timeframe = query.timeframe
		if (query.propertyId) rpcParams.p_property_id = query.propertyId

		const { data, error } = await client.rpc(
			'get_property_maintenance_analytics',
			rpcParams as Database['public']['Functions']['get_property_maintenance_analytics']['Args']
		)

		if (error) {
			this.logger.error('Failed to get maintenance analytics', {
				error,
				userId
			})
			return []
		}

		return data || []
	}

	/**
	 * Get property units
	 */
	async getPropertyUnits(req: Request, propertyId: string): Promise<unknown[]> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify ownership through RLS
		const property = await this.findOne(req, propertyId)
		if (!property)
			throw new BadRequestException('Property not found or access denied')

		return queryList(
			client.from('unit').select('*').eq('propertyId', propertyId).order('unitNumber', { ascending: true }),
			{
				resource: 'units',
				id: propertyId,
				operation: 'list',
				logger: this.logger
			}
		)
	}

	/**
	 * Mark property as sold with compliance fields (7-year retention)
	 * Sets status to SOLD and records sale date, price, and notes
	 */
	/**
	 * Upload property image
	 */
	async uploadPropertyImage(
		req: Request,
		propertyId: string,
		file: Express.Multer.File,
		isPrimary: boolean,
		caption?: string
	) {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)
		const userId = (req as AuthenticatedRequest).user.id

		// Verify property ownership
		const { data: property } = await client
			.from('property')
			.select('id')
			.eq('id', propertyId)
			.single()

		if (!property) {
			throw new NotFoundException('Property not found')
		}

		// Generate unique file path
		const timestamp = Date.now()
		const filename = `${propertyId}/${timestamp}-${file.originalname}`

		// Upload to storage
		const uploadResult = await this.storage.uploadFile(
			'property-images',
			filename,
			file.buffer,
			{ contentType: file.mimetype }
		)

		// Get next display order
		const { count } = await client
			.from('property_images')
			.select('*', { count: 'exact', head: true })
			.eq('propertyId', propertyId)

		// Insert image record with error handling
		const { data, error } = await client
			.from('property_images')
			.insert({
				propertyId,
				url: uploadResult.url,
				displayOrder: (count || 0) + 1,
				isPrimary,
				caption: caption || null,
				uploadedById: userId
			})
			.select()
			.single()

		if (error) {
			// Cleanup: Delete uploaded file if DB insert fails
			try {
				await this.storage.deleteFile('property-images', filename)
				this.logger.warn('Cleaned up orphaned file after DB insert failure', {
					filename,
					error: error.message
				})
			} catch (cleanupError) {
				this.logger.error('Failed to cleanup orphaned file', {
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

		return data
	}

	/**
	 * Get all images for a property
	 */
	async getPropertyImages(req: Request, propertyId: string) {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify property ownership
		const { data: property } = await client
			.from('property')
			.select('id')
			.eq('id', propertyId)
			.single()

		if (!property) {
			throw new NotFoundException('Property not found')
		}

		const { data, error } = await client
			.from('property_images')
			.select('*')
			.eq('propertyId', propertyId)
			.order('displayOrder', { ascending: true })

		if (error) {
			throw new BadRequestException(`Failed to fetch images: ${error.message}`)
		}

		return data || []
	}

	/**
	 * Delete property image
	 */
	async deletePropertyImage(req: Request, imageId: string) {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Get image and verify ownership through RLS
		const { data: image } = await client
			.from('property_images')
			.select('*, property:propertyId(ownerId)')
			.eq('id', imageId)
			.single()

		if (!image) {
			throw new NotFoundException('Image not found')
		}

		// Extract path from URL for storage deletion
		const urlPath = new URL(image.url).pathname
		const pathParts = urlPath.split('/property-images/')
		if (pathParts.length < 2 || !pathParts[1]) {
			throw new BadRequestException('Invalid image URL format')
		}
		const bucketPath = pathParts[1]

		// Delete database record FIRST
		const { error } = await client
			.from('property_images')
			.delete()
			.eq('id', imageId)

		if (error) {
			throw new BadRequestException(`Failed to delete image: ${error.message}`)
		}

		// Delete from storage SECOND (non-blocking, log failures)
		try {
			await this.storage.deleteFile('property-images', bucketPath)
		} catch (storageError) {
			// Log warning but don't throw - DB cleanup is intact
			this.logger.warn(
				`Storage deletion failed for image ${imageId} at ${bucketPath}: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`
			)
		}
	}

	async markAsSold(
		req: Request,
		propertyId: string,
		dateSold: Date,
		salePrice: number,
		saleNotes?: string
	): Promise<{ success: boolean; message: string }> {
		const token = getTokenFromRequest(req)
		if (!token) {
			this.logger.error('No authentication token found in request')
			throw new BadRequestException('Authentication required')
		}

		const client = this.supabase.getUserClient(token)

		// Verify ownership before allowing sale marking
		const property = await this.findOne(req, propertyId)
		if (!property) {
			throw new BadRequestException('Property not found or access denied')
		}

		// Prevent marking already sold properties (check date_sold field for accuracy)
		if (property.date_sold) {
			throw new BadRequestException(
				`Property was already sold on ${new Date(property.date_sold).toLocaleDateString()}`
			)
		}

		const { error } = await client
			.from('property')
			.update({
				status: 'SOLD',
				date_sold: dateSold.toISOString(),
				sale_price: salePrice,
				sale_notes: saleNotes || null,
				updatedAt: new Date().toISOString()
			})
			.eq('id', propertyId)

		if (error) {
			this.logger.error('Failed to mark property as sold', {
				error,
				propertyId
			})
			throw new BadRequestException(
				'Failed to mark property as sold: ' + error.message
			)
		}

		this.logger.log('Property marked as sold', {
			propertyId,
			salePrice,
			dateSold: dateSold.toISOString()
		})

		return {
			success: true,
			message: `Property marked as sold for $${salePrice.toLocaleString()}. Records will be retained for 7 years as required.`
		}
	}
}
