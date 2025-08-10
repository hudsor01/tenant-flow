import { Injectable } from '@nestjs/common'
import { Property, Prisma, PropertyType } from '@repo/database'
import { SecurityEventType } from '@repo/shared'
import { PropertiesRepository, PropertyQueryOptions } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { ValidationException } from '../common/exceptions/base.exception'

// Define DTOs for type safety
export interface PropertyCreateDto {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  description?: string
  propertyType?: PropertyType
  stripeCustomerId?: string
  units?: number
}

export interface PropertyUpdateDto {
  name?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  description?: string
  propertyType?: PropertyType
  imageUrl?: string
  bathrooms?: string | number
  bedrooms?: string | number
}

export interface PropertyQueryDto extends PropertyQueryOptions {
  propertyType?: PropertyType
  search?: string
  limit?: number
  offset?: number
  [key: string]: unknown
}

@Injectable()
export class PropertiesService extends BaseCrudService<
	Property,
	PropertyCreateDto,
	PropertyUpdateDto,
	PropertyQueryDto,
	Prisma.PropertyCreateInput,
	Prisma.PropertyUpdateInput,
	Prisma.PropertyWhereInput
> {
	protected readonly entityName = 'property'
	protected readonly repository: PropertiesRepository

	constructor(
		private readonly propertiesRepository: PropertiesRepository,
		errorHandler: ErrorHandlerService
	) {
		super(errorHandler)
		this.repository = propertiesRepository
	}

	// ========================================
	// BaseCrudService Implementation
	// ========================================

	protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
		return await this.propertiesRepository.findByIdAndOwner(id, ownerId, true)
	}

	protected async calculateStats(ownerId: string): Promise<BaseStats> {
		return await this.propertiesRepository.getStatsByOwner(ownerId)
	}

	protected prepareCreateData(data: PropertyCreateDto, ownerId: string): Prisma.PropertyCreateInput {
		const { propertyType, ...rest } = data
return {
  ...rest,
  propertyType: propertyType ? propertyType as PropertyType : PropertyType.SINGLE_FAMILY,
  User: {
    connect: { id: ownerId }
  }
}
	}

	protected prepareUpdateData(data: PropertyUpdateDto): Prisma.PropertyUpdateInput {
		// Remove bathrooms and bedrooms since they don't exist in PropertyUpdateInput
		const { bathrooms: _bathrooms, bedrooms: _bedrooms, ...restData } = data
		
		// Explicitly silence unused variable warnings for ESLint
		void _bathrooms
		void _bedrooms
		
		const updateData: Prisma.PropertyUpdateInput = {
			...restData,
			updatedAt: new Date()
		}

		// Note: bathrooms/bedrooms are not in the Property model according to Prisma
		// These might belong to the Unit model instead
		// If needed, these should be handled through Unit updates

		return updateData
	}

	protected createOwnerWhereClause(id: string, ownerId: string): Prisma.PropertyWhereInput {
		return { id, ownerId }
	}

	protected override async validateDeletion(entity: Property, _ownerId: string): Promise<void> {
		// Check for active leases before deletion
		const activeLeases = await this.propertiesRepository.prismaClient.lease.count({
			where: {
				Unit: {
					propertyId: entity.id
				},
				status: 'ACTIVE'
			}
		})

		if (activeLeases > 0) {
			throw new ValidationException(`Cannot delete property with ${activeLeases} active leases`, 'propertyId')
		}
	}

	// ========================================
	// Backward Compatibility Aliases
	// ========================================

	async getPropertiesByOwner(ownerId: string, query?: PropertyQueryDto): Promise<Property[]> {
		return this.getByOwner(ownerId, query)
	}

	async getPropertyStats(ownerId: string) {
		return this.getStats(ownerId)
	}

	async getPropertyById(id: string, ownerId: string): Promise<Property> {
		return this.getByIdOrThrow(id, ownerId)
	}

	async getPropertyByIdOrThrow(id: string, ownerId: string): Promise<Property> {
		return this.getByIdOrThrow(id, ownerId)
	}

	async createProperty(data: PropertyCreateDto, ownerId: string): Promise<Property> {
		return this.create(data, ownerId)
	}

	async updateProperty(id: string, data: PropertyUpdateDto, ownerId: string): Promise<Property> {
		return this.update(id, data, ownerId)
	}

	async deleteProperty(id: string, ownerId: string): Promise<Property> {
		return this.delete(id, ownerId)
	}

	// Override validateCreateData for property-specific validation
	protected override validateCreateData(data: PropertyCreateDto): void {
		if (!data.name?.trim()) {
			throw new ValidationException('Property name is required', 'name')
		}
		if (!data.address?.trim()) {
			throw new ValidationException('Property address is required', 'address')
		}
		if (!data.city?.trim()) {
			throw new ValidationException('Property city is required', 'city')
		}
		if (!data.state?.trim()) {
			throw new ValidationException('Property state is required', 'state')
		}
		if (!data.zipCode?.trim()) {
			throw new ValidationException('Property zip code is required', 'zipCode')
		}
	}

	// Override create to handle units creation
	override async create(data: PropertyCreateDto, ownerId: string): Promise<Property> {
		// Add validations that base class would do
		if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}
		this.validateCreateData(data)

		try {
			const createData = this.prepareCreateData(data, ownerId)
			
			// If units count is specified, use createWithUnits
			if (data.units && data.units > 0) {
				const result = await this.propertiesRepository.createWithUnits(createData, data.units)
				
				this.logger.log(`${this.entityName} with units created`, { 
					id: result.id,
					ownerId,
					unitsCount: data.units 
				})

				// Audit logging for sensitive create operations
				if (this.auditService) {
					await this.auditService.logSecurityEvent({
						eventType: SecurityEventType.ADMIN_ACTION,
						userId: ownerId,
						resource: this.entityName.toLowerCase(),
						action: 'create',
						details: JSON.stringify({
							entityId: result.id,
							entityType: this.entityName,
							propertyName: data.name,
							hasUnits: true,
							unitsCount: data.units
						})
					})
				}
				
				return result
			}
			
			// Otherwise, use standard create
			const result = await this.propertiesRepository.create({ data: createData })
			
			this.logger.log(`${this.entityName} created`, { 
				id: result.id,
				ownerId 
			})

			// Audit logging for sensitive create operations
			if (this.auditService) {
				await this.auditService.logSecurityEvent({
					eventType: SecurityEventType.ADMIN_ACTION,
					userId: ownerId,
					resource: this.entityName.toLowerCase(),
					action: 'create',
					details: JSON.stringify({
						entityId: result.id,
						entityType: this.entityName,
						propertyName: data.name,
						hasUnits: data.units && data.units > 0
					})
				})
			}
			
			return result
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: this.entityName,
				metadata: { ownerId, propertyName: data.name }
			})
		}
	}

	// Override getByOwner to use specialized repository method
	override async getByOwner(ownerId: string, query?: PropertyQueryDto): Promise<Property[]> {
		// Add validations that base class would do
		if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}
		
		try {
			const options = this.parseQueryOptions(query)
			return await this.repository.findByOwnerWithUnits(ownerId, options as PropertyQueryOptions)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getByOwner',
				resource: this.entityName,
				metadata: { ownerId }
			})
		}
	}


	// ========================================
	// Unique Property-Specific Methods
	// ========================================

	/**
	 * Optimized method to get properties with full statistics
	 * Uses a single query with aggregation for better performance
	 */
	async getPropertiesWithStats(ownerId: string) {
		try {
			const properties = await this.propertiesRepository.prismaClient.property.findMany({
				where: { ownerId },
				include: {
					Unit: {
						select: {
							id: true,
							status: true,
							rent: true,
							_count: {
								select: {
									Lease: {
										where: { status: 'ACTIVE' }
									}
								}
							}
						}
					},
					_count: {
						select: {
							Unit: true,
							Document: true
						}
					}
				},
				orderBy: { createdAt: 'desc' }
			})

			// Transform the data to include calculated stats
			return properties.map((property) => {
				const units = property.Unit || []
				const occupiedUnits = units.filter((u) => u.status === 'OCCUPIED').length
				const totalRent = units.reduce((sum: number, unit) => 
					unit.status === 'OCCUPIED' ? sum + unit.rent : sum, 0
				)

				return {
					...property,
					stats: {
						totalUnits: property._count.Unit,
						occupiedUnits,
						vacantUnits: property._count.Unit - occupiedUnits,
						occupancyRate: property._count.Unit > 0 
							? (occupiedUnits / property._count.Unit) * 100 
							: 0,
						monthlyRent: totalRent,
						documentCount: property._count.Document
					}
				}
			})
		} catch (error) {
			this.logger.error('Error getting properties with stats', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getPropertiesWithStats',
				resource: 'property',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Create property with units in a single transaction
	 * Optimized for atomic operations
	 */
	async createPropertyWithUnits(
		propertyData: {
			name: string
			address: string
			city: string
			state: string
			zipCode: string
			description?: string
			propertyType?: PropertyType
		},
		units: {
			unitNumber: string
			bedrooms: number
			bathrooms: number
			rent: number
			squareFeet?: number
		}[],
		ownerId: string
	) {
		try {
			return await this.propertiesRepository.prismaClient.$transaction(async (tx) => {
				// Create property
				const property = await tx.property.create({
					data: {
						...propertyData,
						ownerId,
						propertyType: propertyData.propertyType ? propertyData.propertyType as PropertyType : PropertyType.SINGLE_FAMILY
					}
				})

				// Create units if provided
				if (units.length > 0) {
					await tx.unit.createMany({
						data: units.map(unit => ({
							...unit,
							propertyId: property.id,
							status: 'VACANT'
						}))
					})
				}

				// Return property with units
				return await tx.property.findUnique({
					where: { id: property.id },
					include: {
						Unit: true,
						_count: {
							select: { Unit: true }
						}
					}
				})
			})
		} catch (error) {
			this.logger.error('Error creating property with units', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'createPropertyWithUnits',
				resource: 'property',
				metadata: { ownerId, propertyName: propertyData.name }
			})
		}
	}

}
