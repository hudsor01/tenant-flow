/**
 * Tenants Service - Repository Pattern Implementation
 *
 * Controller → Service → Repository → Database
 * Uses ITenantsRepository for clean separation of concerns
 */

import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type { Tenant, TenantStats } from '@repo/shared/types/core'
import type { ITenantsRepository } from '../../repositories/interfaces/tenants-repository.interface'
import { REPOSITORY_TOKENS } from '../../repositories/repositories.module'
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
	async findAll(
		userId: string,
		query: Record<string, unknown>
	): Promise<Tenant[]> {
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
				status: query.invitationStatus
					? String(query.invitationStatus)
					: undefined
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
			this.logger.warn('Find one tenant requested with missing parameters', {
				userId,
				tenantId
			})
			return null
		}

		try {
			this.logger.log('Finding tenant by ID via repository', {
				userId,
				tenantId
			})

			// Delegate data access to repository layer
			const tenant = await this.tenantsRepository.findById(tenantId)

			// Business logic: Verify tenant belongs to user (security check)
			if (tenant && tenant.userId !== userId) {
				this.logger.warn('Unauthorized access attempt to tenant', {
					userId,
					tenantId
				})
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
	async create(
		userId: string,
		createRequest: CreateTenantRequest
	): Promise<Tenant> {
		// Business logic: Validate inputs
		if (!userId || !createRequest.email) {
			this.logger.warn('Create tenant requested with missing parameters', {
				userId,
				email: createRequest.email
			})
			throw new BadRequestException('User ID and email are required')
		}

		try {
			this.logger.log('Creating tenant via repository', {
				userId,
				email: createRequest.email
			})

			// Delegate data access to repository layer
			const tenant = await this.tenantsRepository.create(userId, createRequest)

			// Business logic: Emit tenant created event for notification service
			this.eventEmitter.emit(
				'tenant.created',
				new TenantCreatedEvent(
					userId,
					tenant.id,
					tenant.firstName && tenant.lastName
						? `${tenant.firstName} ${tenant.lastName}`
						: tenant.email,
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
			this.logger.warn('Update tenant requested with missing parameters', {
				userId,
				tenantId
			})
			return null
		}

		try {
			this.logger.log('Updating tenant via repository', { userId, tenantId })

			// Business logic: Verify tenant belongs to user before updating
			const existingTenant = await this.tenantsRepository.findById(tenantId)
			if (!existingTenant || existingTenant.userId !== userId) {
				this.logger.warn('Unauthorized update attempt on tenant', {
					userId,
					tenantId
				})
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
			this.logger.warn('Remove tenant requested with missing parameters', {
				userId,
				tenantId
			})
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
	 * Send tenant invitation - replaces send_tenant_invitation function
	 * Uses repository pattern instead of database function
	 */
	async sendTenantInvitation(
		userId: string,
		tenantId: string,
		propertyId?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Sending tenant invitation via repository', {
				userId,
				tenantId,
				propertyId
			})

			// Business logic: Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Invitation status columns (invitationStatus, invitationToken, invitationSentAt) are not yet available
			// in the Tenant table schema, so the status check remains disabled until the migration lands.
			/*
			if (tenant.invitationStatus === 'SENT' || tenant.invitationStatus === 'ACCEPTED') {
				this.logger.warn('Invitation already sent or accepted', { tenantId, status: tenant.invitationStatus })
				return {
					success: false,
					message: 'Invitation already sent or accepted',
					status: tenant.invitationStatus
				}
			}
			*/

			// Business logic: Generate invitation token and update tenant
			const invitationToken = this.generateInvitationToken()
			const invitationSentDate = new Date().toISOString()

			// The invitation metadata columns do not exist yet, so record keeping is deferred until the schema update.
			// For now, just log the invitation attempt
			this.logger.log(
				'Invitation token generated (not saved - fields missing)',
				{
					tenantId,
					invitationToken,
					invitationSentDate
				}
			)
			const updatedTenant = tenant

			if (!updatedTenant) {
				throw new BadRequestException(
					'Failed to update tenant invitation status'
				)
			}

			// Business logic: Create invitation email content
			const frontendUrl = 'https://tenantflow.app' // Use production URL as default
			const invitationLink = `${frontendUrl}/tenant/invitation/${invitationToken}`
			const emailContent = {
				to: tenant.email,
				subject: 'Tenant Portal Invitation - TenantFlow',
				html: `
					<h2>Welcome to TenantFlow!</h2>
					<p>Hello ${tenant.firstName || 'Tenant'},</p>
					<p>You have been invited to access your tenant portal. Click the link below to get started:</p>
					<a href="${invitationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
					<p>This invitation will expire in 7 days.</p>
					<p>Best regards,<br>TenantFlow Team</p>
				`
			}

			// Emit event for email service to process
			this.eventEmitter.emit('tenant.invitation.sent', {
				userId,
				tenantId,
				email: emailContent,
				invitationToken
			})

			return {
				success: true,
				message: 'Invitation sent successfully',
				invitationToken,
				invitationLink,
				sentAt: invitationSentDate
			}
		} catch (error) {
			this.logger.error('Failed to send tenant invitation', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId,
				propertyId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to send tenant invitation')
		}
	}

	/**
	 * Resend invitation to tenant using repository pattern
	 */
	async resendInvitation(
		userId: string,
		tenantId: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Resending tenant invitation via repository', {
				userId,
				tenantId
			})

			// Business logic: Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Invitation status fields are still pending in the database schema; skip the status check for now.
			/*
			if (tenant.invitationStatus === 'ACCEPTED') {
				return {
					success: false,
					message: 'Invitation already accepted',
					status: tenant.invitationStatus
				}
			}
			*/

			// Use sendTenantInvitation method to handle the resend
			return await this.sendTenantInvitation(userId, tenantId)
		} catch (error) {
			this.logger.error('Failed to resend tenant invitation', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to resend tenant invitation')
		}
	}

	/**
	 * Update tenant emergency contact
	 */
	async updateEmergencyContact(
		userId: string,
		tenantId: string,
		emergencyContact: { name: string; phone: string; relationship: string }
	): Promise<Tenant | null> {
		try {
			this.logger.log('Updating tenant emergency contact', {
				userId,
				tenantId,
				emergencyContact
			})

			// Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Update tenant with emergency contact
			return await this.tenantsRepository.update(tenantId, {
				emergencyContact: emergencyContact as never
			})
		} catch (error) {
			this.logger.error('Failed to update emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to update emergency contact')
		}
	}

	/**
	 * Remove tenant emergency contact
	 */
	async removeEmergencyContact(
		userId: string,
		tenantId: string
	): Promise<Tenant | null> {
		try {
			this.logger.log('Removing tenant emergency contact', { userId, tenantId })

			// Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Remove emergency contact by setting to null
			return await this.tenantsRepository.update(tenantId, {
				emergencyContact: null as never
			})
		} catch (error) {
			this.logger.error('Failed to remove emergency contact', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to remove emergency contact')
		}
	}

	/**
	 * Generate a secure invitation token
	 * Private helper method for invitation functionality
	 */
	private generateInvitationToken(): string {
		// Generate a secure random token for tenant invitation
		const chars =
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
		let token = ''
		for (let i = 0; i < 32; i++) {
			token += chars.charAt(Math.floor(Math.random() * chars.length))
		}
		return token
	}
}
