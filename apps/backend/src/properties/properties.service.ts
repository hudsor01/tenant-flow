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
import type { Database, PropertyWithUnits } from '@repo/shared'

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
	 * Get all properties for a user using RPC
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
				'Failed to get properties via RPC'
			)
			throw new BadRequestException('Failed to retrieve properties')
		}

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
				p_address: `${createRequest.address}, ${createRequest.city}, ${createRequest.state} ${createRequest.zipCode}`,
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
				p_address: updateRequest.address
					? `${updateRequest.address}${updateRequest.city ? `, ${updateRequest.city}` : ''}${updateRequest.state ? `, ${updateRequest.state}` : ''}${updateRequest.zipCode ? ` ${updateRequest.zipCode}` : ''}`
					: undefined,
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
	 * Get all properties with their units for stat calculations
	 * Direct query with units relation
	 */
	async findAllWithUnits(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<PropertyWithUnits[]> {
		// Build the query for properties with units using actual database column names
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.from('Property')
			.select(`
				id,
				name,
				address,
				city,
				state,
				zipCode,
				description,
				propertyType,
				createdAt,
				updatedAt,
				ownerId,
				Unit (
					id,
					unitNumber,
					status,
					rent,
					propertyId
				)
			`)
			.eq('ownerId', userId)
			.order('createdAt', { ascending: false })
			.range(query.offset, query.offset + query.limit - 1)
			.ilike('name', query.search ? `%${query.search}%` : '%')

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

		// Transform to PropertyWithUnits type from @repo/shared
		// Map database fields to match shared type interface  
		// KISS principle: simple type annotation for raw query result
		// Map actual database schema to expected interface
		const properties = (data || []) as Array<{
			id: string
			name: string
			address: string
			city: string
			state: string
			zipCode: string // Database uses zipCode, not zip
			description: string | null
			propertyType: string // Database uses propertyType, not status
			createdAt: string // Database uses camelCase
			updatedAt: string // Database uses camelCase
			ownerId: string // Database uses ownerId, not user_id
			Unit?: Array<{
				id: string
				unitNumber: string // Database uses camelCase
				status: string
				rent: number | null // Database uses rent, not rentAmount
				propertyId: string // Database uses propertyId
				description?: string | null // Unit description field
				createdAt?: string // Unit creation timestamp
				updatedAt?: string // Unit update timestamp
			}>
		}>
		
		return properties.map(property => ({
			id: property.id,
			name: property.name,
			address: property.address,
			city: property.city,
			state: property.state,
			zipCode: property.zipCode, // Keep zipCode as in Database Property type
			description: property.description, // Keep as nullable per Database Property type
			propertyType: property.propertyType as Database['public']['Enums']['PropertyType'], // Cast to proper enum type
			createdAt: property.createdAt, // Keep camelCase to match Database Property type
			updatedAt: property.updatedAt, // Keep camelCase to match Database Property type
			ownerId: property.ownerId, // Keep ownerId to match Database Property type
			imageUrl: null, // Add required imageUrl property (default to null)
			units: (property.Unit || []).map(unit => ({
				id: unit.id,
				propertyId: unit.propertyId, // Keep propertyId to match Database Unit type
				unitNumber: unit.unitNumber, // Keep unitNumber to match Database Unit type
				rent: unit.rent || 0, // Keep rent field
				status: unit.status as Database['public']['Enums']['UnitStatus'], // Cast to proper enum type
				createdAt: unit.createdAt || new Date().toISOString(), // Keep camelCase 
				updatedAt: unit.updatedAt || new Date().toISOString(), // Keep camelCase

				bedrooms: 0, // Default value
				bathrooms: 0, // Default value
				squareFeet: null, // Optional field
				lastInspectionDate: null, // Optional field
				leases: [] // Required by PropertyWithUnits relation type
			}))
		}))
	}
}
