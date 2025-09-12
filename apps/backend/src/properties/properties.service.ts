/**
 * Properties Service - Ultra-Native Implementation
 *
 * Uses PostgreSQL RPC functions for ALL operations
 * No complex orchestration - just direct DB calls with RLS
 * Each method is <30 lines (just RPC call + error handling)
 */

import { Injectable, BadRequestException } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '../schemas/properties.schema'
import type { PropertyWithUnits } from '@repo/shared'

// Simple utility function (not abstraction) - follows KISS principle
const formatAddress = (addr: {
	address?: string
	city?: string
	state?: string
	zipCode?: string
}): string | undefined => {
	if (!addr.address) return undefined
	
	const parts = [addr.address]
	if (addr.city) parts.push(addr.city)
	if (addr.state) parts.push(addr.state)
	if (addr.zipCode) parts.push(addr.zipCode)
	
	return parts.join(', ')
}

// RPC function return types will be added when migration is applied

// PropertyWithUnits imported above from @repo/shared - NO DUPLICATION

/**
 * Properties service - Direct Supabase implementation following KISS principle
 * No abstraction layers, no base classes, just simple CRUD operations
 * Optimized for performance - singleton scope with token passed per method
 */
@Injectable()
export class PropertiesService {
	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly logger: PinoLogger
	) {
		// PinoLogger context handled automatically via app-level configuration
	}

	/**
	 * Get all properties with CALCULATED METRICS using RPC
	 * ALL business logic is in the database - NO calculations here
	 */
	async findAll(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<PropertyWithUnits[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_properties', {
				p_user_id: userId,
				p_search: query.search || undefined,
				p_limit: query.limit,
				p_offset: query.offset
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get properties with metrics via RPC'
			)
			throw new BadRequestException('Failed to retrieve properties')
		}

		// Data comes with ALL metrics pre-calculated from DB
		// NO business logic transformations allowed here
		return (data as unknown as PropertyWithUnits[]) || []
	}

	/**
	 * Get single property using RPC
	 */
	async findOne(userId: string, propertyId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_by_id', {
				p_user_id: userId,
				p_property_id: propertyId
			})
			.single()

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					propertyId
				},
				'Failed to get property by ID via RPC'
			)
			return null
		}

		return data
	}

	/**
	 * Create property using RPC
	 */
	async create(userId: string, createRequest: CreatePropertyRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_property', {
				p_user_id: userId,
				p_name: createRequest.name,
				p_address: formatAddress(createRequest) || createRequest.address,
				p_type: createRequest.propertyType || 'SINGLE_FAMILY',
				p_description: createRequest.description
			})
			.single()

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					createRequest: {
						name: createRequest.name,
						address: createRequest.address,
						propertyType: createRequest.propertyType
					}
				},
				'Failed to create property via RPC'
			)
			throw new BadRequestException('Failed to create property')
		}

		return data
	}

	/**
	 * Update property using RPC
	 */
	async update(
		userId: string,
		propertyId: string,
		updateRequest: UpdatePropertyRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_property', {
				p_user_id: userId,
				p_property_id: propertyId,
				p_name: updateRequest.name,
				p_address: formatAddress(updateRequest),
				p_type: updateRequest.propertyType,
				p_description: updateRequest.description
			})
			.single()

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					propertyId,
					updateRequest: {
						name: updateRequest.name,
						address: updateRequest.address,
						propertyType: updateRequest.propertyType
					}
				},
				'Failed to update property via RPC'
			)
			return null
		}

		return data
	}

	/**
	 * Delete property using RPC
	 */
	async remove(userId: string, propertyId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_property', {
				p_user_id: userId,
				p_property_id: propertyId
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					propertyId
				},
				'Failed to delete property via RPC'
			)
			throw new BadRequestException('Failed to delete property')
		}

		return { success: true, message: 'Property deleted successfully' }
	}

	/**
	 * Get property statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId
				},
				'Failed to get property stats via RPC'
			)
			throw new BadRequestException(
				'Failed to retrieve property statistics'
			)
		}

		return data
	}

	/**
	 * Get all properties with their units and statistics using RPC
	 * ALL business logic is in the database - NO calculations here
	 */
	async findAllWithUnits(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<PropertyWithUnits[]> {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_properties', {
				p_user_id: userId,
				p_search: query.search || undefined,
				p_limit: query.limit,
				p_offset: query.offset
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get properties with units via RPC'
			)
			throw new BadRequestException('Failed to retrieve properties with units')
		}

		// Data comes with ALL metrics and units pre-calculated from DB
		// NO business logic transformations allowed here
		return (data as unknown as PropertyWithUnits[]) || []
	}

	/**
	 * Get property performance analytics
	 * Uses RPC for detailed per-property metrics and calculations
	 */
	async getPropertyPerformanceAnalytics(
		userId: string,
		query: {
			propertyId?: string
			timeframe: string
			limit?: number
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_performance_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_timeframe: query.timeframe,
				p_limit: query.limit || 10
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get property performance analytics via RPC'
			)
			throw new BadRequestException(
				'Failed to retrieve property performance analytics'
			)
		}

		return data || []
	}

	/**
	 * Get property occupancy analytics
	 * Tracks occupancy trends over time per property
	 */
	async getPropertyOccupancyAnalytics(
		userId: string,
		query: {
			propertyId?: string
			period: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_occupancy_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_period: query.period
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get property occupancy analytics via RPC'
			)
			throw new BadRequestException(
				'Failed to retrieve property occupancy analytics'
			)
		}

		return data || []
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profitability metrics per property
	 */
	async getPropertyFinancialAnalytics(
		userId: string,
		query: {
			propertyId?: string
			timeframe: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_financial_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_timeframe: query.timeframe
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get property financial analytics via RPC'
			)
			throw new BadRequestException(
				'Failed to retrieve property financial analytics'
			)
		}

		return data || []
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 */
	async getPropertyMaintenanceAnalytics(
		userId: string,
		query: {
			propertyId?: string
			timeframe: string
		}
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_maintenance_analytics', {
				p_user_id: userId,
				p_property_id: query.propertyId || undefined,
				p_timeframe: query.timeframe
			})

		if (error) {
			this.logger.error(
				{
					error: {
						message: error.message,
						code: error.code,
						hint: error.hint
					},
					userId,
					query
				},
				'Failed to get property maintenance analytics via RPC'
			)
			throw new BadRequestException(
				'Failed to retrieve property maintenance analytics'
			)
		}

		return data || []
	}
}
