import { Injectable, BadRequestException, NotFoundException, Scope, Inject, Logger } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@repo/shared/types/supabase-generated'
import { TypeSafeConfigService } from '../common/config/config.service'
import { UnitCreateDto, UnitUpdateDto } from './dto'

type Unit = Database['public']['Tables']['Unit']['Row']
type UnitInsert = Database['public']['Tables']['Unit']['Insert']
type UnitUpdate = Database['public']['Tables']['Unit']['Update']
type Property = Database['public']['Tables']['Property']['Row']
type Lease = Database['public']['Tables']['Lease']['Row']
type Tenant = Database['public']['Tables']['Tenant']['Row']

export interface UnitWithRelations extends Unit {
	Property?: {
		id: string
		name: string
		address: string
		ownerId: string
	}
	Lease?: Array<{
		id: string
		status: string
		startDate: string
		endDate: string
		rentAmount: number
		Tenant?: {
			id: string
			name: string
			email: string
			phone: string | null
		}
	}>
}

/**
 * Units service - Direct Supabase implementation
 * No abstraction layers, no base classes, just simple CRUD operations
 */
@Injectable({ scope: Scope.REQUEST })
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)
	private readonly supabase: SupabaseClient<Database>

	constructor(
		@Inject(REQUEST) private request: any,
		private configService: TypeSafeConfigService
	) {
		// Create client with anon key for RLS
		this.supabase = createClient<Database>(
			this.configService.supabase.url,
			this.configService.supabase.anonKey,
			{
				auth: {
					persistSession: false,
					autoRefreshToken: false
				}
			}
		)

		// Set user session if available
		const token = this.request.user?.supabaseToken || 
			this.request.headers?.authorization?.replace('Bearer ', '')
		
		if (token) {
			this.supabase.auth.setSession({
				access_token: token,
				refresh_token: ''
			})
		}
	}

	/**
	 * Get all units for an owner
	 */
	async findAll(ownerId: string, propertyId?: string): Promise<UnitWithRelations[]> {
		let query = this.supabase
			.from('Unit')
			.select(`
				*,
				Property!inner (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.eq('Property.ownerId', ownerId)

		if (propertyId) {
			query = query.eq('propertyId', propertyId)
		}

		const { data, error } = await query
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch units:', error)
			throw new BadRequestException(error.message)
		}

		return data as UnitWithRelations[]
	}

	/**
	 * Get single unit by ID
	 */
	async findOne(id: string, ownerId: string): Promise<UnitWithRelations> {
		const { data, error } = await this.supabase
			.from('Unit')
			.select(`
				*,
				Property!inner (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.eq('id', id)
			.eq('Property.ownerId', ownerId)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				throw new NotFoundException(`Unit not found`)
			}
			this.logger.error('Failed to fetch unit:', error)
			throw new BadRequestException(error.message)
		}

		return data as UnitWithRelations
	}

	/**
	 * Create new unit
	 */
	async create(dto: UnitCreateDto, ownerId: string): Promise<UnitWithRelations> {
		// First verify property ownership
		const { data: property, error: propertyError } = await this.supabase
			.from('Property')
			.select('id, ownerId')
			.eq('id', dto.propertyId)
			.eq('ownerId', ownerId)
			.single()

		if (propertyError || !property) {
			throw new BadRequestException('Property not found or access denied')
		}

		// Check if unit number already exists in this property
		const { data: existingUnit } = await this.supabase
			.from('Unit')
			.select('id')
			.eq('propertyId', dto.propertyId)
			.eq('unitNumber', dto.unitNumber)
			.single()

		if (existingUnit) {
			throw new BadRequestException('Unit number already exists in this property')
		}

		const unitData: UnitInsert = {
			unitNumber: dto.unitNumber,
			propertyId: dto.propertyId,
			bedrooms: dto.bedrooms,
			bathrooms: dto.bathrooms,
			squareFeet: dto.squareFeet,
			rent: dto.monthlyRent,
			securityDeposit: dto.securityDeposit,
			description: dto.description,
			amenities: dto.amenities,
			status: dto.status || 'VACANT',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		const { data, error } = await this.supabase
			.from('Unit')
			.insert(unitData)
			.select(`
				*,
				Property (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to create unit:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Unit created: ${data.id}`)
		return data as UnitWithRelations
	}

	/**
	 * Update unit
	 */
	async update(
		id: string, 
		dto: UnitUpdateDto, 
		ownerId: string
	): Promise<UnitWithRelations> {
		// Verify ownership
		await this.findOne(id, ownerId)

		// If updating unit number, check for conflicts
		if (dto.unitNumber) {
			const unit = await this.findOne(id, ownerId)
			const { data: existingUnit } = await this.supabase
				.from('Unit')
				.select('id')
				.eq('propertyId', unit.propertyId)
				.eq('unitNumber', dto.unitNumber)
				.neq('id', id)
				.single()

			if (existingUnit) {
				throw new BadRequestException('Unit number already exists in this property')
			}
		}

		const updateData: UnitUpdate = {
			...dto,
			updatedAt: new Date().toISOString()
		}

		// Map monthlyRent to rent if provided
		if ('monthlyRent' in dto) {
			updateData.rent = dto.monthlyRent
			delete (updateData as any).monthlyRent
		}

		const { data, error } = await this.supabase
			.from('Unit')
			.update(updateData)
			.eq('id', id)
			.select(`
				*,
				Property (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to update unit:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Unit updated: ${id}`)
		return data as UnitWithRelations
	}

	/**
	 * Delete unit
	 */
	async remove(id: string, ownerId: string): Promise<void> {
		// Verify ownership
		const unit = await this.findOne(id, ownerId)

		// Check for active leases
		const { data: leases } = await this.supabase
			.from('Lease')
			.select('id')
			.eq('unitId', id)
			.eq('status', 'ACTIVE')
			.limit(1)

		if (leases && leases.length > 0) {
			throw new BadRequestException('Cannot delete unit with active leases')
		}

		const { error } = await this.supabase
			.from('Unit')
			.delete()
			.eq('id', id)

		if (error) {
			this.logger.error('Failed to delete unit:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Unit deleted: ${id}`)
	}

	/**
	 * Update unit status
	 */
	async updateStatus(id: string, status: string, ownerId: string): Promise<UnitWithRelations> {
		// Validate status
		const validStatuses = ['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']
		if (!validStatuses.includes(status)) {
			throw new BadRequestException(`Invalid status: ${status}`)
		}

		// Verify ownership
		await this.findOne(id, ownerId)

		// If setting to occupied, validate there's an active lease
		if (status === 'OCCUPIED') {
			const { data: lease } = await this.supabase
				.from('Lease')
				.select('id')
				.eq('unitId', id)
				.eq('status', 'ACTIVE')
				.single()

			if (!lease) {
				throw new BadRequestException('Cannot mark unit as occupied without an active lease')
			}
		}

		const { data, error } = await this.supabase
			.from('Unit')
			.update({ 
				status: status as Unit['status'],
				updatedAt: new Date().toISOString()
			})
			.eq('id', id)
			.select(`
				*,
				Property (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.single()

		if (error) {
			this.logger.error('Failed to update unit status:', error)
			throw new BadRequestException(error.message)
		}

		this.logger.log(`Unit status updated: ${id} to ${status}`)
		return data as UnitWithRelations
	}

	/**
	 * Get unit statistics for owner
	 */
	async getStats(ownerId: string): Promise<{
		total: number
		vacant: number
		occupied: number
		maintenance: number
		reserved: number
		totalRent: number
		averageRent: number
	}> {
		const units = await this.findAll(ownerId)

		const stats = {
			total: units.length,
			vacant: 0,
			occupied: 0,
			maintenance: 0,
			reserved: 0,
			totalRent: 0,
			averageRent: 0
		}

		for (const unit of units) {
			switch (unit.status) {
				case 'VACANT':
					stats.vacant++
					break
				case 'OCCUPIED':
					stats.occupied++
					stats.totalRent += unit.rent || 0
					break
				case 'MAINTENANCE':
					stats.maintenance++
					break
				case 'RESERVED':
					stats.reserved++
					break
			}
		}

		stats.averageRent = stats.occupied > 0 ? stats.totalRent / stats.occupied : 0

		return stats
	}

	/**
	 * Search units
	 */
	async search(ownerId: string, searchTerm: string, propertyId?: string): Promise<UnitWithRelations[]> {
		let query = this.supabase
			.from('Unit')
			.select(`
				*,
				Property!inner (
					id,
					name,
					address,
					ownerId
				),
				Lease (
					id,
					status,
					startDate,
					endDate,
					rentAmount,
					Tenant (
						id,
						name,
						email,
						phone
					)
				)
			`)
			.eq('Property.ownerId', ownerId)

		if (propertyId) {
			query = query.eq('propertyId', propertyId)
		}

		const { data, error } = await query
			.or(`unitNumber.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to search units:', error)
			throw new BadRequestException(error.message)
		}

		return data as UnitWithRelations[]
	}
}