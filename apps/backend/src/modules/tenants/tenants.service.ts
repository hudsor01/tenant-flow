/**
 * Tenants Service - Ultra-Native NestJS Implementation
 *
 * Direct Supabase access, no repository abstractions
 * Controller → Service → Supabase
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type { Tenant, TenantStats } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { EmailService } from '../email/email.service'
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
 * Tenants service - Ultra-Native Implementation
 * Direct Supabase queries, no repository layer
 * Note: Tenants are accessed through property ownership via leases
 */
@Injectable()
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name)

	constructor(
		private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2,
		private readonly emailService: EmailService
	) {}

	/**
	 * Get all tenants for a user via direct Supabase query
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
			this.logger.log('Finding all tenants via direct Supabase query', {
				userId,
				query
			})

			const client = this.supabase.getAdminClient()
			let queryBuilder = client.from('tenant').select('*').eq('userId', userId)

			// Filter out MOVED_OUT and ARCHIVED tenants by default (soft delete)
			// Include them only if explicitly requested via status filter
			if (!query.status) {
				queryBuilder = queryBuilder.not(
					'status',
					'in',
					'("MOVED_OUT","ARCHIVED")'
				)
			} else if (query.status && query.status !== 'all') {
				const statusValue = String(
					query.status
				) as Database['public']['Enums']['TenantStatus']
				queryBuilder = queryBuilder.eq('status', statusValue)
			}

			// SECURITY FIX #2: Apply safe search filter to prevent SQL injection
			if (query.search) {
				const searchTerm = String(query.search)
				const sanitized = sanitizeSearchInput(searchTerm)
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, [
							'firstName',
							'lastName',
							'email'
						])
					)
				}
			}

			// Apply status filter - REMOVED: invitationStatus column doesn't exist in database
			// if (query.invitationStatus) {
			// 	queryBuilder = queryBuilder.eq('invitationStatus', query.invitationStatus)
			// }

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to fetch tenants from Supabase', {
					error: error.message,
					userId,
					query
				})
				throw new BadRequestException('Failed to retrieve tenants')
			}

			return (data as Tenant[]) || []
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
	 * Get tenant statistics via direct Supabase query
	 */
	async getStats(userId: string): Promise<TenantStats> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn('Tenant stats requested without userId')
			throw new BadRequestException('User ID is required')
		}

		try {
			this.logger.log('Getting tenant stats via direct Supabase query', {
				userId
			})

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenant')
				.select('createdAt, status')
				.eq('userId', userId)

			if (error) {
				this.logger.error('Failed to fetch tenant stats from Supabase', {
					error: error.message,
					userId
				})
				throw new BadRequestException('Failed to retrieve tenant statistics')
			}

			const tenants = data || []
			const now = new Date()
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

			// Count tenants by status (excluding MOVED_OUT and ARCHIVED)
			const activeTenants = tenants.filter(
				t => t.status === 'ACTIVE' || t.status === 'PENDING'
			)
			const inactiveTenants = tenants.filter(
				t =>
					t.status === 'INACTIVE' ||
					t.status === 'EVICTED' ||
					t.status === 'MOVED_OUT' ||
					t.status === 'ARCHIVED'
			)

			return {
				total: activeTenants.length, // Only count active/pending (exclude moved out/archived)
				active: activeTenants.filter(t => t.status === 'ACTIVE').length,
				inactive: inactiveTenants.filter(
					t => t.status === 'INACTIVE' || t.status === 'EVICTED'
				).length,
				newThisMonth: tenants.filter(
					t => new Date(t.createdAt) >= thirtyDaysAgo
				).length
			}
		} catch (error) {
			this.logger.error('Tenants service failed to get stats', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw new BadRequestException('Failed to retrieve tenant statistics')
		}
	}

	/**
	 * Get single tenant via direct Supabase query
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
			this.logger.log('Finding tenant by ID via direct Supabase query', {
				userId,
				tenantId
			})

			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenant')
				.select('*')
				.eq('id', tenantId)
				.eq('userId', userId)
				.single()

			if (error) {
				this.logger.error('Failed to fetch tenant from Supabase', {
					error: error.message,
					userId,
					tenantId
				})
				return null
			}

			return data as Tenant
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
	 * Create tenant via direct Supabase query
	 */
	async create(
		userId: string,
		createRequest: CreateTenantRequest
	): Promise<Tenant> {
		// Business logic: Validate inputs separately for better error messages
		if (!userId) {
			this.logger.warn(
				'Create tenant requested without authenticated user ID',
				{
					email: createRequest.email
				}
			)
			throw new BadRequestException(
				'Authentication required - user ID missing from session'
			)
		}

		if (!createRequest.email) {
			this.logger.warn('Create tenant requested without email', { userId })
			throw new BadRequestException('Email is required')
		}

		try {
			this.logger.log('Creating tenant via direct Supabase query', {
				userId,
				email: createRequest.email
			})

			const client = this.supabase.getAdminClient()
			// Use authenticated userId (from JWT) - never trust client-provided userId
			const tenantData: Database['public']['Tables']['tenant']['Insert'] = {
				userId: userId,
				email: createRequest.email,
				firstName: createRequest.firstName || null,
				lastName: createRequest.lastName || null,
				phone: createRequest.phone || null,
				emergencyContact: createRequest.emergencyContact || null,
				name: createRequest.name || null,
				avatarUrl: createRequest.avatarUrl || null
			}

			const { data, error } = await client
				.from('tenant')
				.insert(tenantData)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to create tenant in Supabase', {
					error: error.message,
					userId,
					email: createRequest.email
				})
				throw new BadRequestException('Failed to create tenant')
			}

			const tenant = data as Tenant

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
	 * Update tenant via direct Supabase query
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
			this.logger.log('Updating tenant via direct Supabase query', {
				userId,
				tenantId
			})

			const client = this.supabase.getAdminClient()

			// Build update object dynamically
			const updateData: Database['public']['Tables']['tenant']['Update'] = {
				updatedAt: new Date().toISOString()
			}

			if (updateRequest.firstName !== undefined)
				updateData.firstName = updateRequest.firstName
			if (updateRequest.lastName !== undefined)
				updateData.lastName = updateRequest.lastName
			if (updateRequest.email !== undefined)
				updateData.email = updateRequest.email
			if (updateRequest.phone !== undefined)
				updateData.phone = updateRequest.phone

			const { data, error } = await client
				.from('tenant')
				.update(updateData)
				.eq('id', tenantId)
				.eq('userId', userId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update tenant in Supabase', {
					error: error.message,
					userId,
					tenantId
				})
				return null
			}

			return data as Tenant
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
	 * Mark tenant as moved out (soft delete with 7-year retention)
	 */
	async markAsMovedOut(
		userId: string,
		tenantId: string,
		moveOutDate: string,
		moveOutReason: string
	): Promise<Tenant | null> {
		// Business logic: Validate inputs
		if (!userId || !tenantId) {
			this.logger.warn('Mark moved out requested with missing parameters', {
				userId,
				tenantId
			})
			return null
		}

		try {
			this.logger.log('Marking tenant as moved out via direct Supabase query', {
				userId,
				tenantId,
				moveOutDate
			})

			const client = this.supabase.getAdminClient()

			// Update tenant status to MOVED_OUT
			const updateData: Database['public']['Tables']['tenant']['Update'] = {
				status: 'MOVED_OUT' as Database['public']['Enums']['TenantStatus'],
				move_out_date: moveOutDate,
				move_out_reason: moveOutReason,
				updatedAt: new Date().toISOString()
			}

			const { data, error } = await client
				.from('tenant')
				.update(updateData)
				.eq('id', tenantId)
				.eq('userId', userId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to mark tenant as moved out in Supabase', {
					error: error.message,
					userId,
					tenantId
				})
				return null
			}

			return data as Tenant
		} catch (error) {
			this.logger.error('Tenants service failed to mark tenant as moved out', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})
			return null
		}
	}

	/**
	 * Permanently delete tenant (7+ years only)
	 */
	async hardDelete(userId: string, tenantId: string): Promise<void> {
		// Business logic: Validate inputs
		if (!userId || !tenantId) {
			this.logger.warn('Hard delete requested with missing parameters', {
				userId,
				tenantId
			})
			throw new BadRequestException('User ID and tenant ID are required')
		}

		try {
			this.logger.log('Hard deleting tenant via direct Supabase query', {
				userId,
				tenantId
			})

			// Business logic: Verify tenant exists and check 7-year retention
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Require tenant to be marked as moved out before permanent deletion
			if (tenant.status !== 'MOVED_OUT' && tenant.status !== 'ARCHIVED') {
				throw new BadRequestException(
					'Tenant must be marked as moved out before permanent deletion. Use PUT /tenants/:id/mark-moved-out first.'
				)
			}

			// Require move_out_date to be set
			if (!tenant.move_out_date) {
				throw new BadRequestException(
					'Tenant must have a move-out date before permanent deletion. Use PUT /tenants/:id/mark-moved-out first.'
				)
			}

			// Check if tenant has been archived for 7+ years
			const now = new Date()
			const sevenYearsAgo = new Date(
				now.getFullYear() - 7,
				now.getMonth(),
				now.getDate()
			)

			const moveOutDate = new Date(tenant.move_out_date)
			if (moveOutDate > sevenYearsAgo) {
				throw new BadRequestException(
					'Tenant can only be permanently deleted 7 years after move-out date (legal retention requirement)'
				)
			}

			const client = this.supabase.getAdminClient()

			// Hard delete after 7-year retention check
			const { error } = await client
				.from('tenant')
				.delete()
				.eq('id', tenantId)
				.eq('userId', userId)

			if (error) {
				this.logger.error('Failed to permanently delete tenant in Supabase', {
					error: error.message,
					userId,
					tenantId
				})
				throw new BadRequestException('Failed to permanently delete tenant')
			}
		} catch (error) {
			this.logger.error('Tenants service failed to hard delete tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})

			if (error instanceof BadRequestException) {
				throw error
			}
			throw new BadRequestException('Failed to permanently delete tenant')
		}
	}

	/**
	 * Delete tenant (soft delete - marks as moved out)
	 */
	async remove(userId: string, tenantId: string): Promise<void> {
		// Perform soft delete by marking tenant as moved out
		const moveOutDate =
			new Date().toISOString().split('T')[0] ||
			new Date().toLocaleDateString('en-CA')
		await this.markAsMovedOut(
			userId,
			tenantId,
			moveOutDate,
			'Administrative removal'
		)
	}

	// NOTE: The following methods use direct RPC calls for specialized business logic
	// These are kept as RPC calls since they involve complex workflows beyond basic CRUD

	/**
	 * Send tenant invitation - Direct implementation with email service
	 * Ultra-Native: Direct Supabase update + direct Resend email
	 */
	async sendTenantInvitation(
		userId: string,
		tenantId: string,
		propertyId?: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Sending tenant invitation', {
				userId,
				tenantId,
				propertyId
			})

			// Business logic: Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Check if invitation already sent or accepted
			if (
				tenant.invitation_status === 'SENT' ||
				tenant.invitation_status === 'ACCEPTED'
			) {
				this.logger.warn('Invitation already sent or accepted', {
					tenantId,
					status: tenant.invitation_status
				})
				return {
					success: false,
					message: 'Invitation already sent or accepted',
					status: tenant.invitation_status
				}
			}

			// Business logic: Generate invitation token and expiry (7 days)
			const invitationToken = this.generateInvitationToken()
			const now = new Date()
			const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

			// Update tenant with invitation data via direct Supabase query
			const client = this.supabase.getAdminClient()
			const { data: updatedTenant, error } = await client
				.from('tenant')
				.update({
					invitation_status:
						'SENT' as Database['public']['Enums']['invitation_status'],
					invitation_token: invitationToken,
					invitation_sent_at: now.toISOString(),
					invitation_expires_at: expiresAt.toISOString()
				})
				.eq('id', tenantId)
				.eq('userId', userId)
				.select()
				.single()

			if (error || !updatedTenant) {
				this.logger.error('Failed to update tenant invitation status', {
					error: error?.message,
					tenantId
				})
				throw new BadRequestException(
					'Failed to update tenant invitation status'
				)
			}

			// Get property/unit info if available for better email context
			let propertyName: string | undefined
			let unitNumber: string | undefined

			if (propertyId) {
				const { data: property } = await client
					.from('property')
					.select('name')
					.eq('id', propertyId)
					.single()
				propertyName = property?.name
			}

			// Build invitation link
			const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'
			const invitationLink = `${frontendUrl}/tenant/invitation/${invitationToken}`

			// Send invitation email via EmailService (direct Resend call)
			await this.emailService.sendTenantInvitation({
				tenantEmail: tenant.email,
				tenantFirstName: tenant.firstName,
				invitationToken,
				invitationLink,
				propertyName,
				unitNumber
			})

			return {
				success: true,
				message: 'Invitation sent successfully',
				invitationToken,
				invitationLink,
				sentAt: now.toISOString(),
				expiresAt: expiresAt.toISOString()
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
	 * Resend invitation to tenant - Direct implementation
	 */
	async resendInvitation(
		userId: string,
		tenantId: string
	): Promise<Record<string, unknown>> {
		try {
			this.logger.log('Resending tenant invitation', {
				userId,
				tenantId
			})

			// Business logic: Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// Don't resend if already accepted
			if (tenant.invitation_status === 'ACCEPTED') {
				return {
					success: false,
					message: 'Invitation already accepted',
					status: tenant.invitation_status
				}
			}

			// Use sendTenantInvitation method to handle the resend
			// This will generate a new token and update expiry
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

			// Update tenant with emergency contact via direct Supabase query
			const client = this.supabase.getAdminClient()
			const emergencyContactPayload = JSON.stringify(emergencyContact)
			const { data, error } = await client
				.from('tenant')
				.update({ emergencyContact: emergencyContactPayload })
				.eq('id', tenantId)
				.eq('userId', userId)
				.select()
				.single()

			if (error) {
				throw new BadRequestException('Failed to update emergency contact')
			}

			return data as Tenant
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

			// Remove emergency contact by setting to null via direct Supabase query
			const client = this.supabase.getAdminClient()
			const { data, error } = await client
				.from('tenant')
				.update({ emergencyContact: null })
				.eq('id', tenantId)
				.eq('userId', userId)
				.select()
				.single()

			if (error) {
				throw new BadRequestException('Failed to remove emergency contact')
			}

			return data as Tenant
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
