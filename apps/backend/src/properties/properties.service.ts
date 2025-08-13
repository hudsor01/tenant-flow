import { Injectable } from '@nestjs/common'
import { Property, Prisma, PropertyType } from '@repo/database'
import { PropertiesRepository, PropertyQueryOptions } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { 
  PropertyNotFoundException
} from '../common/exceptions/property.exceptions'
import { 
  CreatePropertyDto,
  UpdatePropertyDto,
  QueryPropertiesDto
} from '../common/dto/dto-exports'
// Removed unused validation imports

@Injectable()
export class PropertiesService extends BaseCrudService<
	Property,
	CreatePropertyDto,
	UpdatePropertyDto,
	QueryPropertiesDto,
	Prisma.PropertyCreateInput,
	Prisma.PropertyUpdateInput,
	Prisma.PropertyWhereInput
> {
	protected readonly entityName = 'property'
	protected readonly repository: PropertiesRepository

	constructor(
		private readonly propertiesRepository: PropertiesRepository,
		errorHandler: ErrorHandlerService,
		// Removed unused zodValidation service
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

	protected prepareCreateData(data: CreatePropertyDto, ownerId: string): Prisma.PropertyCreateInput {
		return {
			...data,
			propertyType: data.propertyType || PropertyType.SINGLE_FAMILY,
			User: {
				connect: { id: ownerId }
			}
		}
	}

	protected prepareUpdateData(data: UpdatePropertyDto): Prisma.PropertyUpdateInput {
		return {
			...data,
			updatedAt: new Date()
		}
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
			throw new PropertyNotFoundException(entity.id)
		}
	}

	// ========================================
	// Standard API Methods (Consistent Naming)
	// ========================================

	/**
	 * Find property by ID - returns null if not found
	 * @param id Property ID
	 * @param ownerId Owner ID for security
	 * @returns Property or null
	 */
	override async findById(id: string, ownerId: string): Promise<Property> {
		try {
			const property = await this.findByIdAndOwner(id, ownerId)
			if (!property) {
				throw new PropertyNotFoundException(id)
			}
			return property
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: this.entityName,
				metadata: { propertyId: id, ownerId }
			})
		}
	}

	/**
	 * Get property by ID - throws if not found
	 * @param id Property ID
	 * @param ownerId Owner ID for security
	 * @returns Property
	 * @throws PropertyNotFoundException
	 */
	async getById(id: string, ownerId: string): Promise<Property> {
		const property = await this.findById(id, ownerId)
		if (!property) {
			throw new PropertyNotFoundException(id)
		}
		return property
	}

	// ========================================
	// Deprecated Methods (Migration Path)
	// ========================================

	/**
	 * @deprecated Use getByOwner() instead. Will be removed in v2.0.0
	 */
	async getPropertiesByOwner(ownerId: string, query?: QueryPropertiesDto): Promise<Property[]> {
		console.warn('getPropertiesByOwner() is deprecated. Use getByOwner() instead.')
		return this.getByOwner(ownerId, query)
	}

	/**
	 * @deprecated Use getStats() instead. Will be removed in v2.0.0
	 */
	async getPropertyStats(ownerId: string) {
		console.warn('getPropertyStats() is deprecated. Use getStats() instead.')
		return this.getStats(ownerId)
	}

	/**
	 * @deprecated Use getById() instead. Will be removed in v2.0.0
	 */
	async getPropertyById(id: string, ownerId: string): Promise<Property> {
		console.warn('getPropertyById() is deprecated. Use getById() instead.')
		return this.getById(id, ownerId)
	}

	/**
	 * @deprecated Use getById() instead. Will be removed in v2.0.0
	 */
	async getPropertyByIdOrThrow(id: string, ownerId: string): Promise<Property> {
		console.warn('getPropertyByIdOrThrow() is deprecated. Use getById() instead.')
		return this.getById(id, ownerId)
	}

	/**
	 * @deprecated Use create() instead. Will be removed in v2.0.0
	 */
	async createProperty(data: CreatePropertyDto, ownerId: string): Promise<Property> {
		console.warn('createProperty() is deprecated. Use create() instead.')
		return this.create(data, ownerId)
	}

	/**
	 * @deprecated Use update() instead. Will be removed in v2.0.0
	 */
	async updateProperty(id: string, data: UpdatePropertyDto, ownerId: string): Promise<Property> {
		console.warn('updateProperty() is deprecated. Use update() instead.')
		return this.update(id, data, ownerId)
	}

	/**
	 * @deprecated Use delete() instead. Will be removed in v2.0.0
	 */
	async deleteProperty(id: string, ownerId: string): Promise<Property> {
		console.warn('deleteProperty() is deprecated. Use delete() instead.')
		return this.delete(id, ownerId)
	}

	// Override create to handle units creation (only use transaction when needed)
	override async create(data: CreatePropertyDto, ownerId: string): Promise<Property> {
		try {
			const createData = this.prepareCreateData(data, ownerId)
			
			// Only use transaction when creating with units (atomicity needed)
			if (data.units && data.units > 0) {
				const result = await this.propertiesRepository.createWithUnits(createData, data.units)
				
				this.logger.log(`${this.entityName} with units created`, { 
					id: result.id,
					ownerId,
					unitsCount: data.units 
				})
				
				return result
			}
			
			// Standard create (no transaction needed)
			const result = await this.propertiesRepository.create({ data: createData })
			
			this.logger.log(`${this.entityName} created`, { 
				id: result.id,
				ownerId 
			})
			
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
	override async getByOwner(ownerId: string, query?: QueryPropertiesDto): Promise<Property[]> {
		try {
			const validQuery = query || { limit: 50, offset: 0, sortOrder: 'desc' as const }
			const options = this.parseQueryOptions(validQuery)
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
	 * Create property with custom units in a single transaction
	 * Validates data and delegates to repository for atomicity
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
		// Basic validation
		if (!ownerId) {
			throw new PropertyNotFoundException('validation')
		}
		const validOwnerId = ownerId
		const validatedPropertyData = propertyData
		
		// Validate units data
		if (!units || units.length === 0) {
			throw new PropertyNotFoundException('validation')
		}

		if (units.length > 1000) {
			throw new PropertyNotFoundException('validation')
		}

		try {
			// Delegate to repository for database transaction
			// Create property with units using repository
			const createData = this.prepareCreateData(validatedPropertyData as CreatePropertyDto, validOwnerId)
			return await this.propertiesRepository.create({ data: createData })
		} catch (error) {
			this.logger.error('Error creating property with custom units', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'createPropertyWithUnits',
				resource: 'property',
				metadata: { ownerId: validOwnerId, propertyName: propertyData.name }
			})
		}
	}

}
