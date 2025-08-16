import { Injectable } from '@nestjs/common'
import { Lease, Prisma } from '@repo/database'
import { LeaseRepository } from './lease.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import {
	BaseCrudService,
	BaseStats
} from '../common/services/base-crud.service'
import {
	InvalidLeaseDatesException,
	LeaseConflictException
} from '../common/exceptions/lease.exceptions'
import { CreateLeaseDto, LeaseQueryDto, UpdateLeaseDto } from './dto'

@Injectable()
export class LeasesService extends BaseCrudService<
	Lease,
	CreateLeaseDto,
	UpdateLeaseDto,
	LeaseQueryDto,
	Prisma.LeaseCreateInput,
	Prisma.LeaseUpdateInput,
	Prisma.LeaseWhereInput
> {
	protected readonly entityName = 'lease'
	protected readonly repository: LeaseRepository

	constructor(
		private readonly leaseRepository: LeaseRepository,
		errorHandler: ErrorHandlerService
	) {
		super(errorHandler)
		this.repository = leaseRepository
	}

	// ========================================
	// BaseCrudService Implementation
	// ========================================

	protected async findByIdAndOwner(
		id: string,
		ownerId: string
	): Promise<Lease | null> {
		return this.leaseRepository.findByIdAndOwner(id, ownerId)
	}

	protected async calculateStats(ownerId: string): Promise<BaseStats> {
		return this.leaseRepository.getStatsByOwner(ownerId)
	}

	protected prepareCreateData(
		data: CreateLeaseDto,
		_ownerId: string
	): Prisma.LeaseCreateInput {
		const { unitId, tenantId, ...restData } = data

		return {
			...restData,
			startDate: new Date(data.startDate),
			endDate: new Date(data.endDate),
			rentAmount: data.monthlyRent, // Use monthlyRent as rentAmount
			Tenant: {
				connect: { id: tenantId }
			},
			Unit: {
				connect: { id: unitId }
			}
		}
	}

	protected prepareUpdateData(data: UpdateLeaseDto): Prisma.LeaseUpdateInput {
		const updateData: Prisma.LeaseUpdateInput = {
			...data,
			updatedAt: new Date()
		}

		if (data.startDate) {
			updateData.startDate = new Date(data.startDate)
		}
		if (data.endDate) {
			updateData.endDate = new Date(data.endDate)
		}

		return updateData
	}

	protected createOwnerWhereClause(
		id: string,
		ownerId: string
	): Prisma.LeaseWhereInput {
		return {
			id,
			Unit: {
				Property: {
					ownerId
				}
			}
		}
	}

	/**
	 * Validate lease dates
	 */
	private validateLeaseDates(
		startDate: string,
		endDate: string,
		leaseId?: string
	): void {
		const start = new Date(startDate)
		const end = new Date(endDate)

		if (end <= start) {
			throw new InvalidLeaseDatesException(
				leaseId || 'new',
				startDate,
				endDate
			)
		}
	}

	override async create(
		data: CreateLeaseDto,
		ownerId: string
	): Promise<Lease> {
		// Convert dates to strings for validation
		const startDateStr =
			data.startDate instanceof Date
				? data.startDate.toISOString()
				: data.startDate
		const endDateStr =
			data.endDate instanceof Date
				? data.endDate.toISOString()
				: data.endDate

		// Validate lease dates
		this.validateLeaseDates(startDateStr, endDateStr)

		// Check for lease conflicts
		const hasConflict = await this.leaseRepository.checkLeaseConflict(
			data.unitId,
			new Date(data.startDate),
			new Date(data.endDate)
		)

		if (hasConflict) {
			throw new LeaseConflictException(
				data.unitId,
				startDateStr,
				endDateStr
			)
		}

		// Use base class create with additional validation
		return super.create(data, ownerId)
	}

	override async update(
		id: string,
		data: UpdateLeaseDto,
		ownerId: string
	): Promise<Lease> {
		// Get existing lease for validation
		const existingLease = await this.getByIdOrThrow(id, ownerId)

		// Validate dates if provided
		if (data.startDate || data.endDate) {
			const startDate =
				data.startDate instanceof Date
					? data.startDate.toISOString()
					: data.startDate || existingLease.startDate.toISOString()
			const endDate =
				data.endDate instanceof Date
					? data.endDate.toISOString()
					: data.endDate || existingLease.endDate.toISOString()
			this.validateLeaseDates(startDate, endDate, id)

			// Check for conflicts if dates changed
			if (data.startDate || data.endDate) {
				const hasConflict =
					await this.leaseRepository.checkLeaseConflict(
						existingLease.unitId,
						new Date(startDate),
						new Date(endDate),
						id // Exclude current lease from conflict check
					)

				if (hasConflict) {
					throw new LeaseConflictException(
						existingLease.unitId,
						startDate,
						endDate
					)
				}
			}
		}

		// Use base class update
		return super.update(id, data, ownerId)
	}

	// ========================================
	// Lease-Specific Methods
	// ========================================

	/**
	 * Find leases by unit - uses repository-specific implementation
	 */
	async getByUnit(
		unitId: string,
		ownerId: string,
		query?: LeaseQueryDto
	): Promise<Lease[]> {
		if (!unitId || !ownerId) {
			throw new Error('Unit ID and Owner ID are required')
		}

		// Convert Date objects to strings for repository compatibility
		const repositoryQuery = query
			? {
					...query,
					startDateFrom:
						query.startDateFrom instanceof Date
							? query.startDateFrom.toISOString()
							: query.startDateFrom,
					startDateTo:
						query.startDateTo instanceof Date
							? query.startDateTo.toISOString()
							: query.startDateTo,
					endDateFrom:
						query.endDateFrom instanceof Date
							? query.endDateFrom.toISOString()
							: query.endDateFrom,
					endDateTo:
						query.endDateTo instanceof Date
							? query.endDateTo.toISOString()
							: query.endDateTo
				}
			: undefined

		try {
			return (await this.leaseRepository.findByUnit(
				unitId,
				ownerId,
				repositoryQuery
			)) as Lease[]
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getByUnit',
				resource: this.entityName,
				metadata: { unitId, ownerId }
			})
		}
	}

	/**
	 * Find leases by tenant - uses repository-specific implementation
	 */
	async getByTenant(
		tenantId: string,
		ownerId: string,
		query?: LeaseQueryDto
	): Promise<Lease[]> {
		if (!tenantId || !ownerId) {
			throw new Error('Tenant ID and Owner ID are required')
		}

		// Convert Date objects to strings for repository compatibility
		const repositoryQuery = query
			? {
					...query,
					startDateFrom:
						query.startDateFrom instanceof Date
							? query.startDateFrom.toISOString()
							: query.startDateFrom,
					startDateTo:
						query.startDateTo instanceof Date
							? query.startDateTo.toISOString()
							: query.startDateTo,
					endDateFrom:
						query.endDateFrom instanceof Date
							? query.endDateFrom.toISOString()
							: query.endDateFrom,
					endDateTo:
						query.endDateTo instanceof Date
							? query.endDateTo.toISOString()
							: query.endDateTo
				}
			: undefined

		try {
			return (await this.leaseRepository.findByTenant(
				tenantId,
				ownerId,
				repositoryQuery
			)) as Lease[]
		} catch (error) {
			throw this.errorHandler.handleErrorEnhanced(error as Error, {
				operation: 'getByTenant',
				resource: this.entityName,
				metadata: { tenantId, ownerId }
			})
		}
	}
}
