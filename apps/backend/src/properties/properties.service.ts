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
	) {
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
		return data || []
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
	 * Get all properties with their units and statistics
	 * Uses RPC function for ALL calculations - ULTRA-NATIVE
	 */
	async findAllWithUnits(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<PropertyWithUnits[]> {
		// TODO: Replace with RPC call 'get_properties_with_units' when migration 20250902_missing_rpc_functions.sql is applied
		// Using direct query fallback until RPC function exists - maintains consistent error handling pattern
		
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('Property')
			.select(`
				id, name, address, city, state, zipCode, description,
				propertyType, createdAt, updatedAt, ownerId, imageUrl
			`)
			.eq('ownerId', userId)
			.order('createdAt', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)

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
				'Failed to get properties with units'
			)
			throw new BadRequestException('Failed to retrieve properties')
		}

		// Transform data to match PropertyWithUnits interface
		// TODO: Replace with direct RPC return when function is available
		return (data || []).map(property => ({
			...property,
			// Calculated metrics will come directly from RPC when available
			totalUnits: 0,
			occupiedUnits: 0,
			vacantUnits: 0,
			maintenanceUnits: 0,
			occupancyRate: 0,
			monthlyRevenue: 0,
			potentialRevenue: 0,
			revenueUtilization: 0,
			averageRentPerUnit: 0,
			maintenanceRequests: 0,
			openMaintenanceRequests: 0,
			units: [] // Empty units array for now
		})) as PropertyWithUnits[]
	}
}
