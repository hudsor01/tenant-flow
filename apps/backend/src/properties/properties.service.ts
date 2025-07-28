import { Injectable } from '@nestjs/common'
import { PropertyType } from '@prisma/client'
import { PropertiesRepository, PropertyQueryOptions } from './properties.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'

@Injectable()
export class PropertiesService {
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
		try {
			const options: PropertyQueryOptions = {
				propertyType: query?.propertyType,
				search: query?.search,
		limit: query?.limit !== undefined ? Number(query.limit) : undefined,
		offset: query?.offset !== undefined ? Number(query.offset) : undefined
			}
			
			return await this.propertiesRepository.findByOwnerWithUnits(
				ownerId,
				options
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getPropertiesByOwner',
				resource: 'property',
				metadata: { ownerId }
			})
		}
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
		try {
			const property = await this.propertiesRepository.findByIdAndOwner(
				id,
				ownerId,
				true // includeUnits
			)
			
			if (!property) {
				throw this.errorHandler.createNotFoundError('Property', id)
			}
			
			return property
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getPropertyById',
				resource: 'property',
				metadata: { id, ownerId }
			})
		}
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
				throw this.errorHandler.createNotFoundError('Property', id)
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
				throw this.errorHandler.createNotFoundError('Property', id)
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
}
