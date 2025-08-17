import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	PropertiesSupabaseRepository,
	PropertyQueryOptions,
	PropertyWithRelations
} from './properties-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { PropertyNotFoundException } from '../common/exceptions/property.exceptions'
import { CreatePropertyDto, UpdatePropertyDto } from '../common/dto/dto-exports'
type PropertyInsert = Database['public']['Tables']['Property']['Insert']
type PropertyUpdate = Database['public']['Tables']['Property']['Update']

/**
 * Properties service using Supabase
 * Handles property management with full ownership validation and multi-tenant security
 */
@Injectable()
export class PropertiesService {
	private readonly logger = new Logger(PropertiesService.name)

	constructor(
		private readonly repository: PropertiesSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Create a new property
	 */
	async create(
		data: CreatePropertyDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		try {
			const propertyData: PropertyInsert = {
				...data,
				ownerId,
				propertyType: data.propertyType || 'SINGLE_FAMILY',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			// Create property with units if specified
			if (data.units && data.units > 0) {
				return await this.repository.createWithUnits(
					propertyData,
					data.units,
					ownerId,
					userId,
					userToken
				)
			}

			// Create standard property
			const property = await this.repository.create(
				propertyData,
				userId,
				userToken
			)

			this.logger.log('Property created successfully', {
				propertyId: property.id,
				ownerId,
				name: property.name
			})

			return property
		} catch (error) {
			this.logger.error('Failed to create property:', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: 'property',
				metadata: { ownerId, propertyName: data.name }
			})
		}
	}

	/**
	 * Find property by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		try {
			const property = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!property) {
				throw new PropertyNotFoundException(id)
			}

			return property
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: 'property',
				metadata: { propertyId: id, ownerId }
			})
		}
	}

	/**
	 * Get all properties for an owner
	 */
	async findByOwner(
		ownerId: string,
		options: PropertyQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations[]> {
		try {
			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByOwner',
				resource: 'property',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Update property
	 */
	async update(
		id: string,
		data: UpdatePropertyDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new PropertyNotFoundException(id)
			}

			const updateData: PropertyUpdate = {
				...data,
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Property updated successfully', {
				propertyId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'update',
				resource: 'property',
				metadata: { propertyId: id, ownerId }
			})
		}
	}

	/**
	 * Delete property (with validation for active leases)
	 */
	async delete(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<void> {
		try {
			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new PropertyNotFoundException(id)
			}

			// Check for active leases before deletion
			const hasActiveLeases = await this.repository.hasActiveLeases(
				id,
				userId,
				userToken
			)

			if (hasActiveLeases) {
				throw new Error('Cannot delete property with active leases')
			}

			await this.repository.delete(id, userId, userToken)

			this.logger.log('Property deleted successfully', {
				propertyId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'delete',
				resource: 'property',
				metadata: { propertyId: id, ownerId }
			})
		}
	}

	/**
	 * Get property statistics for owner
	 */
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
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
		try {
			return await this.repository.getStatsByOwner(
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getStats',
				resource: 'property',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Get properties with comprehensive statistics
	 */
	async getPropertiesWithStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<
		(PropertyWithRelations & {
			stats: {
				totalUnits: number
				occupiedUnits: number
				vacantUnits: number
				occupancyRate: number
				monthlyRent: number
				documentCount: number
			}
		})[]
	> {
		try {
			const properties = await this.repository.findByOwnerWithStats(
				ownerId,
				userId,
				userToken
			)

			// Calculate stats for each property
			return properties.map(property => {
				const units = property.Unit || []
				const occupiedUnits = units.filter(
					u => u.status === 'OCCUPIED'
				).length
				const totalUnits = units.length
				const totalRent = units
					.filter(u => u.status === 'OCCUPIED')
					.reduce((sum, unit) => sum + (unit.rent || 0), 0)

				return {
					...property,
					stats: {
						totalUnits,
						occupiedUnits,
						vacantUnits: totalUnits - occupiedUnits,
						occupancyRate:
							totalUnits > 0
								? (occupiedUnits / totalUnits) * 100
								: 0,
						monthlyRent: totalRent,
						documentCount: property._count?.Document || 0
					}
				}
			})
		} catch (error) {
			this.logger.error('Error getting properties with stats:', error)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getPropertiesWithStats',
				resource: 'property',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Create property with custom units
	 */
	async createPropertyWithUnits(
		propertyData: CreatePropertyDto,
		units: {
			unitNumber: string
			bedrooms: number
			bathrooms: number
			rent: number
			squareFeet?: number
		}[],
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		try {
			// Validate input
			if (!units || units.length === 0) {
				throw new Error('At least one unit is required')
			}

			if (units.length > 1000) {
				throw new Error('Too many units (max 1000)')
			}

			const propertyInsert: PropertyInsert = {
				...propertyData,
				ownerId,
				propertyType: propertyData.propertyType || 'MULTI_FAMILY',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			return await this.repository.createWithCustomUnits(
				propertyInsert,
				units,
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			this.logger.error(
				'Error creating property with custom units:',
				error
			)
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'createPropertyWithUnits',
				resource: 'property',
				metadata: {
					ownerId,
					propertyName: propertyData.name,
					unitCount: units.length
				}
			})
		}
	}

	/**
	 * Search properties by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: PropertyQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations[]> {
		try {
			const searchOptions = {
				...options,
				search: searchTerm
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				searchOptions,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'search',
				resource: 'property',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Get property by address (for duplicate checking)
	 */
	async findByAddress(
		address: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations | null> {
		try {
			return await this.repository.findByAddress(
				address,
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByAddress',
				resource: 'property',
				metadata: { ownerId, address }
			})
		}
	}

	/**
	 * Alias methods for compatibility with controller
	 */
	async getByOwner(
		ownerId: string,
		query?: PropertyQueryOptions,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations[]> {
		return this.findByOwner(ownerId, query, userId, userToken)
	}

	async getById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		return this.findById(id, ownerId, userId, userToken)
	}

	async getByIdOrThrow(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<PropertyWithRelations> {
		return this.findById(id, ownerId, userId, userToken)
	}
}
