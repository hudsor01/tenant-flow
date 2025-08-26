<<<<<<< HEAD
/**
 * Properties Service - Ultra-Native Implementation
 *
 * Uses PostgreSQL RPC functions for ALL operations
 * No complex orchestration - just direct DB calls with RLS
 * Each method is <30 lines (just RPC call + error handling)
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '../schemas/properties.schema'
=======
import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../database/supabase.service'
import {
	CreatePropertyDto,
	UpdatePropertyDto
} from '../shared/types/dto-exports'
>>>>>>> origin/main

type Property = Database['public']['Tables']['Property']['Row']
type PropertyInsert = Database['public']['Tables']['Property']['Insert']
type PropertyUpdate = Database['public']['Tables']['Property']['Update']
type Unit = Database['public']['Tables']['Unit']['Row']
type UnitInsert = Database['public']['Tables']['Unit']['Insert']

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
	private readonly logger = new Logger(PropertiesService.name)

<<<<<<< HEAD
	constructor(private readonly supabaseService: SupabaseService) {}

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
			this.logger.error('Failed to get properties', {
				userId,
				error: error.message
			})
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
			this.logger.error('Failed to get property', {
				userId,
				propertyId,
				error: error.message
			})
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
			this.logger.error('Failed to create property', {
				userId,
				error: error.message
			})
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
			this.logger.error('Failed to update property', {
				userId,
				propertyId,
				error: error.message
			})
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
			this.logger.error('Failed to delete property', {
				userId,
				propertyId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete property')
=======
	constructor(private supabaseService: SupabaseService) {}

	/**
	 * Get Supabase client with proper auth context
	 */
	private getClient(authToken?: string): SupabaseClient<Database> {
		return authToken
			? this.supabaseService.getUserClient(authToken)
			: this.supabaseService.getAdminClient()
	}

	/**
	 * Get all properties for an owner
	 */
	async findAll(
		ownerId: string,
		authToken?: string
	): Promise<PropertyWithRelations[]> {
		const supabase = this.getClient(authToken)
		const { data, error } = await supabase
			.from('Property')
			.select(
				`
				*,
				Unit (*)
			`
			)
			.eq('ownerId', ownerId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch properties:', error)
			throw new BadRequestException(error.message)
		}

		return data as PropertyWithRelations[]
	}

	/**
	 * Get single property by ID
	 */
	async findOne(
		id: string,
		ownerId: string,
		authToken?: string
	): Promise<PropertyWithRelations> {
		const supabase = this.getClient(authToken)
		const { data, error } = await supabase
			.from('Property')
			.select(
				`
				*,
				Unit (*)
			`
			)
			.eq('id', id)
			.eq('ownerId', ownerId)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				throw new NotFoundException(`Property not found`)
			}
			this.logger.error('Failed to fetch property:', error)
			throw new BadRequestException(error.message)
		}

		return data as PropertyWithRelations
	}

	/**
	 * Create new property
	 */
	async create(
		dto: CreatePropertyDto,
		ownerId: string,
		authToken?: string
	): Promise<PropertyWithRelations> {
		const supabase = this.getClient(authToken)
		const propertyData: PropertyInsert = {
			...dto,
			ownerId,
			propertyType: (dto.propertyType ||
				'SINGLE_FAMILY') as PropertyInsert['propertyType'],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
>>>>>>> origin/main
		}

		// Start a transaction for property with units
		if (dto.units && Number(dto.units) > 0) {
			return this.createWithUnits(
				propertyData,
				Number(dto.units),
				authToken
			)
		}

		// Create simple property
		const { data, error } = await supabase
			.from('Property')
			.insert(propertyData)
			.select(
				`
				*,
				Unit (*)
			`
			)
			.single()

		if (error) {
			this.logger.error('Failed to create property:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Property created: ${data.id}`)
		return data as PropertyWithRelations
	}

	/**
<<<<<<< HEAD
	 * Get property statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_property_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get property stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to retrieve property statistics'
			)
		}

		return data
=======
	 * Create property with units
	 */
	private async createWithUnits(
		propertyData: PropertyInsert,
		unitCount: number,
		authToken?: string
	): Promise<PropertyWithRelations> {
		const supabase = this.getClient(authToken)
		// Create property first
		const { data: property, error: propertyError } = await supabase
			.from('Property')
			.insert(propertyData)
			.select()
			.single()

		if (propertyError) {
			this.logger.error('Failed to create property:', propertyError)
			throw new BadRequestException(propertyError.message)
		}

		// Create units
		const units: UnitInsert[] = Array.from(
			{ length: unitCount },
			(_, i) => ({
				propertyId: property.id,
				unitNumber: `Unit ${i + 1}`,
				bedrooms: 1,
				bathrooms: 1,
				rent: 1000,
				status: 'VACANT' as const,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			})
		)

		const { error: unitsError } = await supabase.from('Unit').insert(units)

		if (unitsError) {
			// Rollback property creation
			await supabase.from('Property').delete().eq('id', property.id)
			this.logger.error('Failed to create units:', unitsError)
			throw new BadRequestException(unitsError.message)
		}

		// Return property with units
		return this.findOne(property.id, property.ownerId, authToken)
	}

	/**
	 * Update property
	 */
	async update(
		id: string,
		dto: UpdatePropertyDto,
		ownerId: string,
		authToken?: string
	): Promise<PropertyWithRelations> {
		const supabase = this.getClient(authToken)
		// Verify ownership
		await this.findOne(id, ownerId, authToken)

		const updateData: PropertyUpdate = {
			...dto,
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await supabase
			.from('Property')
			.update(updateData)
			.eq('id', id)
			.eq('ownerId', ownerId)
			.select(
				`
				*,
				Unit (*)
			`
			)
			.single()

		if (error) {
			this.logger.error('Failed to update property:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Property updated: ${id}`)
		return data as PropertyWithRelations
	}

	/**
	 * Delete property
	 */
	async remove(
		id: string,
		ownerId: string,
		authToken?: string
	): Promise<void> {
		const supabase = this.getClient(authToken)
		// Verify ownership
		const property = await this.findOne(id, ownerId, authToken)

		// Check for active leases
		const { data: leases } = await supabase
			.from('Lease')
			.select('id')
			.eq('propertyId', id)
			.eq('status', 'ACTIVE')
			.limit(1)

		if (leases && leases.length > 0) {
			throw new BadRequestException(
				'Cannot delete property with active leases'
			)
		}

		// Delete units first (cascade)
		if (property.Unit && property.Unit.length > 0) {
			const { error: unitsError } = await supabase
				.from('Unit')
				.delete()
				.eq('propertyId', id)

			if (unitsError) {
				this.logger.error('Failed to delete units:', unitsError)
				throw new BadRequestException(unitsError.message)
			}
		}

		// Delete property
		const { error } = await supabase
			.from('Property')
			.delete()
			.eq('id', id)
			.eq('ownerId', ownerId)

		if (error) {
			this.logger.error('Failed to delete property:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Property deleted: ${id}`)
	}

	/**
	 * Get property statistics
	 */
	async getStats(
		ownerId: string,
		authToken?: string
	): Promise<{
		total: number
		singleFamily: number
		multiFamily: number
		commercial: number
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		totalMonthlyRent: number
	}> {
		const properties = await this.findAll(ownerId, authToken)

		const stats = {
			total: properties.length,
			singleFamily: 0,
			multiFamily: 0,
			commercial: 0,
			totalUnits: 0,
			occupiedUnits: 0,
			vacantUnits: 0,
			totalMonthlyRent: 0
		}

		for (const property of properties) {
			// Count property types
			if (property.propertyType === 'SINGLE_FAMILY') {
				stats.singleFamily++
			} else if (property.propertyType === 'MULTI_UNIT') {
				stats.multiFamily++
			} else if (property.propertyType === 'COMMERCIAL') {
				stats.commercial++
			}

			// Count units
			if (property.Unit) {
				stats.totalUnits += property.Unit.length
				for (const unit of property.Unit) {
					if (unit.status === 'OCCUPIED') {
						stats.occupiedUnits++
						stats.totalMonthlyRent += unit.rent || 0
					} else {
						stats.vacantUnits++
					}
				}
			}
		}

		return stats
	}

	/**
	 * Search properties
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		authToken?: string
	): Promise<PropertyWithRelations[]> {
		const supabase = this.getClient(authToken)
		const { data, error } = await supabase
			.from('Property')
			.select(
				`
				*,
				Unit (*)
			`
			)
			.eq('ownerId', ownerId)
			.or(
				`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`
			)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to search properties:', error)
			throw new BadRequestException(error.message)
		}

		return data as PropertyWithRelations[]
>>>>>>> origin/main
	}
}
