/**
 * Properties Service - Layered Architecture Implementation
 *
 * Uses repository pattern for data access abstraction
 * Business logic separated from database operations
 * Clean separation of concerns and testable design
 */

import { CacheKey, CacheTTL } from '@nestjs/cache-manager'
import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common'
import type { CreatePropertyRequest, UpdatePropertyRequest } from '@repo/shared/types/backend-domain'
import type { Property } from '@repo/shared/types/core'
import type { PropertyStats } from '@repo/shared/types/core'
import type { IPropertiesRepository } from '../repositories/interfaces/properties-repository.interface'
import type { IUnitsRepository } from '../repositories/interfaces/units-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'

// Type alias for properties with units - using Property for now since PropertyWithUnits not defined
type PropertyWithUnits = Property

@Injectable()
export class PropertiesService {
	private readonly logger = new Logger(PropertiesService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.PROPERTIES)
		private readonly propertiesRepository: IPropertiesRepository,
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository
	) {}

	/**
	 * Get all properties with search and pagination
	 * Uses repository pattern for clean data access
	 */
	async findAll(
		userId: string,
		query: { search?: string | null; limit: number; offset: number }
	): Promise<Property[]> {
		try {
			return await this.propertiesRepository.findByUserIdWithSearch(userId, {
				search: query.search,
				limit: query.limit,
				offset: query.offset
			})
		} catch (error) {
			this.logger.error('Failed to get properties via repository', { error, userId, query })
			// Return empty array for zero state
			return []
		}
	}


	/**
	 * Get single property by ID
	 * Includes business logic validation
	 */
	async findOne(userId: string, propertyId: string): Promise<Property | null> {
		try {
			// Business logic: Validate property ID format
			if (!propertyId || typeof propertyId !== 'string') {
				throw new BadRequestException('Invalid property ID')
			}

			const property = await this.propertiesRepository.findById(propertyId)

			// Business logic: Verify ownership
			if (property && property.ownerId !== userId) {
				this.logger.warn('Access denied: Property not owned by user', { userId, propertyId })
				return null
			}

			return property
		} catch (error) {
			this.logger.error('Failed to get property by ID', { error, userId, propertyId })
			throw new BadRequestException('Failed to retrieve property')
		}
	}

	/**
	 * Create property with business validation
	 * Implements proper business rules and validation
	 */
	async create(
		userId: string,
		request: CreatePropertyRequest
	): Promise<Property> {
		try {
			// Business logic: Validate required fields
			if (!request.name?.trim()) {
				throw new BadRequestException('Property name is required')
			}

			if (!request.address?.trim()) {
				throw new BadRequestException('Property address is required')
			}

			if (!request.city?.trim() || !request.state?.trim() || !request.zipCode?.trim()) {
				throw new BadRequestException('City, state, and zip code are required')
			}

			// Business logic: Validate property type
			const validPropertyTypes = ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL', 'CONDO']
			if (!request.propertyType || !validPropertyTypes.includes(request.propertyType)) {
				throw new BadRequestException('Invalid property type')
			}

			// Business logic: Sanitize inputs
			const sanitizedRequest = {
				...request,
				name: request.name.trim(),
				address: request.address.trim(),
				city: request.city.trim(),
				state: request.state.trim(),
				zipCode: request.zipCode.trim(),
				description: request.description?.trim() || undefined
			}

			return await this.propertiesRepository.create(userId, sanitizedRequest)
		} catch (error) {
			this.logger.error('Failed to create property', { error, userId, request })

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to create property')
		}
	}

	/**
	 * Update property with ownership verification and validation
	 * Implements business rules for property updates
	 */
	async update(
		userId: string,
		propertyId: string,
		request: UpdatePropertyRequest
	): Promise<Property | null> {
		try {
			// Business logic: Verify ownership first
			const existingProperty = await this.findOne(userId, propertyId)
			if (!existingProperty) {
				throw new BadRequestException('Property not found or access denied')
			}

			// Business logic: Validate update fields if provided
			if (request.name && !request.name.trim()) {
				throw new BadRequestException('Property name cannot be empty')
			}

			if (request.propertyType) {
				const validPropertyTypes = ['APARTMENT', 'HOUSE', 'CONDO', 'TOWNHOUSE', 'COMMERCIAL']
				if (!validPropertyTypes.includes(request.propertyType)) {
					throw new BadRequestException('Invalid property type')
				}
			}

			// Business logic: Sanitize inputs
			const sanitizedRequest = {
				...request,
				name: request.name?.trim(),
				address: request.address?.trim(),
				city: request.city?.trim(),
				state: request.state?.trim(),
				zipCode: request.zipCode?.trim(),
				description: request.description?.trim()
			}

			return await this.propertiesRepository.update(propertyId, sanitizedRequest)
		} catch (error) {
			this.logger.error('Failed to update property', { error, userId, propertyId, request })

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to update property')
		}
	}

	/**
	 * Delete property with ownership verification
	 * Implements business rules for property deletion
	 */
	async remove(
		userId: string,
		propertyId: string
	): Promise<{ success: boolean; message: string }> {
		try {
			// Business logic: Verify ownership first
			const existingProperty = await this.findOne(userId, propertyId)
			if (!existingProperty) {
				throw new BadRequestException('Property not found or access denied')
			}

			// Business logic: Could add checks for dependencies here
			// For example: Check if property has active leases
			// const activeLeases = await this.leasesRepository.findActiveByPropertyId(propertyId)
			// if (activeLeases.length > 0) {
			//   throw new BadRequestException('Cannot delete property with active leases')
			// }

			return await this.propertiesRepository.softDelete(userId, propertyId)
		} catch (error) {
			this.logger.error('Failed to delete property', { error, userId, propertyId })

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to delete property')
		}
	}

	/**
	 * Get property statistics with caching
	 * Uses repository pattern with business logic fallback
	 */
	@CacheKey('property-stats')
	@CacheTTL(30) // 30 seconds
	async getStats(userId: string): Promise<PropertyStats> {
		try {
			return await this.propertiesRepository.getStats(userId)
		} catch (error) {
			this.logger.error('Failed to get property stats via repository', { error, userId })
			// Return zero stats for zero state
			return {
				total: 0,
				occupied: 0,
				vacant: 0,
				occupancyRate: 0,
				totalMonthlyRent: 0,
				averageRent: 0
			}
		}
	}

	/**
	 * Get all properties with their units and analytics
	 * Uses repository pattern with business logic validation
	 */
	async findAllWithUnits(
		userId: string,
		query: { search: string | null; limit: number; offset: number }
	): Promise<PropertyWithUnits[]> {
		try {
			// Business logic: Validate pagination parameters
			const limit = Math.min(Math.max(query.limit || 10, 1), 100) // Limit between 1-100
			const offset = Math.max(query.offset || 0, 0) // Non-negative offset

			return await this.propertiesRepository.findAllWithUnits(userId, {
				search: query.search,
				limit,
				offset
			})
		} catch (error) {
			this.logger.error('Failed to get properties with units via repository', { error, userId, query })
			// Return empty array for zero state
			return []
		}
	}

	/**
	 * Get property performance analytics
	 * Uses repository pattern with business validation
	 */
	async getPropertyPerformanceAnalytics(
		userId: string,
		query: {
			propertyId?: string
			timeframe: string
			limit?: number
		}
	) {
		try {
			// Business logic: Validate timeframe
			const validTimeframes = ['7d', '30d', '90d', '180d', '365d']
			if (!validTimeframes.includes(query.timeframe)) {
				throw new BadRequestException('Invalid timeframe. Must be one of: 7d, 30d, 90d, 180d, 365d')
			}

			// Business logic: Validate limit
			const limit = Math.min(Math.max(query.limit || 10, 1), 50)

			return await this.propertiesRepository.getPerformanceAnalytics(userId, {
				propertyId: query.propertyId,
				timeframe: query.timeframe,
				limit
			})
		} catch (error) {
			this.logger.error('Failed to get performance analytics via repository', { error, userId, query })

			if (error instanceof BadRequestException) {
				throw error
			}

			// Return empty array for zero state
			return []
		}
	}


	/**
	 * Get property occupancy analytics
	 * Uses repository pattern with business validation
	 */
	async getPropertyOccupancyAnalytics(
		userId: string,
		query: { propertyId?: string; period: string }
	) {
		try {
			// Business logic: Validate period
			const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
			if (!validPeriods.includes(query.period)) {
				throw new BadRequestException('Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly')
			}

			return await this.propertiesRepository.getOccupancyAnalytics(userId, {
				propertyId: query.propertyId,
				period: query.period
			})
		} catch (error) {
			this.logger.error('Failed to get occupancy analytics via repository', { error, userId, query })

			if (error instanceof BadRequestException) {
				throw error
			}

			// Return empty array for zero state
			return []
		}
	}

	/**
	 * Get property financial analytics
	 * Uses repository pattern with business validation
	 */
	async getPropertyFinancialAnalytics(
		userId: string,
		query: { propertyId?: string; timeframe: string }
	) {
		try {
			// Business logic: Validate timeframe
			const validTimeframes = ['7d', '30d', '90d', '180d', '365d']
			if (!validTimeframes.includes(query.timeframe)) {
				throw new BadRequestException('Invalid timeframe. Must be one of: 7d, 30d, 90d, 180d, 365d')
			}

			return await this.propertiesRepository.getFinancialAnalytics(userId, {
				propertyId: query.propertyId,
				timeframe: query.timeframe
			})
		} catch (error) {
			this.logger.error('Failed to get financial analytics via repository', { error, userId, query })

			if (error instanceof BadRequestException) {
				throw error
			}

			// Return empty array for zero state
			return []
		}
	}

	/**
	 * Get property maintenance analytics
	 * Uses repository pattern with business validation
	 */
	async getPropertyMaintenanceAnalytics(
		userId: string,
		query: { propertyId?: string; timeframe: string }
	) {
		try {
			// Business logic: Validate timeframe
			const validTimeframes = ['7d', '30d', '90d', '180d', '365d']
			if (!validTimeframes.includes(query.timeframe)) {
				throw new BadRequestException('Invalid timeframe. Must be one of: 7d, 30d, 90d, 180d, 365d')
			}

			return await this.propertiesRepository.getMaintenanceAnalytics(userId, {
				propertyId: query.propertyId,
				timeframe: query.timeframe
			})
		} catch (error) {
			this.logger.error('Failed to get maintenance analytics via repository', { error, userId, query })

			if (error instanceof BadRequestException) {
				throw error
			}

			// Return empty array for zero state
			return []
		}
	}

	/**
	 * Get property units - replaces get_property_units function
	 * Uses repository pattern instead of database function
	 */
	async getPropertyUnits(userId: string, propertyId: string): Promise<unknown[]> {
		try {
			this.logger.log('Getting property units via repository', { userId, propertyId })

			// Business logic: Verify ownership first
			const property = await this.findOne(userId, propertyId)
			if (!property) {
				throw new BadRequestException('Property not found or access denied')
			}

			// Get units for this property via units repository
			return await this.unitsRepository.findByPropertyId(propertyId)
		} catch (error) {
			this.logger.error('Failed to get property units', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				propertyId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			return []
		}
	}

}
