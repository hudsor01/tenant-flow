/**
 * Tenants Service - Repository Pattern Implementation
 *
 * Controller → Service → Repository → Database
 * Uses ITenantsRepository for clean separation of concerns
 */

import { BadRequestException, Injectable, Logger, Inject } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	Tenant,
	CreateTenantRequest,
	UpdateTenantRequest,
	TenantStats
} from '@repo/shared'
import type { ITenantsRepository } from '../repositories/interfaces/tenants-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'
import { TenantCreatedEvent } from '../notifications/events/notification.events'

export interface TenantWithRelations extends Tenant {
	_Lease?: {
		id: string
		startDate: string
		endDate: string
		status: string
		rentAmount: number
		Unit?: {
			id: string
			unitNumber: string
			Property?: {
				id: string
				name: string
				address: string
				ownerId: string
			}
		}
	}[]
}

/**
 * Tenants service - Repository Pattern Implementation
 * Business logic layer that delegates data access to repository
 * Note: Tenants are accessed through property ownership via leases
 */
@Injectable()
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name)

	constructor(
		@Inject(REPOSITORY_TOKENS.TENANTS)
		private readonly tenantsRepository: ITenantsRepository,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Get all tenants for a user via repository
	 */
	async findAll(userId: string, query: Record<string, unknown>): Promise<Tenant[]> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Find all tenants requested without userId')
			throw new BadRequestException('User ID is required')
		}

		try {
			this.logger.log('Finding all tenants via repository', { userId, query })

			// Delegate data access to repository layer
			return await this.tenantsRepository.findByUserIdWithSearch(userId, {
				search: query.search ? String(query.search) : undefined,
				limit: query.limit ? Number(query.limit) : undefined,
				offset: query.offset ? Number(query.offset) : undefined,
				status: query.invitationStatus ? String(query.invitationStatus) : undefined
			})
		} catch (error) {
			this.logger.error('Tenants service failed to find all tenants', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				query
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}
	}

	/**
	 * Get tenant statistics via repository
	 */
	async getStats(userId: string): Promise<TenantStats> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Tenant stats requested without userId')
			throw new BadRequestException('User ID is required')
		}

		try {
			this.logger.log('Getting tenant stats via repository', { userId })

			// Delegate data access to repository layer
			return await this.tenantsRepository.getStats(userId)
		} catch (error) {
			this.logger.error('Tenants service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException('Failed to retrieve tenant statistics')
		}
	}

	/**
	 * Get single tenant via repository
	 */
	async findOne(userId: string, tenantId: string): Promise<Tenant | null> {
		// Business logic: Validate inputs
		if (!userId || !tenantId) {
			this.logger.warn('Find one tenant requested with missing parameters', { userId, tenantId })
			return null
		}

		try {
			this.logger.log('Finding tenant by ID via repository', { userId, tenantId })

			// Delegate data access to repository layer
			const tenant = await this.tenantsRepository.findById(tenantId)

			// Business logic: Verify tenant belongs to user (security check)
			if (tenant && tenant.userId !== userId) {
				this.logger.warn('Unauthorized access attempt to tenant', { userId, tenantId })
				return null
			}

			return tenant
		} catch (error) {
			this.logger.error('Tenants service failed to find one tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})
			return null
		}
	}

	/**
	 * Create tenant via repository
	 */
	async create(userId: string, createRequest: CreateTenantRequest): Promise<Tenant> {
		// Business logic: Validate inputs
		if (!userId || !createRequest.email) {
			this.logger.warn('Create tenant requested with missing parameters', { userId, email: createRequest.email })
			throw new BadRequestException('User ID and email are required')
		}

		try {
			this.logger.log('Creating tenant via repository', { userId, email: createRequest.email })

			// Delegate data access to repository layer
			const tenant = await this.tenantsRepository.create(userId, createRequest)

			// Business logic: Emit tenant created event for notification service
			this.eventEmitter.emit(
				'tenant.created',
				new TenantCreatedEvent(
					userId,
					tenant.id,
					tenant.firstName && tenant.lastName ? `${tenant.firstName} ${tenant.lastName}` : tenant.email,
					tenant.email,
					`New tenant ${tenant.firstName && tenant.lastName ? `${tenant.firstName} ${tenant.lastName}` : tenant.email} has been added to your property`
				)
			)

			return tenant
		} catch (error) {
			this.logger.error('Tenants service failed to create tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				email: createRequest.email
			})
			throw new BadRequestException('Failed to create tenant')
		}
	}

	/**
	 * Update tenant via repository
	 */
	async update(
		userId: string,
		tenantId: string,
		updateRequest: UpdateTenantRequest
	): Promise<Tenant | null> {
		// Business logic: Validate inputs
		if (!userId || !tenantId) {
			this.logger.warn('Update tenant requested with missing parameters', { userId, tenantId })
			return null
		}

		try {
			this.logger.log('Updating tenant via repository', { userId, tenantId })

			// Business logic: Verify tenant belongs to user before updating
			const existingTenant = await this.tenantsRepository.findById(tenantId)
			if (!existingTenant || existingTenant.userId !== userId) {
				this.logger.warn('Unauthorized update attempt on tenant', { userId, tenantId })
				return null
			}

			// Delegate data access to repository layer
			return await this.tenantsRepository.update(tenantId, updateRequest)
		} catch (error) {
			this.logger.error('Tenants service failed to update tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})
			return null
		}
	}

	/**
	 * Delete tenant via repository (soft delete)
	 */
	async remove(userId: string, tenantId: string): Promise<void> {
		// Business logic: Validate inputs
		if (!userId || !tenantId) {
			this.logger.warn('Remove tenant requested with missing parameters', { userId, tenantId })
			throw new BadRequestException('User ID and tenant ID are required')
		}

		try {
			this.logger.log('Removing tenant via repository', { userId, tenantId })

			// Delegate data access to repository layer
			const result = await this.tenantsRepository.softDelete(userId, tenantId)

			if (!result.success) {
				throw new BadRequestException(result.message)
			}
		} catch (error) {
			this.logger.error('Tenants service failed to remove tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})

			if (error instanceof BadRequestException) {
				throw error
			}
			throw new BadRequestException('Failed to delete tenant')
		}
	}

	// NOTE: The following methods use direct RPC calls for specialized business logic
	// These are kept as RPC calls since they involve complex workflows beyond basic CRUD

	/**
	 * Send invitation to tenant using RPC - TODO: Consider moving to separate service
	 */
	async sendInvitation(_userId: string, _tenantId: string) {
		// For now, keeping as RPC call since invitation logic is complex
		// This should potentially be moved to a separate InvitationService
		throw new BadRequestException('Invitation functionality not yet migrated to repository pattern')
	}

	/**
	 * Resend invitation to tenant using RPC - TODO: Consider moving to separate service
	 */
	async resendInvitation(_userId: string, _tenantId: string) {
		// For now, keeping as RPC call since invitation logic is complex
		// This should potentially be moved to a separate InvitationService
		throw new BadRequestException('Invitation functionality not yet migrated to repository pattern')
	}
}
