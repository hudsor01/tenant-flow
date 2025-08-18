import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	UnitQueryOptions,
	UnitsSupabaseRepository,
	UnitWithRelations
} from './units-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { ValidationException } from '../common/exceptions/base.exception'
import { UnitCreateDto, UnitUpdateDto } from './dto'
type UnitInsert = Database['public']['Tables']['Unit']['Insert']
type UnitUpdate = Database['public']['Tables']['Unit']['Update']

/**
 * Units service using Supabase
 * Handles unit management with property ownership validation
 */
@Injectable()
export class UnitsService {
	private readonly logger = new Logger(UnitsService.name)

	constructor(
		private readonly repository: UnitsSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Create a new unit
	 */
	async create(
		data: UnitCreateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations> {
		try {
			// Validate required fields
			if (!data.propertyId) {
				throw new ValidationException('Property ID is required')
			}

			if (!data.unitNumber) {
				throw new ValidationException('Unit number is required')
			}

			const unitData: UnitInsert = {
				unitNumber: data.unitNumber,
				propertyId: data.propertyId,
				bedrooms: data.bedrooms,
				bathrooms: data.bathrooms,
				squareFeet: data.squareFeet,
				rent: data.monthlyRent,
				status: data.status || 'VACANT',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			// TODO: Implement createWithValidation in repository or use alternative approach
			// For now, create the unit directly using Supabase
			const units = await this.repository.createBulkForProperty(
				unitData.propertyId,
				[unitData],
				ownerId,
				userId,
				userToken
			)

			const unit = units[0]
			if (!unit) {
				throw new Error('Failed to create unit')
			}

			this.logger.log('Unit created successfully', {
				unitId: unit.id,
				propertyId: data.propertyId,
				unitNumber: data.unitNumber,
				ownerId
			})

			return unit
		} catch (error) {
			this.logger.error('Failed to create unit:', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'create',
				resource: 'unit',
				metadata: {
					ownerId,
					propertyId: data.propertyId,
					unitNumber: data.unitNumber
				}
			})
		}
	}

	/**
	 * Find unit by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations> {
		try {
			const unit = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!unit) {
				throw new Error('Unit not found')
			}

			return unit
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findById',
				resource: 'unit',
				metadata: { unitId: id, ownerId }
			})
		}
	}

	/**
	 * Get all units for an owner
	 */
	async findByOwner(
		ownerId: string,
		options: UnitQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByOwner',
				resource: 'unit',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Get units by property
	 */
	async findByProperty(
		propertyId: string,
		ownerId: string,
		_options: UnitQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			// TODO: Add support for options in repository method
			return await this.repository.findByProperty(
				propertyId,
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'findByProperty',
				resource: 'unit',
				metadata: { propertyId, ownerId }
			})
		}
	}

	/**
	 * Update unit
	 */
	async update(
		id: string,
		data: UnitUpdateDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations> {
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
				throw new Error('Unit not found')
			}

			const updateData: UnitUpdate = {
				...data,
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Unit updated successfully', {
				unitId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'update',
				resource: 'unit',
				metadata: { unitId: id, ownerId }
			})
		}
	}

	/**
	 * Delete unit (with validation for active leases)
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
				throw new Error('Unit not found')
			}

			// Check for active leases before deletion
			const hasActiveLeases = await this.repository.hasActiveLease(
				id,
				ownerId,
				userId,
				userToken
			)

			if (hasActiveLeases) {
				throw new Error('Cannot delete unit with active leases')
			}

			await this.repository.delete(id, userId, userToken)

			this.logger.log('Unit deleted successfully', {
				unitId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'delete',
				resource: 'unit',
				metadata: { unitId: id, ownerId }
			})
		}
	}

	/**
	 * Get unit statistics for owner
	 */
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		vacant: number
		occupied: number
		maintenance: number
		unavailable: number
		totalRent: number
		averageRent: number
	}> {
		try {
			const stats = await this.repository.getStatsByOwner(
				ownerId,
				userId,
				userToken
			)

			// Map repository stats to expected format
			return {
				total: stats.total,
				vacant: stats.available, // Map 'available' to 'vacant'
				occupied: stats.occupied,
				maintenance: stats.maintenance,
				unavailable: stats.reserved, // Map 'reserved' to 'unavailable'
				totalRent: 0, // TODO: Calculate from actual lease data
				averageRent: 0 // TODO: Calculate from actual lease data
			}
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'getStats',
				resource: 'unit',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Get units by property
	 */
	async getUnitsByProperty(
		propertyId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			const units = await this.repository.findByProperty(
				propertyId,
				ownerId,
				userId,
				userToken
			)

			this.logger.debug(
				`Retrieved ${units.length} units for property ${propertyId}`
			)
			return units
		} catch (error) {
			this.logger.error('Failed to get units by property:', error)
			throw this.errorHandler.handleError(error as Error, {
				operation: 'getUnitsByProperty',
				resource: 'unit',
				metadata: { propertyId }
			})
		}
	}

	/**
	 * Update unit status
	 */
	async updateStatus(
		id: string,
		status: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations> {
		try {
			// Validate status
			const validStatuses = [
				'VACANT',
				'OCCUPIED',
				'MAINTENANCE',
				'UNAVAILABLE'
			]
			if (!validStatuses.includes(status)) {
				throw new ValidationException(`Invalid status: ${status}`)
			}

			// Verify ownership first
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				false,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Unit not found')
			}

			// If setting to occupied, validate there's an active lease
			if (status === 'OCCUPIED') {
				const hasActiveLease = await this.repository.hasActiveLease(
					id,
					ownerId,
					userId,
					userToken
				)

				if (!hasActiveLease) {
					throw new ValidationException(
						'Cannot mark unit as occupied without an active lease'
					)
				}
			}

			const updateData: UnitUpdate = {
				status: status as
					| 'MAINTENANCE'
					| 'VACANT'
					| 'OCCUPIED'
					| 'RESERVED',
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Unit status updated successfully', {
				unitId: id,
				newStatus: status,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'updateStatus',
				resource: 'unit',
				metadata: { unitId: id, status, ownerId }
			})
		}
	}

	/**
	 * Bulk update unit statuses
	 */
	async bulkUpdateStatus(
		unitIds: string[],
		status: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			// Validate status
			const validStatuses = [
				'VACANT',
				'OCCUPIED',
				'MAINTENANCE',
				'UNAVAILABLE'
			]
			if (!validStatuses.includes(status)) {
				throw new ValidationException(`Invalid status: ${status}`)
			}

			if (!unitIds || unitIds.length === 0) {
				throw new ValidationException('Unit IDs are required')
			}

			if (unitIds.length > 100) {
				throw new ValidationException('Too many units (max 100)')
			}

			// TODO: Implement bulk update - for now update one by one
			const results = await Promise.all(
				unitIds.map(id =>
					this.repository.updateStatus(
						id,
						status,
						ownerId,
						userId,
						userToken
					)
				)
			)

			this.logger.log('Units bulk status update completed', {
				unitCount: unitIds.length,
				newStatus: status,
				ownerId
			})

			return results
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'bulkUpdateStatus',
				resource: 'unit',
				metadata: { unitCount: unitIds.length, status, ownerId }
			})
		}
	}

	/**
	 * Get vacant units for a property
	 */
	async getVacantUnits(
		propertyId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
		try {
			// TODO: Add support for filtering by status in repository method
			// For now, fetch all units and filter in memory
			const allUnits = await this.repository.findByProperty(
				propertyId,
				ownerId,
				userId,
				userToken
			)

			// Filter for vacant units
			return allUnits.filter(unit => unit.status === 'VACANT')
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'getVacantUnits',
				resource: 'unit',
				metadata: { propertyId, ownerId }
			})
		}
	}

	/**
	 * Search units by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: UnitQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<UnitWithRelations[]> {
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
			throw this.errorHandler.handleError(error as Error, {
				operation: 'search',
				resource: 'unit',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Check if unit number exists in property
	 */
	async checkUnitNumberExists(
		propertyId: string,
		unitNumber: string,
		ownerId: string,
		excludeUnitId?: string,
		userId?: string,
		userToken?: string
	): Promise<boolean> {
		try {
			// TODO: Implement findByUnitNumber in repository
			// For now, fetch all units for the property and filter
			const units = await this.repository.findByProperty(
				propertyId,
				ownerId,
				userId,
				userToken
			)
			const existing = units.find(u => u.unitNumber === unitNumber)

			if (!existing) {
				return false
			}

			// If excluding a specific unit (for updates), check if it's a different unit
			if (excludeUnitId && existing.id === excludeUnitId) {
				return false
			}

			return true
		} catch (error) {
			throw this.errorHandler.handleError(error as Error, {
				operation: 'checkUnitNumberExists',
				resource: 'unit',
				metadata: { propertyId, unitNumber, ownerId }
			})
		}
	}
}
