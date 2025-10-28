/**
 * Tenants Service - Ultra-Native NestJS Implementation
 *
 * Direct Supabase access, no repository abstractions
 * Controller → Service → Supabase
 */

import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type {
	Tenant,
	TenantStats,
	TenantSummary
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
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
		private readonly eventEmitter: EventEmitter2
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

			if (query.invitationStatus) {
				const statusFilter = String(query.invitationStatus).toUpperCase()
				const allowedInvitationStatuses = [
					'PENDING',
					'SENT',
					'ACCEPTED',
					'EXPIRED',
					'REVOKED'
				] as const
				if (allowedInvitationStatuses.includes(statusFilter as typeof allowedInvitationStatuses[number])) {
					queryBuilder = queryBuilder.eq('invitation_status', statusFilter as typeof allowedInvitationStatuses[number])
				}
			}

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
	 * Get tenant summary: totals and overdue/upcoming aggregates
	 */
	async getSummary(userId: string): Promise<TenantSummary> {
		if (!userId) {
			this.logger.warn('getSummary called without userId')
			throw new BadRequestException('User ID is required')
		}

		const client = this.supabase.getAdminClient()

		// Fetch tenants for counts
		const { data: tenantsData } = await client
			.from('tenant')
			.select('*')
			.eq('userId', userId)

		const tenants: Tenant[] = tenantsData || []

		const total = tenants.length
		const invited = tenants.filter(t => !!t.invitation_status).length
		const active = tenants.filter(
			t => t.status !== 'MOVED_OUT' && t.status !== 'ARCHIVED'
		).length

		// Simple aggregates: overdue (dueDate < today) and upcoming (dueDate >= today)
		const today = new Date().toISOString()

		const { data: overdueAgg } = await client
			.from('rent_payment')
			.select('sum(amount)')
			.eq('userId', userId)
			.lt('dueDate', today)

		const { data: upcomingAgg } = await client
			.from('rent_payment')
			.select('sum(amount)')
			.eq('userId', userId)
			.gte('dueDate', today)

		const overdueBalanceCents = Number((overdueAgg && overdueAgg[0]?.sum) || 0)
		const upcomingDueCents = Number((upcomingAgg && upcomingAgg[0]?.sum) || 0)

		return {
			total,
			invited,
			active,
			overdueBalanceCents,
			upcomingDueCents,
			timestamp: new Date().toISOString()
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
				avatarUrl: createRequest.avatarUrl || null,
				status: 'PENDING' as Database['public']['Enums']['TenantStatus'],
				invitation_status:
					'PENDING' as Database['public']['Enums']['invitation_status']
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
		updateRequest: UpdateTenantRequest,
		expectedVersion?: number // 🔐 BUG FIX #2: Optimistic locking
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

			// 🔐 BUG FIX #2: Increment version for optimistic locking
			if (expectedVersion !== undefined) {
				updateData.version = expectedVersion + 1
			}

			if (updateRequest.firstName !== undefined)
				updateData.firstName = updateRequest.firstName
			if (updateRequest.lastName !== undefined)
				updateData.lastName = updateRequest.lastName
			if (updateRequest.email !== undefined)
				updateData.email = updateRequest.email
			if (updateRequest.phone !== undefined)
				updateData.phone = updateRequest.phone

			// 🔐 BUG FIX #2: Add version check for optimistic locking
			let query = client
				.from('tenant')
				.update(updateData)
				.eq('id', tenantId)
				.eq('userId', userId)

			// Add version check if expectedVersion provided
			if (expectedVersion !== undefined) {
				query = query.eq('version', expectedVersion)
			}

			const { data, error } = await query.select().single()

			if (error || !data) {
				// 🔐 BUG FIX #2: Detect optimistic locking conflict
				if (error?.code === 'PGRST116') {
					// PGRST116 = 0 rows affected (version mismatch)
					this.logger.warn('Optimistic locking conflict detected', {
						userId,
						tenantId,
						expectedVersion
					})
					throw new ConflictException(
						'Tenant was modified by another user. Please refresh and try again.'
					)
				}

				// Other database errors
				this.logger.error('Failed to update tenant in Supabase', {
					error: error ? String(error) : 'Unknown error',
					userId,
					tenantId
				})
				throw new BadRequestException('Failed to update tenant')
			}

			return data as Tenant
		} catch (error) {
			// Re-throw ConflictException as-is
			if (error instanceof ConflictException) {
				throw error
			}

			this.logger.error('Tenants service failed to update tenant', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to update tenant'
			)
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
	 * ✅ NEW: Send tenant invitation via Supabase Auth (Phase 3.1)
	 * Uses Supabase Auth's built-in invitation system instead of custom tokens
	 * 
	 * @param userId - Owner user ID
	 * @param tenantId - Tenant ID to invite
	 * @param propertyId - Optional property ID for context
	 * @param leaseId - Optional lease ID for context
	 * @returns Invitation result with auth user ID
	 */
	async sendTenantInvitationV2(
		userId: string,
		tenantId: string,
		propertyId?: string,
		leaseId?: string
	): Promise<{
		success: boolean
		authUserId?: string
		message: string
	}> {
		try {
			this.logger.log('Sending tenant invitation via Supabase Auth (V2)', {
				userId,
				tenantId,
				propertyId,
				leaseId
			})

			// 1. Verify tenant exists and belongs to user
			const tenant = await this.findOne(userId, tenantId)
			if (!tenant) {
				throw new BadRequestException('Tenant not found or access denied')
			}

			// 2. Check if already has auth user linked
			if (tenant.auth_user_id) {
				this.logger.warn('Tenant already has auth user linked', {
					tenantId,
					authUserId: tenant.auth_user_id
				})
				return {
					success: false,
					message: 'Tenant already has an account',
					authUserId: tenant.auth_user_id
				}
			}

			// 3. Get property/unit info for email metadata
			const client = this.supabase.getAdminClient()
			let propertyName: string | undefined
			let unitNumber: string | undefined

			if (leaseId) {
				const { data: lease } = await client
					.from('lease')
					.select('unit(unitNumber, property(name))')
					.eq('id', leaseId)
					.single()
				if (lease) {
					propertyName = lease.unit?.property?.name
					unitNumber = lease.unit?.unitNumber
				}
			} else if (propertyId) {
				const { data: property } = await client
					.from('property')
					.select('name')
					.eq('id', propertyId)
					.single()
				propertyName = property?.name
			}

			// 4. Send invitation via Supabase Auth Admin API
			const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'
			const { data: authUser, error: authError } = await client.auth.admin.inviteUserByEmail(
				tenant.email,
				{
					data: {
						tenantId,
						propertyId,
						leaseId,
						firstName: tenant.firstName,
						lastName: tenant.lastName,
						propertyName,
						unitNumber,
						role: 'tenant' // Custom metadata for role-based access
					},
					redirectTo: `${frontendUrl}/tenant/onboarding`
				}
			)

			if (authError || !authUser?.user) {
				this.logger.error('Failed to send Supabase Auth invitation', {
					error: authError?.message,
					tenantEmail: tenant.email
				})
				throw new BadRequestException(
					`Failed to send invitation: ${authError?.message || 'Unknown error'}`
				)
			}

			// 5. Link tenant record to auth user
			const { error: updateError } = await client
				.from('tenant')
				.update({
					auth_user_id: authUser.user.id,
					invitation_status: 'SENT' as Database['public']['Enums']['invitation_status'],
					invitation_sent_at: new Date().toISOString()
				})
				.eq('id', tenantId)
				.eq('userId', userId)

			if (updateError) {
				this.logger.error('Failed to link tenant to auth user', {
					error: updateError.message,
					tenantId,
					authUserId: authUser.user.id
				})
				throw new BadRequestException('Failed to link tenant to auth user')
			}

			this.logger.log('Tenant invitation sent successfully via Supabase Auth', {
				tenantId,
				authUserId: authUser.user.id,
				tenantEmail: tenant.email
			})

			return {
				success: true,
				authUserId: authUser.user.id,
				message: 'Invitation sent successfully'
			}
		} catch (error) {
			this.logger.error('Failed to send tenant invitation V2', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantId,
				propertyId,
				leaseId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to send tenant invitation')
		}
	}

	/**
	 * ✅ NEW: Complete tenant invitation with lease creation (Industry Standard)
	 * Creates tenant + lease + sends Supabase Auth invitation in one atomic operation
	 * Based on Buildium/AppFolio/TurboTenant best practices
	 */
	async inviteTenantWithLease(
		userId: string,
		tenantData: {
			email: string
			firstName: string
			lastName: string
			phone?: string
		},
		leaseData: {
			propertyId: string
			unitId?: string
			rentAmount: number
			securityDeposit: number
			startDate: string
			endDate: string
		}
	): Promise<{
		success: boolean
		tenantId: string
		leaseId: string
		authUserId: string
		message: string
	}> {
		try {
			this.logger.log('Creating tenant with lease and sending invitation', {
				userId,
				tenantEmail: tenantData.email,
				propertyId: leaseData.propertyId,
				unitId: leaseData.unitId
			})

			const client = this.supabase.getAdminClient()

			// 1. Create tenant record
			const { data: tenant, error: tenantError } = await client
				.from('tenant')
				.insert({
					email: tenantData.email,
					firstName: tenantData.firstName,
					lastName: tenantData.lastName,
					phone: tenantData.phone ?? null,
					userId,
					status: 'PENDING' as Database['public']['Enums']['TenantStatus'],
					invitation_status: 'PENDING' as Database['public']['Enums']['invitation_status']
				})
				.select()
				.single()

			if (tenantError || !tenant) {
				this.logger.error('Failed to create tenant', {
					error: tenantError?.message
				})
				throw new BadRequestException(
					`Failed to create tenant: ${tenantError?.message || 'Unknown error'}`
				)
			}

			this.logger.log('Tenant created successfully', { tenantId: tenant.id })

			// 2. Create lease record
			const { data: lease, error: leaseError } = await client
				.from('lease')
				.insert({
					tenantId: tenant.id,
					propertyId: leaseData.propertyId,
					unitId: leaseData.unitId || null,
					rentAmount: leaseData.rentAmount,
					monthlyRent: leaseData.rentAmount,
					securityDeposit: leaseData.securityDeposit,
					startDate: leaseData.startDate,
					endDate: leaseData.endDate,
					status: 'PENDING' as Database['public']['Enums']['LeaseStatus'] // Active after signature
				})
				.select()
				.single()

			if (leaseError || !lease) {
				// Rollback: Delete tenant if lease creation fails
				await client.from('tenant').delete().eq('id', tenant.id)

				this.logger.error('Failed to create lease, rolled back tenant', {
					error: leaseError?.message,
					tenantId: tenant.id
				})
				throw new BadRequestException(
					`Failed to create lease: ${leaseError?.message || 'Unknown error'}`
				)
			}

			this.logger.log('Lease created successfully', { leaseId: lease.id })

			// 3. Get property/unit info for email metadata
			const { data: property } = await client
				.from('property')
				.select('name')
				.eq('id', leaseData.propertyId)
				.single()

			// Only fetch unit if unitId is provided
			let unitNumber: string | undefined
			if (leaseData.unitId) {
				const { data: unit } = await client
					.from('unit')
					.select('unitNumber')
					.eq('id', leaseData.unitId)
					.single()
				unitNumber = unit?.unitNumber
			}

			const propertyName = property?.name || 'Your Property'

			// 4. Send invitation via Supabase Auth Admin API
			const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'
			const { data: authUser, error: authError } = await client.auth.admin.inviteUserByEmail(
				tenant.email,
				{
					data: {
						tenantId: tenant.id,
						leaseId: lease.id,
						propertyId: leaseData.propertyId,
						...(leaseData.unitId && { unitId: leaseData.unitId }),
						firstName: tenantData.firstName,
						lastName: tenantData.lastName,
						propertyName,
						...(unitNumber && { unitNumber }),
						rentAmount: leaseData.rentAmount,
						startDate: leaseData.startDate,
						endDate: leaseData.endDate,
						role: 'tenant'
					},
					redirectTo: `${frontendUrl}/auth/confirm`
				}
			)

			if (authError || !authUser?.user) {
				// Rollback: Delete tenant and lease if invitation fails
				await client.from('lease').delete().eq('id', lease.id)
				await client.from('tenant').delete().eq('id', tenant.id)

				this.logger.error('Failed to send Supabase Auth invitation, rolled back', {
					error: authError?.message,
					tenantEmail: tenant.email
				})
				throw new BadRequestException(
					`Failed to send invitation: ${authError?.message || 'Unknown error'}`
				)
			}

			this.logger.log('Supabase Auth invitation sent successfully', {
				authUserId: authUser.user.id
			})

			// 5. Link tenant record to auth user
			const { error: updateError } = await client
				.from('tenant')
				.update({
					auth_user_id: authUser.user.id,
					invitation_status: 'SENT' as Database['public']['Enums']['invitation_status'],
					invitation_sent_at: new Date().toISOString()
				})
				.eq('id', tenant.id)

			if (updateError) {
				this.logger.error('Failed to link tenant to auth user', {
					error: updateError.message,
					tenantId: tenant.id,
					authUserId: authUser.user.id
				})
				throw new BadRequestException('Failed to link tenant to auth user')
			}

			this.logger.log('Tenant invitation complete', {
				tenantId: tenant.id,
				leaseId: lease.id,
				authUserId: authUser.user.id,
				tenantEmail: tenant.email
			})

			return {
				success: true,
				tenantId: tenant.id,
				leaseId: lease.id,
				authUserId: authUser.user.id,
				message: 'Tenant created and invitation sent successfully'
			}
		} catch (error) {
			this.logger.error('Failed to invite tenant with lease', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				tenantEmail: tenantData.email
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to invite tenant with lease')
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
			return await this.sendTenantInvitationV2(userId, tenantId)
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
	 * Validate invitation token (public - no userId required)
	 * Returns invitation status for tenant landing page
	 */
	async validateInvitationToken(token: string): Promise<{
		valid: boolean
		expired: boolean
		already_accepted: boolean
		tenant_email?: string
		tenant_first_name?: string
		property_name?: string
		expires_at?: string
	}> {
		try {
			this.logger.log('Validating invitation token', { tokenLength: token.length })

			// Query tenant by invitation token
			const client = this.supabase.getAdminClient()
			const { data: tenant, error } = await client
				.from('tenant')
				.select('id, email, firstName, invitation_status, invitation_expires_at')
				.eq('invitation_token', token)
				.single()

			if (error || !tenant) {
				this.logger.warn('Invitation token not found', { error: error?.message })
				return {
					valid: false,
					expired: false,
					already_accepted: false
				}
			}

			// Check if already accepted
			if (tenant.invitation_status === 'ACCEPTED') {
				return {
					valid: false,
					expired: false,
					already_accepted: true,
					tenant_email: tenant.email,
					...(tenant.firstName && { tenant_first_name: tenant.firstName })
				}
			}

			// Check if expired
			const expiresAt = tenant.invitation_expires_at ? new Date(tenant.invitation_expires_at) : null
			const now = new Date()
			const expired = expiresAt ? expiresAt < now : false

			if (expired) {
				return {
					valid: false,
					expired: true,
					already_accepted: false,
					tenant_email: tenant.email,
					...(tenant.firstName && { tenant_first_name: tenant.firstName }),
					...(tenant.invitation_expires_at && { expires_at: tenant.invitation_expires_at })
				}
			}

			// Valid invitation
			return {
				valid: true,
				expired: false,
				already_accepted: false,
				tenant_email: tenant.email,
				...(tenant.firstName && { tenant_first_name: tenant.firstName }),
				...(tenant.invitation_expires_at && { expires_at: tenant.invitation_expires_at })
			}
		} catch (error) {
			this.logger.error('Failed to validate invitation token', {
				error: error instanceof Error ? error.message : String(error)
			})

			return {
				valid: false,
				expired: false,
				already_accepted: false
			}
		}
	}

	async acceptInvitationToken(token: string): Promise<{
		success: boolean
		tenantId?: string
		acceptedAt?: string
		alreadyAccepted?: boolean
	}> {
		if (!token || token.length < 12) {
			throw new BadRequestException('Invalid invitation token')
		}

		const client = this.supabase.getAdminClient()
		const { data: tenant, error } = await client
			.from('tenant')
			.select('id, invitation_status, invitation_expires_at')
			.eq('invitation_token', token)
			.single()

		if (error || !tenant) {
			throw new BadRequestException('Invitation not found')
		}

		if (tenant.invitation_status === 'ACCEPTED') {
			return {
				success: true,
				tenantId: tenant.id,
				alreadyAccepted: true
			}
		}

		const expiresAt = tenant.invitation_expires_at
			? new Date(tenant.invitation_expires_at)
			: null
		if (expiresAt && expiresAt.getTime() < Date.now()) {
			throw new BadRequestException('Invitation token has expired')
		}

		const acceptedAt = new Date().toISOString()
		const { data: updatedTenant, error: updateError } = await client
			.from('tenant')
			.update({
				invitation_status:
					'ACCEPTED' as Database['public']['Enums']['invitation_status'],
				invitation_accepted_at: acceptedAt,
				status: 'ACTIVE' as Database['public']['Enums']['TenantStatus']
			})
			.eq('id', tenant.id)
			.select('id, invitation_accepted_at')
			.single()

		if (updateError || !updatedTenant) {
			throw new BadRequestException('Failed to accept invitation')
		}

		return {
			success: true,
			tenantId: updatedTenant.id,
			acceptedAt: updatedTenant.invitation_accepted_at || acceptedAt
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
	 * ✅ NEW: Activate tenant from Supabase Auth user ID (Phase 3.1)
	 * Called from frontend after successful invitation acceptance
	 * Calls database function to update tenant status
	 */
	async activateTenantFromAuthUser(authUserId: string): Promise<{
		success: boolean
		tenantId?: string
		message: string
	}> {
		try {
			this.logger.log('Activating tenant from auth user', { authUserId })

			const client = this.supabase.getAdminClient()

			// Call database function to activate tenant
			const { data, error } = await client.rpc('activate_tenant_from_auth_user', {
				p_auth_user_id: authUserId
			})

			if (error) {
				this.logger.error('Database function failed', {
					error: error.message,
					authUserId
				})
				throw new BadRequestException('Failed to activate tenant')
			}

			// Database function returns { tenant_id, activated }
			const result = data as unknown as Array<{
				tenant_id: string
				activated: boolean
			}>

			if (!result || result.length === 0) {
				return {
					success: false,
					message: 'Tenant not found'
				}
			}

			const firstResult = result[0]
			if (!firstResult || !firstResult.activated) {
				return {
					success: false,
					message: 'Tenant not found or already activated'
				}
			}

			this.logger.log('Tenant activated successfully', {
				tenantId: firstResult.tenant_id,
				authUserId
			})

			return {
				success: true,
				tenantId: firstResult.tenant_id,
				message: 'Tenant activated successfully'
			}
		} catch (error) {
			this.logger.error('Failed to activate tenant', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})

			if (error instanceof BadRequestException) {
				throw error
			}

			throw new BadRequestException('Failed to activate tenant')
		}
	}

	/**
	 * Generate a secure invitation token
	 * Private helper method for invitation functionality
	 */

}
