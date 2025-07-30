import { Injectable, Logger } from '@nestjs/common'
import { PropertyType } from '@prisma/client'
import { PropertiesRepository, PropertyQueryOptions } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { 
	NotFoundException,
	ValidationException
} from '../common/exceptions/base.exception'

@Injectable()
export class PropertiesService {
	private readonly logger = new Logger(PropertiesService.name)

	constructor(
		private readonly propertiesRepository: PropertiesRepository,
		private readonly errorHandler: ErrorHandlerService
	) {}

	async getPropertiesByOwner(
		ownerId: string,
		query?: {
			propertyType?: PropertyType
			search?: string
			limit?: string | number
			offset?: string | number
		}
	) {
		// Validate input
		if (!ownerId) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}

		const options: PropertyQueryOptions = {
			propertyType: query?.propertyType,
			search: query?.search,
			limit: query?.limit !== undefined ? Number(query.limit) : undefined,
			offset: query?.offset !== undefined ? Number(query.offset) : undefined
		}
		
		// Validate numeric inputs
		if (options.limit && (options.limit < 0 || options.limit > 1000)) {
			throw new ValidationException('Limit must be between 0 and 1000', 'limit')
		}
		
		if (options.offset && options.offset < 0) {
			throw new ValidationException('Offset must be non-negative', 'offset')
		}
		
		return await this.propertiesRepository.findByOwnerWithUnits(
			ownerId,
			options
		)
	}

	async getPropertyStats(ownerId: string) {
		try {
			return await this.propertiesRepository.getStatsByOwner(ownerId)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getPropertyStats',
				resource: 'property',
				metadata: { ownerId }
			})
		}
	}

	async getPropertyById(id: string, ownerId: string) {
		// Validate inputs
		if (!id) {
			throw new ValidationException('Property ID is required', 'id')
		}
		
		if (!ownerId) {
			throw new ValidationException('Owner ID is required', 'ownerId')
		}

		const property = await this.propertiesRepository.findByIdAndOwner(
			id,
			ownerId,
			true // includeUnits
		)
		
		if (!property) {
			throw new NotFoundException('Property', id)
		}
		
		return property
	}

	async getPropertyByIdOrThrow(id: string, ownerId: string) {
		return this.getPropertyById(id, ownerId)
	}

	async createProperty(
		propertyData: {
			name: string
			address: string
			city: string
			state: string
			zipCode: string
			description?: string
			propertyType?: PropertyType
			stripeCustomerId?: string
			units?: number
		},
		ownerId: string
	) {
		try {
			const data = {
				...propertyData,
				ownerId,
				propertyType: propertyData.propertyType || PropertyType.SINGLE_FAMILY,
				User: {
					connect: { id: ownerId }
				}
			}
			
			// If units count is specified, use createWithUnits
			if (propertyData.units && propertyData.units > 0) {
				return await this.propertiesRepository.createWithUnits(
					data,
					propertyData.units
				)
			}
			
			// Otherwise, just create the property
			return await this.propertiesRepository.create({ data })
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'createProperty',
				resource: 'property',
				metadata: { ownerId, propertyName: propertyData.name }
			})
		}
	}

	async updateProperty(
		id: string,
		propertyData: {
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
		},
		ownerId: string
	) {
		try {
			// First verify ownership
			const exists = await this.propertiesRepository.exists({
				id,
				ownerId
			})
			if (!exists) {
				throw new NotFoundException(`Property with ID ${id} not found`)
			}
			// Convert bathrooms/bedrooms to number if present
			const data: {
				name?: string
				address?: string
				city?: string
				state?: string
				zipCode?: string
				description?: string
				propertyType?: PropertyType
				imageUrl?: string
				bathrooms?: number
				bedrooms?: number
				updatedAt: Date
			} = {
				name: propertyData.name,
				address: propertyData.address,
				city: propertyData.city,
				state: propertyData.state,
				zipCode: propertyData.zipCode,
				description: propertyData.description,
				propertyType: propertyData.propertyType,
				imageUrl: propertyData.imageUrl,
				updatedAt: new Date()
			}
			if (propertyData.bathrooms !== undefined) {
				data.bathrooms = propertyData.bathrooms === '' ? undefined : Number(propertyData.bathrooms)
			}
			if (propertyData.bedrooms !== undefined) {
				data.bedrooms = propertyData.bedrooms === '' ? undefined : Number(propertyData.bedrooms)
			}
			return await this.propertiesRepository.update({
				where: { id },
				data
			})
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'updateProperty',
				resource: 'property',
				metadata: { id, ownerId }
			})
		}
	}

	async deleteProperty(id: string, ownerId: string) {
		try {
			// First verify ownership
			const exists = await this.propertiesRepository.exists({
				id,
				ownerId
			})
			
			if (!exists) {
				throw new NotFoundException(`Property with ID ${id} not found`)
			}

			// Check for active leases before deletion
			const activeLeases = await this.propertiesRepository.prismaClient.lease.count({
				where: {
					Unit: {
						propertyId: id
					},
					status: 'ACTIVE'
				}
			})

			if (activeLeases > 0) {
				throw new ValidationException(`Cannot delete property with ${activeLeases} active leases`, 'propertyId')
			}
			
			return await this.propertiesRepository.deleteById(id)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'deleteProperty',
				resource: 'property',
				metadata: { id, ownerId }
			})
		}
	}

	// Alias methods to match route expectations
	async findAllByOwner(ownerId: string, query?: {
		propertyType?: PropertyType
		search?: string
		limit?: string | number
		offset?: string | number
	}) {
		return this.getPropertiesByOwner(ownerId, query)
	}

	async findById(id: string, ownerId: string) {
		return this.getPropertyById(id, ownerId)
	}

	async create(ownerId: string, data: {
		name: string
		address: string
		city: string
		state: string
		zipCode: string
		description?: string
		propertyType?: PropertyType
		stripeCustomerId?: string
		units?: number
	}) {
		return this.createProperty(data, ownerId)
	}

	async update(id: string, ownerId: string, data: {
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
	}) {
		return this.updateProperty(id, data, ownerId)
	}

	async delete(id: string, ownerId: string) {
		return this.deleteProperty(id, ownerId)
	}

	async getStats(ownerId: string) {
		return this.getPropertyStats(ownerId)
	}

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
						propertyType: propertyData.propertyType || PropertyType.SINGLE_FAMILY
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
