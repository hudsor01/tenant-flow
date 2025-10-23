/**
 * Properties Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, native validation, no custom abstractions
 */

import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
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
	 * Get all properties with search and pagination
	 */
	async findAll(
		userId: string,
		query: { search?: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		let queryBuilder = this.supabase
			.getAdminClient()
			.from('property')
			.select('*')
			.eq('ownerId', userId)
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
		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property')
			.select('*')
			.eq('id', propertyId)
			.eq('ownerId', userId)
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
		if (!VALID_PROPERTY_TYPES.includes(request.propertyType as PropertyType)) {
			throw new BadRequestException('Invalid property type')
		}

		// Build insert object conditionally per exactOptionalPropertyTypes
		const insertData: Database['public']['Tables']['property']['Insert'] = {
			ownerId: userId,
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

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property')
			.insert(insertData)
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to create property', { error, userId })
			throw new BadRequestException('Failed to create property')
		}

		return data as Property
	}

	/**
	 * Update property with validation
	 */
	async update(
		userId: string,
		propertyId: string,
		request: UpdatePropertyRequest
	): Promise<Property | null> {
		// Verify ownership
		const existing = await this.findOne(userId, propertyId)
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
			updatedAt: new Date().toISOString()
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

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('property')
			.update(updateData)
			.eq('id', propertyId)
			.eq('ownerId', userId)
			.select()
			.single()

		if (error) {
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

		// Delete property image from storage if exists
		if (existing.imageUrl) {
			try {
				// Extract file path from imageUrl
				// Format: https://{project}.supabase.co/storage/v1/object/public/property-images/{path}
				const url = new URL(existing.imageUrl)
				const pathParts = url.pathname.split('/property-images/')
				if (pathParts.length > 1 && pathParts[1]) {
					const filePath = pathParts[1]
					await this.storage.deleteFile('property-images', filePath)
					this.logger.log('Deleted property image from storage', {
						propertyId,
						filePath
					})
				}
			} catch (error) {
				// Log error but don't fail the deletion
				this.logger.warn('Failed to delete property image', {
					error,
					propertyId,
					imageUrl: existing.imageUrl
				})
			}
		}

		const { error } = await this.supabase
			.getAdminClient()
			.from('property')
			.update({
				status: 'INACTIVE' as Database['public']['Enums']['PropertyStatus']
			})
			.eq('id', propertyId)
			.eq('ownerId', userId)

		if (error) {
			this.logger.error('Failed to delete property', {
				error,
				userId,
				propertyId
			})
			throw new BadRequestException('Failed to delete property')
		}

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
		// Clamp pagination values
		const limit = Math.min(Math.max(query.limit || 10, 1), 100)
		const offset = Math.max(query.offset || 0, 0)

		let queryBuilder = this.supabase
			.getAdminClient()
			.from('property')
			.select('*, units:unit(*)')
			.eq('ownerId', userId)
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
			.eq('ownerId', userId) // Double-check ownership in query

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
