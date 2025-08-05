import { Injectable } from '@nestjs/common'
import { Unit, UnitStatus, Prisma } from '@repo/database'
import { UnitsRepository } from './units.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { UnitCreateDto, UnitUpdateDto, UnitQueryDto } from './dto'
import { UNIT_STATUS } from '@repo/shared'

@Injectable()
export class UnitsService extends BaseCrudService<
	Unit,
	UnitCreateDto,
	UnitUpdateDto,
	UnitQueryDto,
	Prisma.UnitCreateInput,
	Prisma.UnitUpdateInput,
	Prisma.UnitWhereInput
> {
	protected readonly entityName = 'unit'
	protected readonly repository: UnitsRepository

	constructor(
		private readonly unitsRepository: UnitsRepository,
		errorHandler: ErrorHandlerService
	) {
		super(errorHandler)
		this.repository = unitsRepository
	}

	// ========================================
	// BaseCrudService Implementation
	// ========================================

	protected async findByIdAndOwner(id: string, ownerId: string): Promise<Unit | null> {
		return await this.unitsRepository.findByIdAndOwner(id, ownerId, true)
	}

	protected async calculateStats(ownerId: string): Promise<BaseStats> {
		return await this.unitsRepository.getStatsByOwner(ownerId)
	}

	protected prepareCreateData(data: UnitCreateDto, _ownerId: string): Prisma.UnitCreateInput {
		// First verify property ownership is handled in repository
		const { propertyId, ...restData } = data
		
		return {
			...restData,
			unitNumber: data.unitNumber,
			bedrooms: data.bedrooms || 1,
			bathrooms: data.bathrooms || 1,
			squareFeet: data.squareFeet,
			rent: data.monthlyRent,
			status: data.status || UNIT_STATUS.VACANT,
			Property: {
				connect: { id: propertyId }
			}
		}
	}

	protected prepareUpdateData(data: UnitUpdateDto): Prisma.UnitUpdateInput {
		return {
			...data,
			status: data.status as UnitStatus | undefined,
			lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : undefined,
			updatedAt: new Date()
		}
	}

	protected createOwnerWhereClause(id: string, ownerId: string): Prisma.UnitWhereInput {
		return {
			id,
			Property: {
				ownerId
			}
		}
	}

	protected override async validateDeletion(entity: Unit, ownerId: string): Promise<void> {
		// Check if unit has active leases before deletion
		const hasActiveLeases = await this.unitsRepository.hasActiveLeases(entity.id, ownerId)
		
		if (hasActiveLeases) {
			throw new ValidationException('Cannot delete unit with active leases', 'unitId')
		}
	}

	// ========================================
	// Override Methods for Unit-Specific Logic
	// ========================================

	// Override create to verify property ownership
	override async create(data: UnitCreateDto, ownerId: string): Promise<Unit> {
		// Verify property ownership before creating unit
		const hasPropertyAccess = await this.unitsRepository.verifyPropertyOwnership(data.propertyId, ownerId)
		
		if (!hasPropertyAccess) {
			throw new ValidationException('You do not have access to this property', 'propertyId')
		}
		
		return super.create(data, ownerId)
	}

	// Override getByOwner to use specialized repository method
	override async getByOwner(ownerId: string, query?: UnitQueryDto): Promise<Unit[]> {
		if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}
		
		try {
			const options = this.parseQueryOptions(query)
			return await this.unitsRepository.findByOwnerWithDetails(ownerId, options) as Unit[]
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getByOwner',
				resource: this.entityName,
				metadata: { ownerId }
			})
		}
	}

	// ========================================
	// Unit-Specific Methods
	// ========================================

	/**
	 * Get units by property with ownership verification
	 */
	async getUnitsByProperty(propertyId: string, ownerId: string) {
		try {
			const units = await this.unitsRepository.findByPropertyAndOwner(propertyId, ownerId)
			
			if (units === null) {
				throw new ValidationException('You do not have access to this property', 'propertyId')
			}
			
			return units
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getUnitsByProperty',
				resource: this.entityName,
				metadata: { propertyId, ownerId }
			})
		}
	}

	// ========================================
	// Backward Compatibility Aliases
	// ========================================

	async getUnitsByOwner(ownerId: string): Promise<Unit[]> {
		return this.getByOwner(ownerId)
	}

	async getUnitStats(ownerId: string) {
		return this.getStats(ownerId)
	}

	async getUnitById(id: string, ownerId: string): Promise<Unit | null> {
		return this.findByIdAndOwner(id, ownerId)
	}

	async getUnitByIdOrThrow(id: string, ownerId: string): Promise<Unit> {
		return this.getByIdOrThrow(id, ownerId)
	}

	async createUnit(ownerId: string, data: UnitCreateDto): Promise<Unit> {
		return this.create(data, ownerId)
	}

	async updateUnit(id: string, ownerId: string, data: UnitUpdateDto): Promise<Unit> {
		return this.update(id, data, ownerId)
	}

	async deleteUnit(id: string, ownerId: string): Promise<Unit> {
		return this.delete(id, ownerId)
	}

	// Legacy route compatibility aliases
	override async findAllByOwner(ownerId: string, query?: Record<string, unknown>): Promise<Unit[]> {
		return this.getByOwner(ownerId, query as UnitQueryDto)
	}

	override async findById(id: string, ownerId: string): Promise<Unit> {
		return this.getByIdOrThrow(id, ownerId)
	}

	// Legacy create method with reversed parameters for backward compatibility
	async createLegacy(ownerId: string, data: UnitCreateDto): Promise<Unit> {
		return this.create(data, ownerId)
	}

	// Legacy update method (parameter order compatibility)
	override async update(id: string, data: UnitUpdateDto, ownerId: string): Promise<Unit> {
		return super.update(id, data, ownerId)
	}

	// Legacy update method with old parameter order for backward compatibility  
	async updateLegacy(id: string, ownerId: string, data: UnitUpdateDto): Promise<Unit> {
		return this.update(id, data, ownerId)
	}

	// Legacy delete method 
	override async delete(id: string, ownerId: string): Promise<Unit> {
		return super.delete(id, ownerId)
	}

	override async getStats(ownerId: string) {
		return super.getStats(ownerId)
	}
}