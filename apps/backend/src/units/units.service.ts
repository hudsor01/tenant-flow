import { Injectable, NotFoundException, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type { 
	Unit, 
	UnitStats 
} from '@repo/shared'
import type { CreateUnitDto, UpdateUnitDto, UnitQueryDto } from './dto'
import { UnitStatus } from './dto'

// Database row type matching Supabase generated types
interface UnitRow {
	id: string
	propertyId: string
	unitNumber: string
	bedrooms: number
	bathrooms: number
	squareFeet: number | null
	rent: number // Generated types show this as 'rent', not 'monthly_rent'
	lastInspectionDate: string | null
	status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
	createdAt: string
	updatedAt: string
}

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get all units for a user (filtered by property ownership)
	 */
	async findAll(userId: string, query?: UnitQueryDto): Promise<Unit[]> {
		try {
			let supabaseQuery = this.supabaseService
				.getAdminClient()
				.from('Unit')
				.select(`
					*,
					Property!inner(id, name, ownerId)
				`)
				.eq('Property.ownerId', userId)

			// Apply filters
			if (query?.propertyId) {
				supabaseQuery = supabaseQuery.eq('propertyId', query.propertyId)
			}
			if (query?.status) {
				supabaseQuery = supabaseQuery.eq('status', query.status as 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED')
			}
			if (query?.bedroomsMin) {
				supabaseQuery = supabaseQuery.gte('bedrooms', query.bedroomsMin)
			}
			if (query?.bedroomsMax) {
				supabaseQuery = supabaseQuery.lte('bedrooms', query.bedroomsMax)
			}
			if (query?.rentMin) {
				supabaseQuery = supabaseQuery.gte('rent', query.rentMin)
			}
			if (query?.rentMax) {
				supabaseQuery = supabaseQuery.lte('rent', query.rentMax)
			}
			if (query?.search) {
				supabaseQuery = supabaseQuery.or(`unitNumber.ilike.%${query.search}%,description.ilike.%${query.search}%`)
			}

			// Apply pagination
			if (query?.limit) {
				supabaseQuery = supabaseQuery.limit(query.limit)
			}
			if (query?.offset) {
				supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 10) - 1)
			}

			// Apply sorting
			const sortBy = query?.sortBy || 'createdAt'
			const sortOrder = query?.sortOrder || 'desc'
			supabaseQuery = supabaseQuery.order(sortBy, { ascending: sortOrder === 'asc' })

			const { data, error } = await supabaseQuery

			if (error) {
				this.logger.error('Error fetching units:', error)
				throw new InternalServerErrorException(`Failed to fetch units: ${error.message}`)
			}

			return data?.map(row => this.mapToUnit(row as UnitRow)) || []
		} catch (error) {
			if (error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in findAll:', error)
			throw new InternalServerErrorException('Failed to fetch units')
		}
	}

	/**
	 * Get units for a specific property
	 */
	async findByProperty(userId: string, propertyId: string): Promise<Unit[]> {
		return this.findAll(userId, { propertyId })
	}

	/**
	 * Get a single unit by ID
	 */
	async findOne(userId: string, unitId: string): Promise<Unit> {
		try {
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.select(`
					*,
					Property!inner(id, name, ownerId)
				`)
				.eq('id', unitId)
				.eq('Property.ownerId', userId)
				.single()

			if (error) {
				if (error.code === 'PGRST116') {
					throw new NotFoundException(`Unit with ID ${unitId} not found`)
				}
				this.logger.error('Error fetching unit:', error)
				throw new InternalServerErrorException(`Failed to fetch unit: ${error.message}`)
			}

			return this.mapToUnit(data as UnitRow)
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in findOne:', error)
			throw new InternalServerErrorException('Failed to fetch unit')
		}
	}

	/**
	 * Create a new unit
	 */
	async create(userId: string, createUnitDto: CreateUnitDto): Promise<Unit> {
		try {
			// CRITICAL: Check unit limit to prevent abuse
			const { count: unitCount } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.select('*', { count: 'exact', head: true })
				.eq('propertyId', createUnitDto.propertyId)
			
			if (unitCount && unitCount >= 100) {
				throw new BadRequestException('Maximum unit limit (100) reached for this property')
			}
			
			// Verify user owns the property
			const { data: property, error: propertyError } = await this.supabaseService
				.getAdminClient()
				.from('Property')
				.select('id, ownerId')
				.eq('id', createUnitDto.propertyId)
				.eq('ownerId', userId)
				.single()

			if (propertyError || !property) {
				throw new BadRequestException('Property not found or access denied')
			}

			// Check for duplicate unit number within property
			const { data: existingUnit, error: duplicateError } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.select('id')
				.eq('propertyId', createUnitDto.propertyId)
				.eq('unitNumber', createUnitDto.unitNumber)
				.maybeSingle()

			if (duplicateError) {
				this.logger.error('Error checking duplicate unit:', duplicateError)
			}

			if (existingUnit) {
				throw new BadRequestException(`Unit number "${createUnitDto.unitNumber}" already exists for this property`)
			}

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.insert({
					propertyId: createUnitDto.propertyId,
					unitNumber: createUnitDto.unitNumber,
					bedrooms: createUnitDto.bedrooms,
					bathrooms: createUnitDto.bathrooms,
					squareFeet: createUnitDto.squareFeet,
					rent: createUnitDto.rent,
					status: createUnitDto.status || UnitStatus.VACANT
				})
				.select('*')
				.single()

			if (error) {
				this.logger.error('Error creating unit:', error)
				throw new InternalServerErrorException(`Failed to create unit: ${error.message}`)
			}

			return this.mapToUnit(data as UnitRow)
		} catch (error) {
			if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in create:', error)
			throw new InternalServerErrorException('Failed to create unit')
		}
	}

	/**
	 * Update an existing unit
	 */
	async update(userId: string, unitId: string, updateUnitDto: UpdateUnitDto): Promise<Unit> {
		try {
			// Verify user owns the unit via property
			const existingUnit = await this.findOne(userId, unitId)
			if (!existingUnit) {
				throw new NotFoundException(`Unit with ID ${unitId} not found`)
			}

			const updateData: Record<string, any> = {}
			if (updateUnitDto.unitNumber !== undefined) updateData.unitNumber = updateUnitDto.unitNumber
			if (updateUnitDto.bedrooms !== undefined) updateData.bedrooms = updateUnitDto.bedrooms
			if (updateUnitDto.bathrooms !== undefined) updateData.bathrooms = updateUnitDto.bathrooms
			if (updateUnitDto.squareFeet !== undefined) updateData.squareFeet = updateUnitDto.squareFeet
			if (updateUnitDto.rent !== undefined) updateData.rent = updateUnitDto.rent
			if (updateUnitDto.status !== undefined) updateData.status = updateUnitDto.status

			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.update(updateData)
				.eq('id', unitId)
				.select('*')
				.single()

			if (error) {
				this.logger.error('Error updating unit:', error)
				throw new InternalServerErrorException(`Failed to update unit: ${error.message}`)
			}

			return this.mapToUnit(data as UnitRow)
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in update:', error)
			throw new InternalServerErrorException('Failed to update unit')
		}
	}

	/**
	 * Delete a unit
	 */
	async remove(userId: string, unitId: string): Promise<void> {
		try {
			// Verify user owns the unit via property
			const existingUnit = await this.findOne(userId, unitId)
			if (!existingUnit) {
				throw new NotFoundException(`Unit with ID ${unitId} not found`)
			}

			const { error } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.delete()
				.eq('id', unitId)

			if (error) {
				this.logger.error('Error deleting unit:', error)
				throw new InternalServerErrorException(`Failed to delete unit: ${error.message}`)
			}
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in remove:', error)
			throw new InternalServerErrorException('Failed to delete unit')
		}
	}

	/**
	 * Get unit statistics for a user
	 */
	async getStats(userId: string): Promise<UnitStats> {
		try {
			const { data, error } = await this.supabaseService
				.getAdminClient()
				.from('Unit')
				.select(`
					status,
					rent,
					Property!inner(ownerId)
				`)
				.eq('Property.ownerId', userId)

			if (error) {
				this.logger.error('Error fetching unit stats:', error)
				throw new InternalServerErrorException(`Failed to fetch unit stats: ${error.message}`)
			}

			const units = data || []
			const total = units.length
			const occupied = units.filter((u: any) => u.status === 'OCCUPIED').length
			const vacant = units.filter((u: any) => u.status === 'VACANT').length
			const maintenance = units.filter((u: any) => u.status === 'MAINTENANCE').length
			const available = vacant + units.filter((u: any) => u.status === 'RESERVED').length
			
			const rents = units.map((u: any) => u.rent).filter((r): r is number => r !== null && r > 0)
			const averageRent = rents.length > 0 ? rents.reduce((sum, rent) => sum + rent, 0) / rents.length : 0
			const totalPotentialRent = rents.reduce((sum, rent) => sum + rent, 0)
			const occupiedRents = units
				.filter((u: any) => u.status === 'OCCUPIED' && u.rent)
				.map((u: any) => u.rent)
			const totalActualRent = occupiedRents.reduce((sum, rent) => sum + rent, 0)

			return {
				total,
				occupied,
				vacant,
				maintenance,
				available,
				occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
				averageRent,
				totalPotentialRent,
				totalActualRent
			}
		} catch (error) {
			if (error instanceof InternalServerErrorException) {
				throw error
			}
			this.logger.error('Error in getStats:', error)
			throw new InternalServerErrorException('Failed to fetch unit stats')
		}
	}

	/**
	 * Update unit availability status
	 */
	async updateAvailability(userId: string, unitId: string, available: boolean): Promise<Unit> {
		const status = available ? UnitStatus.VACANT : UnitStatus.OCCUPIED
		return this.update(userId, unitId, { status })
	}

	/**
	 * Map database row to Unit interface
	 */
	private mapToUnit(data: UnitRow): Unit {
		return {
			id: data.id,
			unitNumber: data.unitNumber,
			propertyId: data.propertyId,
			bedrooms: data.bedrooms,
			bathrooms: data.bathrooms,
			squareFeet: data.squareFeet,
			rent: data.rent || undefined,
			monthlyRent: data.rent || undefined, // Backwards compatibility - TO BE REMOVED
			status: data.status,
			lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt)
		}
	}
}