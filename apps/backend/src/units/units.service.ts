/**
 * Units Service - Repository Pattern Implementation
 *
 * - NO ABSTRACTIONS: Service delegates to repository directly
 * - KISS: Simple, focused service methods
 * - DRY: Repository handles data access logic
 * - Production mirror: Matches controller interface exactly
 */

import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common'
import type {
	CreateUnitRequest,
	UpdateUnitRequest,
	Unit,
	UnitStats,
	UnitInput,
	Database
} from '@repo/shared'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import type { IUnitsRepository, UnitQueryOptions } from '../repositories/interfaces/units-repository.interface'

@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.UNITS)
		private readonly unitsRepository: IUnitsRepository
	) {}

	/**
	 * Get all units for a user via repository
	 */
	async findAll(userId: string, query: Record<string, unknown>): Promise<Unit[]> {
		try {
			if (!userId) {
				this.logger.warn('Find all units requested without userId')
				throw new BadRequestException('User ID is required')
			}

			const options: UnitQueryOptions = {
				search: query.search as string,
				propertyId: query.propertyId as string,
				status: query.status as Database['public']['Enums']['UnitStatus'],
				type: query.type as string,
				limit: query.limit as number,
				offset: query.offset as number,
				sort: query.sortBy as string,
				order: query.sortOrder as 'asc' | 'desc'
			}

			this.logger.log('Finding all units via repository', { userId, options })

			return await this.unitsRepository.findByUserIdWithSearch(userId, options)
		} catch (error) {
			this.logger.error('Units service failed to find all units', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch units'
			)
		}
	}

	/**
	 * Get unit statistics via repository
	 */
	async getStats(userId: string): Promise<UnitStats> {
		try {
			if (!userId) {
				this.logger.warn('Unit stats requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting unit stats via repository', { userId })

			return await this.unitsRepository.getStats(userId)
		} catch (error) {
			this.logger.error('Units service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get unit statistics'
			)
		}
	}

	/**
	 * Get units by property via repository
	 */
	async findByProperty(userId: string, propertyId: string): Promise<Unit[]> {
		try {
			if (!userId || !propertyId) {
				this.logger.warn('Find by property called with missing parameters', { userId, propertyId })
				throw new BadRequestException('User ID and property ID are required')
			}

			this.logger.log('Finding units by property via repository', { userId, propertyId })

			return await this.unitsRepository.findByPropertyId(propertyId)
		} catch (error) {
			this.logger.error('Units service failed to find units by property', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				propertyId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to retrieve property units'
			)
		}
	}

	/**
	 * Find one unit by ID via repository
	 */
	async findOne(userId: string, unitId: string): Promise<Unit | null> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Find one unit called with missing parameters', { userId, unitId })
				return null
			}

			this.logger.log('Finding one unit via repository', { userId, unitId })

			const unit = await this.unitsRepository.findById(unitId)

			// Note: Unit ownership is verified via property ownership in repository RLS policies

			return unit
		} catch (error) {
			this.logger.error('Units service failed to find one unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId
			})
			return null
		}
	}

	/**
	 * Create unit via repository
	 */
	async create(userId: string, createRequest: CreateUnitRequest): Promise<Unit> {
		try {
			if (!userId || !createRequest.propertyId || !createRequest.unitNumber) {
				this.logger.warn('Create unit called with missing parameters', { userId, createRequest })
				throw new BadRequestException('User ID, property ID, and unit number are required')
			}

			this.logger.log('Creating unit via repository', { userId, createRequest })

			// Convert CreateUnitRequest to UnitInput
			const unitData: UnitInput = {
				propertyId: createRequest.propertyId,
				unitNumber: createRequest.unitNumber,
				bedrooms: createRequest.bedrooms || 1,
				bathrooms: createRequest.bathrooms || 1,
				squareFeet: createRequest.squareFeet,
				rent: createRequest.rent || createRequest.rentAmount || 0
			}

			return await this.unitsRepository.create(userId, unitData)
		} catch (error) {
			this.logger.error('Units service failed to create unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				createRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create unit'
			)
		}
	}

	/**
	 * Update unit via repository
	 */
	async update(userId: string, unitId: string, updateRequest: UpdateUnitRequest): Promise<Unit | null> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Update unit called with missing parameters', { userId, unitId })
				return null
			}

			// Note: Unit ownership is verified via property ownership in repository RLS policies

			this.logger.log('Updating unit via repository', { userId, unitId, updateRequest })

			return await this.unitsRepository.update(unitId, updateRequest)
		} catch (error) {
			this.logger.error('Units service failed to update unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId,
				updateRequest
			})
			return null
		}
	}

	/**
	 * Remove unit via repository
	 */
	async remove(userId: string, unitId: string): Promise<void> {
		try {
			if (!userId || !unitId) {
				this.logger.warn('Remove unit called with missing parameters', { userId, unitId })
				throw new BadRequestException('User ID and unit ID are required')
			}

			this.logger.log('Removing unit via repository', { userId, unitId })

			const result = await this.unitsRepository.softDelete(userId, unitId)

			if (!result.success) {
				throw new BadRequestException(result.message)
			}
		} catch (error) {
			this.logger.error('Units service failed to remove unit', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove unit'
			)
		}
	}

	/**
	 * Get units analytics via repository
	 */
	async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Unit analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting unit analytics via repository', { userId, options })

			return await this.unitsRepository.getAnalytics(userId, options)
		} catch (error) {
			this.logger.error('Units service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get unit analytics'
			)
		}
	}

	/**
	 * Get available units for a property via repository
	 */
	async getAvailable(propertyId: string): Promise<Unit[]> {
		try {
			if (!propertyId) {
				this.logger.warn('Available units requested without propertyId')
				throw new BadRequestException('Property ID is required')
			}

			this.logger.log('Getting available units via repository', { propertyId })

			return await this.unitsRepository.getAvailableUnits(propertyId)
		} catch (error) {
			this.logger.error('Units service failed to get available units', {
				error: error instanceof Error ? error.message : String(error),
				propertyId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get available units'
			)
		}
	}

	/**
	 * Update unit status via repository
	 */
	async updateStatus(userId: string, unitId: string, status: Database['public']['Enums']['UnitStatus']): Promise<Unit | null> {
		try {
			if (!userId || !unitId || !status) {
				this.logger.warn('Update unit status called with missing parameters', { userId, unitId, status })
				return null
			}

			// Note: Unit ownership is verified via property ownership in repository RLS policies

			this.logger.log('Updating unit status via repository', { userId, unitId, status })

			return await this.unitsRepository.updateStatus(unitId, status)
		} catch (error) {
			this.logger.error('Units service failed to update unit status', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				unitId,
				status
			})
			return null
		}
	}
}
