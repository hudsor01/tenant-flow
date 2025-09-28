/**
 * Leases Service - Repository Pattern Implementation
 *
 * - NO ABSTRACTIONS: Service delegates to repository directly
 * - KISS: Simple, focused service methods
 * - DRY: Repository handles data access logic
 * - Production mirror: Matches controller interface exactly
 */

import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common'
import type {
	CreateLeaseRequest,
	UpdateLeaseRequest,
	Lease,
	LeaseStats,
	LeaseInput,
	Database
} from '@repo/shared'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import type { ILeasesRepository, LeaseQueryOptions } from '../repositories/interfaces/leases-repository.interface'

/**
 * Leases service - Repository pattern implementation following KISS principle
 * Clean separation of concerns with repository layer
 */
@Injectable()
export class LeasesService {
	private readonly logger = new Logger(LeasesService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.LEASES)
		private readonly leasesRepository: ILeasesRepository
	) {}

	/**
	 * Get all leases for a user via repository
	 */
	async findAll(userId: string, query: Record<string, unknown>): Promise<Lease[]> {
		try {
			if (!userId) {
				this.logger.warn('Find all leases requested without userId')
				throw new BadRequestException('User ID is required')
			}

			const options: LeaseQueryOptions = {
				search: query.search as string,
				propertyId: query.propertyId as string,
				tenantId: query.tenantId as string,
				status: query.status as Database['public']['Enums']['LeaseStatus'],
				startDate: query.startDate ? new Date(query.startDate as string) : undefined,
				endDate: query.endDate ? new Date(query.endDate as string) : undefined,
				limit: query.limit as number,
				offset: query.offset as number,
				sort: query.sortBy as string,
				order: query.sortOrder as 'asc' | 'desc'
			}

			this.logger.log('Finding all leases via repository', { userId, options })

			return await this.leasesRepository.findByUserIdWithSearch(userId, options)
		} catch (error) {
			this.logger.error('Leases service failed to find all leases', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch leases'
			)
		}
	}

	/**
	 * Get lease statistics via repository
	 */
	async getStats(userId: string): Promise<LeaseStats> {
		try {
			if (!userId) {
				this.logger.warn('Lease stats requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease stats via repository', { userId })

			return await this.leasesRepository.getStats(userId)
		} catch (error) {
			this.logger.error('Leases service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease statistics'
			)
		}
	}

	/**
	 * Get leases expiring soon via repository
	 */
	async getExpiring(userId: string, days: number = 30): Promise<Lease[]> {
		try {
			if (!userId) {
				this.logger.warn('Expiring leases requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting expiring leases via repository', { userId, days })

			return await this.leasesRepository.getExpiringSoon(userId, days)
		} catch (error) {
			this.logger.error('Leases service failed to get expiring leases', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				days
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get expiring leases'
			)
		}
	}

	/**
	 * Find one lease by ID via repository
	 */
	async findOne(userId: string, leaseId: string): Promise<Lease | null> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Find one lease called with missing parameters', { userId, leaseId })
				return null
			}

			this.logger.log('Finding one lease via repository', { userId, leaseId })

			const lease = await this.leasesRepository.findById(leaseId)

			// Note: Lease ownership is verified via property ownership in repository RLS policies

			return lease
		} catch (error) {
			this.logger.error('Leases service failed to find one lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			return null
		}
	}

	/**
	 * Create lease via repository
	 */
	async create(userId: string, createRequest: CreateLeaseRequest): Promise<Lease> {
		try {
			if (!userId || !createRequest.tenantId || !createRequest.unitId) {
				this.logger.warn('Create lease called with missing parameters', { userId, createRequest })
				throw new BadRequestException('User ID, tenant ID, and unit ID are required')
			}

			this.logger.log('Creating lease via repository', { userId, createRequest })

			// Convert CreateLeaseRequest to LeaseInput
			const leaseData: LeaseInput = {
				tenantId: createRequest.tenantId,
				unitId: createRequest.unitId,
				startDate: createRequest.startDate,
				endDate: createRequest.endDate,
				rentAmount: createRequest.monthlyRent,
				securityDeposit: createRequest.securityDeposit,
				status: createRequest.status || 'DRAFT'
			}

			return await this.leasesRepository.create(userId, leaseData)
		} catch (error) {
			this.logger.error('Leases service failed to create lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				createRequest
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to create lease'
			)
		}
	}

	/**
	 * Update lease via repository
	 */
	async update(userId: string, leaseId: string, updateRequest: UpdateLeaseRequest): Promise<Lease | null> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Update lease called with missing parameters', { userId, leaseId })
				return null
			}

			// Note: Lease ownership is verified via property ownership in repository RLS policies

			this.logger.log('Updating lease via repository', { userId, leaseId, updateRequest })

			return await this.leasesRepository.update(leaseId, updateRequest)
		} catch (error) {
			this.logger.error('Leases service failed to update lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId,
				updateRequest
			})
			return null
		}
	}

	/**
	 * Remove lease via repository
	 */
	async remove(userId: string, leaseId: string): Promise<void> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Remove lease called with missing parameters', { userId, leaseId })
				throw new BadRequestException('User ID and lease ID are required')
			}

			this.logger.log('Removing lease via repository', { userId, leaseId })

			const result = await this.leasesRepository.softDelete(userId, leaseId)

			if (!result.success) {
				throw new BadRequestException(result.message)
			}
		} catch (error) {
			this.logger.error('Leases service failed to remove lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to remove lease'
			)
		}
	}

	/**
	 * Renew lease via repository
	 */
	async renew(userId: string, leaseId: string, renewalData: Partial<LeaseInput>): Promise<Lease> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Renew lease called with missing parameters', { userId, leaseId })
				throw new BadRequestException('User ID and lease ID are required')
			}

			// Note: Lease ownership is verified via property ownership in repository RLS policies

			this.logger.log('Renewing lease via repository', { userId, leaseId, renewalData })

			return await this.leasesRepository.renewLease(leaseId, renewalData)
		} catch (error) {
			this.logger.error('Leases service failed to renew lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId,
				renewalData
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to renew lease'
			)
		}
	}

	/**
	 * Terminate lease via repository
	 */
	async terminate(userId: string, leaseId: string, terminationDate: Date, reason?: string): Promise<Lease | null> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Terminate lease called with missing parameters', { userId, leaseId })
				return null
			}

			// Note: Lease ownership is verified via property ownership in repository RLS policies

			this.logger.log('Terminating lease via repository', { userId, leaseId, terminationDate, reason })

			return await this.leasesRepository.terminateLease(leaseId, terminationDate, reason)
		} catch (error) {
			this.logger.error('Leases service failed to terminate lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId,
				terminationDate,
				reason
			})
			return null
		}
	}

	/**
	 * Get lease analytics via repository
	 */
	async getAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease analytics via repository', { userId, options })

			return await this.leasesRepository.getAnalytics(userId, options)
		} catch (error) {
			this.logger.error('Leases service failed to get analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease analytics'
			)
		}
	}

	/**
	 * Get lease payment history via repository
	 */
	async getPaymentHistory(userId: string, leaseId: string): Promise<unknown[]> {
		try {
			if (!userId || !leaseId) {
				this.logger.warn('Payment history requested with missing parameters', { userId, leaseId })
				throw new BadRequestException('User ID and lease ID are required')
			}

			// Note: Lease ownership is verified via property ownership in repository RLS policies

			this.logger.log('Getting lease payment history via repository', { userId, leaseId })

			return await this.leasesRepository.getPaymentHistory(leaseId)
		} catch (error) {
			this.logger.error('Leases service failed to get payment history', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				leaseId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get payment history'
			)
		}
	}

	/**
	 * Get lease performance analytics via repository
	 */
	async getLeasePerformanceAnalytics(userId: string, options: { leaseId?: string; propertyId?: string; timeframe: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease performance analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease performance analytics via repository', { userId, options })

			return await this.leasesRepository.getAnalytics(userId, options)
		} catch (error) {
			this.logger.error('Leases service failed to get performance analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease performance analytics'
			)
		}
	}

	/**
	 * Get lease duration analytics via repository
	 */
	async getLeaseDurationAnalytics(userId: string, options: { propertyId?: string; period: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease duration analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease duration analytics via repository', { userId, options })

			return await this.leasesRepository.getAnalytics(userId, { ...options, timeframe: options.period })
		} catch (error) {
			this.logger.error('Leases service failed to get duration analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease duration analytics'
			)
		}
	}

	/**
	 * Get lease turnover analytics via repository
	 */
	async getLeaseTurnoverAnalytics(userId: string, options: { propertyId?: string; timeframe: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease turnover analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease turnover analytics via repository', { userId, options })

			return await this.leasesRepository.getAnalytics(userId, options)
		} catch (error) {
			this.logger.error('Leases service failed to get turnover analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease turnover analytics'
			)
		}
	}

	/**
	 * Get lease revenue analytics via repository
	 */
	async getLeaseRevenueAnalytics(userId: string, options: { leaseId?: string; propertyId?: string; period: string }): Promise<unknown[]> {
		try {
			if (!userId) {
				this.logger.warn('Lease revenue analytics requested without userId')
				throw new BadRequestException('User ID is required')
			}

			this.logger.log('Getting lease revenue analytics via repository', { userId, options })

			return await this.leasesRepository.getAnalytics(userId, { ...options, timeframe: options.period })
		} catch (error) {
			this.logger.error('Leases service failed to get revenue analytics', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				options
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to get lease revenue analytics'
			)
		}
	}
}