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
import type {
	Property,
	Unit
} from '@repo/shared/types/database'

export interface PropertyWithRelations extends Property {
	Unit?: Unit[]
}

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
}
