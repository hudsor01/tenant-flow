import { Injectable, Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase-generated'
import {
	LeaseQueryOptions,
	LeaseSupabaseRepository,
	LeaseWithRelations
} from './lease-supabase.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { ValidationException } from '../common/exceptions/base.exception'
import {
	InvalidLeaseDatesException,
	LeaseConflictException
} from '../common/exceptions/lease.exceptions'
import { CreateLeaseDto, UpdateLeaseDto } from './dto'

type LeaseInsert = Database['public']['Tables']['Lease']['Insert']
type LeaseUpdate = Database['public']['Tables']['Lease']['Update']

/**
 * Leases service using Supabase
 * Handles lease management with property ownership validation through units
 */
@Injectable()
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)

	constructor(
		private readonly repository: LeaseSupabaseRepository,
		private readonly errorHandler: ErrorHandlerService
	) {}

	/**
	 * Create a new lease with validation
	 */
	async create(
		data: CreateLeaseDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations> {
		try {
			// Validate lease dates
			this.validateLeaseDates(data.startDate, data.endDate)

			const leaseData: LeaseInsert = {
				unitId: data.unitId,
				tenantId: data.tenantId,
				startDate: new Date(data.startDate).toISOString(),
				endDate: new Date(data.endDate).toISOString(),
				rentAmount: data.rentAmount,
				securityDeposit: data.securityDeposit,
				status: (data.status || 'DRAFT') as LeaseInsert['status'],
				terms: data.leaseTerms,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			const lease = await this.repository.createWithValidation(
				leaseData,
				ownerId,
				userId,
				userToken
			)

			this.logger.log('Lease created successfully', {
				leaseId: lease.id,
				unitId: data.unitId,
				tenantId: data.tenantId,
				ownerId
			})

			return lease
		} catch (error) {
			this.logger.error('Failed to create lease:', error)

			// Handle specific lease conflict errors
			if (
				error instanceof Error &&
				error.message.includes('overlapping')
			) {
				throw new LeaseConflictException(
					data.unitId,
					data.startDate.toString(),
					data.endDate.toString()
				)
			}

			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'create',
				resource: 'lease',
				metadata: {
					unitId: data.unitId,
					tenantId: data.tenantId,
					ownerId
				}
			})
		}
	}

	/**
	 * Validate lease dates
	 */
	private validateLeaseDates(
		startDate: string | Date,
		endDate: string | Date,
		leaseId?: string
	): void {
		const start = new Date(startDate)
		const end = new Date(endDate)

		if (end <= start) {
			throw new InvalidLeaseDatesException(
				leaseId || 'new',
				startDate.toString(),
				endDate.toString()
			)
		}
	}

	/**
	 * Find lease by ID
	 */
	async findById(
		id: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations> {
		try {
			const lease = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!lease) {
				throw new Error('Lease not found')
			}

			return lease
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findById',
				resource: 'lease',
				metadata: { leaseId: id, ownerId }
			})
		}
	}

	/**
	 * Get all leases for an owner
	 */
	async findByOwner(
		ownerId: string,
		options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			if (
				!ownerId ||
				typeof ownerId !== 'string' ||
				ownerId.trim().length === 0
			) {
				throw new ValidationException('Owner ID is required', 'ownerId')
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByOwner',
				resource: 'lease',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Alias for findByOwner to match controller expectations
	 */
	async getByOwner(
		ownerId: string,
		options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		return this.findByOwner(ownerId, options, userId, userToken)
	}

	/**
	 * Alias for findByUnit to match controller expectations
	 */
	async getByUnit(
		unitId: string,
		ownerId: string,
		_options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		// TODO: Add support for options in findByUnit
		return this.findByUnit(unitId, ownerId, userId, userToken)
	}

	/**
	 * Alias for findByTenant to match controller expectations
	 */
	async getByTenant(
		tenantId: string,
		ownerId: string,
		_options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		// TODO: Add support for options in findByTenant
		return this.findByTenant(tenantId, ownerId, userId, userToken)
	}

	/**
	 * Update lease
	 */
	async update(
		id: string,
		data: UpdateLeaseDto,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations> {
		try {
			// Get existing lease for validation
			const existing = await this.repository.findByIdAndOwner(
				id,
				ownerId,
				true,
				userId,
				userToken
			)

			if (!existing) {
				throw new Error('Lease not found')
			}

			// Validate dates if provided
			if (data.startDate || data.endDate) {
				const startDate = data.startDate || existing.startDate
				const endDate = data.endDate || existing.endDate
				this.validateLeaseDates(startDate, endDate, id)
			}

			const updateData: LeaseUpdate = {
				updatedAt: new Date().toISOString()
			}

			// Convert dates if provided
			if (data.startDate) {
				updateData.startDate = new Date(data.startDate).toISOString()
			}
			if (data.endDate) {
				updateData.endDate = new Date(data.endDate).toISOString()
			}
			if (data.status) {
				updateData.status = data.status as LeaseUpdate['status']
			}
			if (data.rentAmount !== undefined) {
				updateData.rentAmount = data.rentAmount
			}
			if (data.securityDeposit !== undefined) {
				updateData.securityDeposit = data.securityDeposit
			}
			if (data.leaseTerms) {
				updateData.terms = data.leaseTerms
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Lease updated successfully', {
				leaseId: id,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'update',
				resource: 'lease',
				metadata: { leaseId: id, ownerId }
			})
		}
	}

	/**
	 * Delete lease
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
				throw new Error('Lease not found')
			}

			await this.repository.delete(id, userId, userToken)

			this.logger.log('Lease deleted successfully', {
				leaseId: id,
				ownerId
			})
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'delete',
				resource: 'lease',
				metadata: { leaseId: id, ownerId }
			})
		}
	}

	/**
	 * Get lease statistics for owner
	 */
	async getStats(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<{
		total: number
		active: number
		expired: number
		terminated: number
		pending: number
		draft: number
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
				resource: 'lease',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Find leases by unit
	 */
	async findByUnit(
		unitId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			if (!unitId || !ownerId) {
				throw new ValidationException(
					'Unit ID and Owner ID are required'
				)
			}

			return await this.repository.findByUnit(
				unitId,
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByUnit',
				resource: 'lease',
				metadata: { unitId, ownerId }
			})
		}
	}

	/**
	 * Find leases by tenant
	 */
	async findByTenant(
		tenantId: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			if (!tenantId || !ownerId) {
				throw new ValidationException(
					'Tenant ID and Owner ID are required'
				)
			}

			return await this.repository.findByTenant(
				tenantId,
				ownerId,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findByTenant',
				resource: 'lease',
				metadata: { tenantId, ownerId }
			})
		}
	}

	/**
	 * Find expiring leases
	 */
	async findExpiringLeases(
		ownerId: string,
		days = 30,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			return await this.repository.findExpiringLeases(
				ownerId,
				days,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'findExpiringLeases',
				resource: 'lease',
				metadata: { ownerId, days }
			})
		}
	}

	/**
	 * Search leases by text
	 */
	async search(
		ownerId: string,
		searchTerm: string,
		options: LeaseQueryOptions = {},
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
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
				resource: 'lease',
				metadata: { ownerId, searchTerm }
			})
		}
	}

	/**
	 * Get active leases only
	 */
	async getActiveLeases(
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations[]> {
		try {
			const options: LeaseQueryOptions = {
				status: 'ACTIVE'
			}

			return await this.repository.findByOwnerWithDetails(
				ownerId,
				options,
				userId,
				userToken
			)
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getActiveLeases',
				resource: 'lease',
				metadata: { ownerId }
			})
		}
	}

	/**
	 * Update lease status
	 */
	async updateStatus(
		id: string,
		status: string,
		ownerId: string,
		userId?: string,
		userToken?: string
	): Promise<LeaseWithRelations> {
		try {
			// Validate status
			const validStatuses = [
				'DRAFT',
				'ACTIVE',
				'EXPIRED',
				'TERMINATED',
				'PENDING'
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
				throw new Error('Lease not found')
			}

			const updateData: LeaseUpdate = {
				status: status as LeaseUpdate['status'],
				updatedAt: new Date().toISOString()
			}

			const updated = await this.repository.update(
				id,
				updateData,
				userId,
				userToken
			)

			this.logger.log('Lease status updated successfully', {
				leaseId: id,
				newStatus: status,
				ownerId
			})

			return updated
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'updateStatus',
				resource: 'lease',
				metadata: { leaseId: id, status, ownerId }
			})
		}
	}
}