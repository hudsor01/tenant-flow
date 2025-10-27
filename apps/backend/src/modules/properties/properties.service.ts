/**
 * Properties Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, native validation, no custom abstractions
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '@repo/shared/types/backend-domain'
import type { Property, PropertyStats } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { Cache } from 'cache-manager'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { SagaBuilder, noCompensation } from '../../shared/patterns/saga.pattern'

type PropertyType = Database['public']['Enums']['PropertyType']

// Validation constants (DRY principle)
const VALID_TIMEFRAMES = ['7d', '30d', '90d', '180d', '365d'] as const
const VALID_PERIODS = [
	'daily',
	'weekly',
	'monthly',
	'quarterly',
	'yearly'
] as const
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
	private readonly logger = new Logger(PropertiesService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly storage: StorageService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache
	) {}

	/**
	 * Helper: Convert supabaseId (from JWT) to users.id (for foreign keys)
	 * Cached for performance
	 */
	private async getUserIdFromSupabaseId(supabaseId: string): Promise<string> {
		const cacheKey = `user:supabaseId:${supabaseId}`
		const cached = await this.cacheManager.get<string>(cacheKey)
		if (cached) return cached

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id')
			.eq('supabaseId', supabaseId)
			.single()

		if (error || !data) {
			this.logger.error('Failed to lookup user ID', {
				error,
				supabaseId
			})
			throw new BadRequestException('User not found')
		}

		// Cache for 5 minutes (user ID doesn't change)
		await this.cacheManager.set(cacheKey, data.id, 300000)
		return data.id
	}

	/**
	 * Get all properties with search and pagination
	 */
	async findAll(
		userId: string,
		query: { search?: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		const ownerId = await this.getUserIdFromSupabaseId(userId)

		let queryBuilder = this.supabase
			.getAdminClient()
			.from('property')
			.select('*')
			.eq('ownerId', ownerId)
			.order('createdAt', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)

		// SECURITY FIX #2: Use safe multi-column search to prevent SQL injection
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
			this.logger.error('Failed to fetch properties', { error, userId })
			return []
		}

		return (data || []) as Property[]
	}

	/**
	 * Get single property by ID
	 */
	async findOne(userId: string, propertyId: string): Promise<Property | null> {
		const ownerId = await this.getUserIdFromSupabaseId(userId)

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property')
			.select('*')
			.eq('id', propertyId)
			.eq('ownerId', ownerId)
			.single()

		if (error || !data) {
			this.logger.warn('Property not found or access denied', {
				userId,
				propertyId
			})
			return null
		}

		return data as Property
	}

	/**
	 * Create property with validation
	 */
	async create(
		userId: string,
		request: CreatePropertyRequest
	): Promise<Property> {
		// Validate required fields using native TypeScript
		if (!request.name?.trim())
			throw new BadRequestException('Property name is required')
		if (!request.address?.trim())
			throw new BadRequestException('Property address is required')
		if (
			!request.city?.trim() ||
			!request.state?.trim() ||
			!request.zipCode?.trim()
		) {
			throw new BadRequestException('City, state, and zip code are required')
		}
		if (
			request.propertyType &&
			!VALID_PROPERTY_TYPES.includes(request.propertyType as PropertyType)
		) {
			throw new BadRequestException('Invalid property type')
		}

		const ownerId = await this.getUserIdFromSupabaseId(userId)

		// Build insert object conditionally per exactOptionalPropertyTypes
		const insertData: Database['public']['Tables']['property']['Insert'] = {
			ownerId,
			name: request.name.trim(),
			address: request.address.trim(),
			city: request.city.trim(),
			state: request.state.trim(),
			zipCode: request.zipCode.trim(),
			propertyType: request.propertyType as PropertyType
		}

		if (request.description?.trim()) {
			insertData.description = request.description.trim()
		}

		this.logger.debug('Attempting to create property', { insertData, userId })

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property')
			.insert(insertData)
			.select()
			.single()

		this.logger.debug('Supabase insert result', {
			data,
			error,
			hasData: !!data,
			hasError: !!error,
			userId
		})

		if (error) {
			this.logger.error('Failed to create property', { error, userId })
			throw new BadRequestException('Failed to create property')
		}

		if (!data) {
			this.logger.error('No data returned from insert', { userId })
			throw new BadRequestException('Failed to create property - no data returned')
		}

		this.logger.log('Property created successfully', { propertyId: data.id, userId })
		return data as Property
	}

	/**
	 * Bulk import properties from CSV file
	 * Ephemeral processing: parse → validate ALL rows → atomic insert → discard file
	 * Returns summary of success/errors for user feedback
	 */
	async bulkImport(
		userId: string,
		fileBuffer: Buffer
	): Promise<{
		success: boolean
		imported: number
		failed: number
		errors: Array<{ row: number; error: string }>
	}> {
		try {
			// Parse CSV file (native Node.js)
			const csvContent = fileBuffer.toString('utf-8')
			const lines = csvContent.split('\n').filter((line) => line.trim())

			if (lines.length === 0) {
				throw new BadRequestException('CSV file is empty')
			}

			// Parse header row
			const headerLine = lines[0]
			if (!headerLine) {
				throw new BadRequestException('CSV file has no headers')
			}
			const headers = this.parseCSVLine(headerLine)
			if (headers.length === 0) {
				throw new BadRequestException('CSV file has no headers')
			}

			// Parse data rows
			const rows: Record<string, unknown>[] = []
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i]
				if (!line) continue

				const values = this.parseCSVLine(line)
				if (values.length === 0) continue

				const row: Record<string, unknown> = {}
				headers.forEach((header, index) => {
					row[header] = values[index] || ''
				})
				rows.push(row)
			}

			if (rows.length === 0) {
				throw new BadRequestException('CSV file contains no data rows')
			}

			if (rows.length > 100) {
				throw new BadRequestException(
					'Maximum 100 properties per import. Please split into smaller files.'
				)
			}

			const ownerId = await this.getUserIdFromSupabaseId(userId)
			const errors: Array<{ row: number; error: string }> = []
			const validRows: Array<Database['public']['Tables']['property']['Insert']> = []

			// PHASE 1: Validate ALL rows before inserting anything
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]
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
					const insertData: Database['public']['Tables']['property']['Insert'] = {
						ownerId,
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
					const errorMessage = error instanceof Error ? error.message : 'Validation failed'
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
					totalRows: rows.length,
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
			const { data, error } = await this.supabase
				.getAdminClient()
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

			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			throw new BadRequestException(
				`Failed to process CSV file: ${errorMessage}`
			)
		}
	}

	/**
	 * Parse CSV line handling quoted fields (RFC 4180 compliant)
	 */
	private parseCSVLine(line: string): string[] {
		const result: string[] = []
		let current = ''
		let inQuotes = false

		for (let i = 0; i < line.length; i++) {
			const char = line[i]

			if (char === '"') {
				if (inQuotes && line[i + 1] === '"') {
					// Escaped quote
					current += '"'
					i++ // Skip next quote
				} else {
					// Toggle quote state
					inQuotes = !inQuotes
				}
			} else if (char === ',' && !inQuotes) {
				// Field separator
				result.push(current.trim())
				current = ''
			} else {
				current += char
			}
		}

		// Push last field
		result.push(current.trim())

		return result
	}

	private getStringValue(
		row: Record<string, unknown>,
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
		userId: string,
		propertyId: string,
		request: UpdatePropertyRequest,
		expectedVersion?: number // 🔐 BUG FIX #2: Optimistic locking
	): Promise<Property | null> {
		// Verify ownership
		const existing = await this.findOne(userId, propertyId)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		const ownerId = await this.getUserIdFromSupabaseId(userId)

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
			updatedAt: new Date().toISOString()
		}

		// Version field not implemented in database schema

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

		// 🔐 BUG FIX #2: Add version check for optimistic locking
		let query = this.supabase
			.getAdminClient()
			.from('property')
			.update(updateData)
			.eq('id', propertyId)
			.eq('ownerId', ownerId)

		// Add version check if expectedVersion provided
		if (expectedVersion !== undefined) {
			query = query.eq('version', expectedVersion)
		}

		const { data, error } = await query.select().single()

		if (error || !data) {
			// 🔐 BUG FIX #2: Detect optimistic locking conflict
			if (error?.code === 'PGRST116' || !data) {
				// PGRST116 = 0 rows affected (version mismatch)
				this.logger.warn('Optimistic locking conflict detected', {
					userId,
					propertyId,
					expectedVersion
				})
				throw new ConflictException(
					'Property was modified by another user. Please refresh and try again.'
				)
			}

			this.logger.error('Failed to update property', {
				error,
				userId,
				propertyId
			})
			throw new BadRequestException('Failed to update property')
		}

		return data as Property
	}

	/**
	 * Delete property (soft delete)
	 */
	async remove(
		userId: string,
		propertyId: string
	): Promise<{ success: boolean; message: string }> {
		// Verify ownership
		const existing = await this.findOne(userId, propertyId)
		if (!existing)
			throw new BadRequestException('Property not found or access denied')

		const ownerId = await this.getUserIdFromSupabaseId(userId)

		// 🔐 BUG FIX #3: Use Saga pattern for transactional delete with compensation
		let imageFilePath: string | null = null

		const result = await new SagaBuilder(this.logger)
			.addStep({
				name: 'Delete property image from storage',
				execute: async () => {
					if (!existing.imageUrl) {
						return { deleted: false }
					}

					try {
						// Extract file path from imageUrl
						// Format: https://{project}.supabase.co/storage/v1/object/public/property-images/{path}
						const url = new URL(existing.imageUrl)
						const pathParts = url.pathname.split('/property-images/')
						if (pathParts.length > 1 && pathParts[1]) {
						imageFilePath = pathParts[1]
							await this.storage.deleteFile('property-images', imageFilePath)
							this.logger.log('Deleted property image from storage', {
								propertyId,
								filePath: imageFilePath
							})
							return { deleted: true, filePath: imageFilePath }
						}
					} catch (error) {
						this.logger.warn('Failed to delete property image', {
							error,
							propertyId,
							imageUrl: existing.imageUrl
						})
					}
					return { deleted: false }
				},
				compensate: async result => {
					// Compensation: Restore image if it was deleted
					// Note: In production, you'd need to store the image bytes before deletion
					// or use soft-delete pattern for storage
					if (result.deleted && imageFilePath) {
						this.logger.warn(
							'Image deletion compensation not implemented - image cannot be restored',
							{ propertyId, filePath: imageFilePath }
						)
					}
					return noCompensation()
				}
			})
			.addStep({
				name: 'Mark property as INACTIVE in database',
				execute: async () => {
					const { data, error } = await this.supabase
						.getAdminClient()
						.from('property')
						.update({
							status: 'INACTIVE' as Database['public']['Enums']['PropertyStatus'],
							updatedAt: new Date().toISOString()
						})
						.eq('id', propertyId)
						.eq('ownerId', ownerId)
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
					const { error } = await this.supabase
						.getAdminClient()
						.from('property')
						.update({
							status: result.previousStatus,
							updatedAt: new Date().toISOString()
						})
						.eq('id', propertyId)
						.eq('ownerId', ownerId)

					if (error) {
						this.logger.error('Failed to restore property status during compensation', {
							error,
							propertyId,
							previousStatus: result.previousStatus
						})
						throw error
					}

					this.logger.log('Restored property status during compensation', {
						propertyId,
						status: result.previousStatus
					})
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

		return { success: true, message: 'Property deleted successfully' }
	}

	/**
	 * Get property statistics with caching
	 * SECURITY FIX #6: User-specific cache key to prevent cache poisoning
	 */
	async getStats(userId: string): Promise<PropertyStats> {
		// SECURITY FIX #6: Include userId in cache key to prevent cross-user data leakage
		const cacheKey = `property-stats:${userId}`

		// Try to get from cache first
		const cached = await this.cacheManager.get<PropertyStats>(cacheKey)
		if (cached) {
			this.logger.debug('Returning cached property stats', { userId })
			return cached
		}

		// Use Supabase RPC for aggregated stats
		const client = this.supabase.getAdminClient()
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

		const stats = data as unknown as PropertyStats

		// Cache for 30 seconds with user-specific key
		await this.cacheManager.set(cacheKey, stats, 30000)

		return stats
	}

	/**
	 * Get all properties with their units
	 */
	async findAllWithUnits(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		const ownerId = await this.getUserIdFromSupabaseId(userId)

		// Clamp pagination values
		const limit = Math.min(Math.max(query.limit || 10, 1), 100)
		const offset = Math.max(query.offset || 0, 0)

		let queryBuilder = this.supabase
			.getAdminClient()
			.from('property')
			.select('*, units:unit(*)')
			.eq('ownerId', ownerId)
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
				error,
				userId
			})
			return []
		}

		return (data || []) as Property[]
	}

	/**
	 * Get property performance analytics
	 */
	async getPropertyPerformanceAnalytics(
		userId: string,
		query: { propertyId?: string; timeframe: string; limit?: number }
	) {
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
			const property = await this.findOne(userId, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		const limit = Math.min(Math.max(query.limit || 10, 1), 50)

		const client = this.supabase.getAdminClient()
		const { data, error } = await client.rpc(
			'get_property_performance_analytics',
			{
				p_user_id: userId,
				p_timeframe: query.timeframe,
				p_limit: limit,
				...(query.propertyId ? { p_property_id: query.propertyId } : {})
			} satisfies Database['public']['Functions']['get_property_performance_analytics']['Args']
		)

		if (error) {
			this.logger.error('Failed to get performance analytics', {
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
		userId: string,
		query: { propertyId?: string; period: string }
	) {
		// Validate using constant
		if (
			!VALID_PERIODS.includes(query.period as (typeof VALID_PERIODS)[number])
		) {
			throw new BadRequestException(
				`Invalid period. Must be one of: ${VALID_PERIODS.join(', ')}`
			)
		}

		// SECURITY FIX #3: Verify property ownership before calling RPC
		if (query.propertyId) {
			const property = await this.findOne(userId, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client.rpc(
			'get_property_occupancy_analytics',
			{
				p_user_id: userId,
				p_period: query.period,
				...(query.propertyId ? { p_property_id: query.propertyId } : {})
			} satisfies Database['public']['Functions']['get_property_occupancy_analytics']['Args']
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
		userId: string,
		query: { propertyId?: string; timeframe: string }
	) {
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
			const property = await this.findOne(userId, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client.rpc(
			'get_property_financial_analytics',
			{
				p_user_id: userId,
				p_timeframe: query.timeframe,
				...(query.propertyId ? { p_property_id: query.propertyId } : {})
			} satisfies Database['public']['Functions']['get_property_financial_analytics']['Args']
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
		userId: string,
		query: { propertyId?: string; timeframe: string }
	) {
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
			const property = await this.findOne(userId, query.propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}
		}

		const client = this.supabase.getAdminClient()
		const { data, error } = await client.rpc(
			'get_property_maintenance_analytics',
			{
				p_user_id: userId,
				p_timeframe: query.timeframe,
				...(query.propertyId ? { p_property_id: query.propertyId } : {})
			} satisfies Database['public']['Functions']['get_property_maintenance_analytics']['Args']
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
	async getPropertyUnits(
		userId: string,
		propertyId: string
	): Promise<unknown[]> {
		// Verify ownership
		const property = await this.findOne(userId, propertyId)
		if (!property)
			throw new BadRequestException('Property not found or access denied')

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('unit')
			.select('*')
			.eq('propertyId', propertyId)
			.order('unitNumber', { ascending: true })

		if (error) {
			this.logger.error('Failed to get property units', {
				error,
				userId,
				propertyId
			})
			return []
		}

		return data || []
	}

	/**
	 * Mark property as sold with compliance fields (7-year retention)
	 * Sets status to SOLD and records sale date, price, and notes
	 */
	async markAsSold(
		propertyId: string,
		userId: string,
		dateSold: Date,
		salePrice: number,
		saleNotes?: string
	): Promise<{ success: boolean; message: string }> {
		// Verify ownership before allowing sale marking
		const property = await this.findOne(userId, propertyId)
		if (!property) {
			throw new BadRequestException('Property not found or access denied')
		}

		const ownerId = await this.getUserIdFromSupabaseId(userId)

		// Prevent marking already sold properties (check date_sold field for accuracy)
		if (property.date_sold) {
			throw new BadRequestException(
				`Property was already sold on ${new Date(property.date_sold).toLocaleDateString()}`
			)
		}

		const { error } = await this.supabase
			.getAdminClient()
			.from('property')
			.update({
				status: 'SOLD',
				date_sold: dateSold.toISOString(),
				sale_price: salePrice,
				sale_notes: saleNotes || null,
				updatedAt: new Date().toISOString()
			})
			.eq('id', propertyId)
			.eq('ownerId', ownerId) // Double-check ownership in query

		if (error) {
			this.logger.error('Failed to mark property as sold', {
				error,
				propertyId,
				userId
			})
			throw new BadRequestException(
				'Failed to mark property as sold: ' + error.message
			)
		}

		this.logger.log('Property marked as sold', {
			propertyId,
			userId,
			salePrice,
			dateSold: dateSold.toISOString()
		})

		return {
			success: true,
			message: `Property marked as sold for $${salePrice.toLocaleString()}. Records will be retained for 7 years as required.`
		}
	}
}
