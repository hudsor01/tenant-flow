import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Scope } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import type { AuthRequest } from '../shared/types'
import { SupabaseService } from '../database/supabase.service'
import { CreatePropertyDto, UpdatePropertyDto } from '../shared/types/dto-exports'

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
 */
@Injectable({ scope: Scope.REQUEST })
export class PropertiesService {
	private readonly logger = new Logger(PropertiesService.name)
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: AuthRequest,
		private supabaseService: SupabaseService
	) {
		// Get user-scoped client if token available, otherwise admin client
		const token = this.request.user?.supabaseToken ||
			this.request.headers?.authorization?.replace('Bearer ', '')
		
		this.supabase = token 
			? this.supabaseService.getUserClient(token)
			: this.supabaseService.getAdminClient()
	}

	/**
	 * Get all properties for an owner
	 */
	async findAll(ownerId: string): Promise<PropertyWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Property')
			.select(`
				*,
				Unit (*)
			`)
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
	async findOne(id: string, ownerId: string): Promise<PropertyWithRelations> {
		const { data, error } = await this.supabase
			.from('Property')
			.select(`
				*,
				Unit (*)
			`)
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
	async create(dto: CreatePropertyDto, ownerId: string): Promise<PropertyWithRelations> {
		const propertyData: PropertyInsert = {
			...dto,
			ownerId,
			propertyType: (dto.propertyType || 'SINGLE_FAMILY') as PropertyInsert['propertyType'],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		// Start a transaction for property with units
		if (dto.units && Number(dto.units) > 0) {
			return this.createWithUnits(propertyData, Number(dto.units))
		}

		// Create simple property
		const { data, error } = await this.supabase
			.from('Property')
			.insert(propertyData)
			.select(`
				*,
				Unit (*)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to create property:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Property created: ${data.id}`)
		return data as PropertyWithRelations
	}

	/**
	 * Create property with units
	 */
	private async createWithUnits(
		propertyData: PropertyInsert, 
		unitCount: number
	): Promise<PropertyWithRelations> {
		// Create property first
		const { data: property, error: propertyError } = await this.supabase
			.from('Property')
			.insert(propertyData)
			.select()
			.single()

		if (propertyError) {
			this.logger.error('Failed to create property:', propertyError)
			throw new BadRequestException(propertyError.message)
		}

		// Create units
		const units: UnitInsert[] = Array.from({ length: unitCount }, (_, i) => ({
			propertyId: property.id,
			unitNumber: `Unit ${i + 1}`,
			bedrooms: 1,
			bathrooms: 1,
			rent: 1000,
			status: 'VACANT' as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}))

		const { error: unitsError } = await this.supabase
			.from('Unit')
			.insert(units)

		if (unitsError) {
			// Rollback property creation
			await this.supabase.from('Property').delete().eq('id', property.id)
			this.logger.error('Failed to create units:', unitsError)
			throw new BadRequestException(unitsError.message)
		}

		// Return property with units
		return this.findOne(property.id, property.ownerId)
	}

	/**
	 * Update property
	 */
	async update(
		id: string, 
		dto: UpdatePropertyDto, 
		ownerId: string
	): Promise<PropertyWithRelations> {
		// Verify ownership
		await this.findOne(id, ownerId)

		const updateData: PropertyUpdate = {
			...dto,
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('Property')
			.update(updateData)
			.eq('id', id)
			.eq('ownerId', ownerId)
			.select(`
				*,
				Unit (*)
			`)
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
	async remove(id: string, ownerId: string): Promise<void> {
		// Verify ownership
		const property = await this.findOne(id, ownerId)

		// Check for active leases
		const { data: leases } = await this.supabase
			.from('Lease')
			.select('id')
			.eq('propertyId', id)
			.eq('status', 'ACTIVE')
			.limit(1)

		if (leases && leases.length > 0) {
			throw new BadRequestException('Cannot delete property with active leases')
		}

		// Delete units first (cascade)
		if (property.Unit && property.Unit.length > 0) {
			const { error: unitsError } = await this.supabase
				.from('Unit')
				.delete()
				.eq('propertyId', id)

			if (unitsError) {
				this.logger.error('Failed to delete units:', unitsError)
				throw new BadRequestException(unitsError.message)
			}
		}

		// Delete property
		const { error } = await this.supabase
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
	async getStats(ownerId: string): Promise<{
		total: number
		singleFamily: number
		multiFamily: number
		commercial: number
		totalUnits: number
		occupiedUnits: number
		vacantUnits: number
		totalMonthlyRent: number
	}> {
		const properties = await this.findAll(ownerId)

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
			if (property.propertyType === 'SINGLE_FAMILY') {stats.singleFamily++}
			else if (property.propertyType === 'MULTI_UNIT') {stats.multiFamily++}
			else if (property.propertyType === 'COMMERCIAL') {stats.commercial++}

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
	async search(ownerId: string, searchTerm: string): Promise<PropertyWithRelations[]> {
		const { data, error } = await this.supabase
			.from('Property')
			.select(`
				*,
				Unit (*)
			`)
			.eq('ownerId', ownerId)
			.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to search properties:', error)
			throw new BadRequestException(error.message)
		}

		return data as PropertyWithRelations[]
	}
}