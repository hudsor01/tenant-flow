/**
 * Tenants Service - Ultra-Native NestJS Implementation
 *
 * Direct Supabase access, no repository abstractions
 * Controller → Service → Supabase
 */

import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException
} from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type {
	Tenant,
	TenantStats,
	TenantSummary,
	TenantWithLeaseInfo
} from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase-generated'
import { activateTenantResultSchema } from '@repo/shared/validation/database-rpc.schemas'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'
import { TenantCreatedEvent } from '../notifications/events/notification.events'
import { SagaBuilder } from '../../shared/patterns/saga.pattern'
import { StripeConnectService } from '../billing/stripe-connect.service'

/**
 * Emergency contact information for a tenant
 */
export interface EmergencyContactResponse {
	id: string
	tenantId: string
	contactName: string
	relationship: string
	phoneNumber: string
	email: string | null
	createdAt: string
	updatedAt: string
}

/**
 * Default notification preferences for new tenants
 */
const DEFAULT_NOTIFICATION_PREFERENCES = {
	rentReminders: true,
	maintenanceUpdates: true,
	propertyNotices: true,
	emailNotifications: true,
	smsNotifications: false
} as const

/**
 * Maps database emergency contact record to API response format
 * Converts snake_case database fields to camelCase API fields
 */
function mapEmergencyContactToResponse(
	contact: Database['public']['Tables']['tenant_emergency_contact']['Row']
): EmergencyContactResponse {
	return {
		id: contact.id,
		tenantId: contact.tenant_id,
		contactName: contact.contact_name,
		relationship: contact.relationship,
		phoneNumber: contact.phone_number,
		email: contact.email,
		createdAt: contact.created_at,
		updatedAt: contact.updated_at
	}
}

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

interface LeaseWithUnitAndProperty {
	id: string
	startDate: string
	endDate: string
	rentAmount: number
	securityDeposit: number
	status: string
	terms: string | null
	unit: {
		id: string
		unitNumber: string
		bedrooms: number
		bathrooms: number
		squareFeet: number | null
		property: {
			id: string
			name: string
			address: string
			city: string
			state: string
			zipCode: string
		}
	} | null
}

interface TenantWithLeaseRelations {
	id: string
	firstName: string | null
	lastName: string | null
	email: string
	phone: string | null
	avatarUrl: string | null
	emergencyContact: string | null
	createdAt: string
	updatedAt: string
	invitation_status: string | null
	invitation_sent_at: string | null
	invitation_accepted_at: string | null
	invitation_expires_at: string | null
	userId: string
	lease: LeaseWithUnitAndProperty[] | LeaseWithUnitAndProperty
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
		private readonly stripeConnectService: StripeConnectService
	) {}

	/**
	 * Calculate user-friendly payment status from rent_payment data
	 * Uses UTC date comparison to ensure consistent results across timezones
	 * @private
	 */
	private calculatePaymentStatus(
		payment: {
			status: Database['public']['Enums']['RentPaymentStatus'] | null
			dueDate: string | null
		} | null
	): string | null {
		if (!payment || !payment.status) {
			return null
		}

		// Normalize dates to UTC midnight for consistent comparison across timezones
		const now = new Date()
		const todayUTC = Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate()
		)

		const dueDate = payment.dueDate ? new Date(payment.dueDate) : null
		const dueDateUTC = dueDate
			? Date.UTC(
					dueDate.getUTCFullYear(),
					dueDate.getUTCMonth(),
					dueDate.getUTCDate()
				)
			: null

		// Use enum constants for type-safe comparisons
		type PaymentStatus = Database['public']['Enums']['RentPaymentStatus']
		const status: PaymentStatus = payment.status

		// Map payment status to user-friendly status
		if (status === 'PAID' || status === 'SUCCEEDED') {
			return 'Current'
		} else if (status === 'DUE' || status === 'PENDING') {
			// Check if overdue using UTC timestamps
			if (dueDateUTC !== null && dueDateUTC < todayUTC) {
				return 'Overdue'
			} else {
				return 'Due Soon'
			}
		} else if (status === 'FAILED') {
			return 'Payment Failed'
		} else if (status === 'REQUIRES_ACTION') {
			return 'Action Required'
		} else {
			// For CANCELLED, VOID, or unknown statuses
			return null
		}
	}

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
				if (
					allowedInvitationStatuses.includes(
						statusFilter as (typeof allowedInvitationStatuses)[number]
					)
				) {
					queryBuilder = queryBuilder.eq(
						'invitation_status',
						statusFilter as (typeof allowedInvitationStatuses)[number]
					)
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
	 * Find all tenants with lease and payment information
	 * Used for tenant list view with payment status
	 */
	async findAllWithLeaseInfo(
		userId: string,
		query: Record<string, unknown>
	): Promise<TenantWithLeaseInfo[]> {
		// Business logic: Validate userId
		if (!userId) {
			this.logger.warn(
				'Find all tenants with lease info requested without userId'
			)
			throw new BadRequestException('User ID is required')
		}

		try {
			this.logger.log(
				'Finding all tenants with lease info via direct Supabase query',
				{
					userId,
					query
				}
			)

			// Build and execute query
			let queryBuilder = this._buildTenantQuery(userId)
			queryBuilder = this._applyTenantFilters(queryBuilder, query)

			const { data, error } = await queryBuilder

			if (error) {
				this.logger.error(
					'Failed to fetch tenants with lease info from Supabase',
					{
						error: error.message,
						userId,
						query
					}
				)
				throw new BadRequestException('Failed to retrieve tenants')
			}

			if (!data || data.length === 0) {
				return []
			}

			// Fetch payment statuses for all tenants in a single query (fix N+1 problem)
			const tenants = data as TenantWithLeaseRelations[]
			const paymentMap = await this._fetchPaymentStatuses(tenants)

			// Transform raw database data to API response format
			return this._transformTenantData(tenants, paymentMap)
		} catch (error) {
			this.logger.error(
				'Tenants service failed to find all tenants with lease info',
				{
					error: error instanceof Error ? error.message : String(error),
					userId,
					query
				}
			)
			throw new BadRequestException('Failed to retrieve tenants')
		}
	}

	/**
	 * Build base Supabase query for tenants with lease information
	 * Includes all necessary joins for leases, units, and properties
	 */
	private _buildTenantQuery(userId: string) {
		const client = this.supabase.getAdminClient()

		return client
			.from('tenant')
			.select(
				`
				id,
				firstName,
				lastName,
				email,
				phone,
				avatarUrl,
				emergencyContact,
				createdAt,
				updatedAt,
				invitation_status,
				invitation_sent_at,
				invitation_accepted_at,
				invitation_expires_at,
				userId,
				lease!inner (
					id,
					startDate,
					endDate,
					rentAmount,
					securityDeposit,
					status,
					terms,
					unitId,
					unit:unitId (
						id,
						unitNumber,
						bedrooms,
						bathrooms,
						squareFeet,
						propertyId,
						property:propertyId (
							id,
							name,
							address,
							city,
							state,
							zipCode
						)
					)
				)
			`
			)
			.eq('userId', userId)
	}

	/**
	 * Apply filters to tenant query (status, search, invitation status, pagination)
	 */
	private _applyTenantFilters(
		queryBuilder: ReturnType<typeof this._buildTenantQuery>,
		query: Record<string, unknown>
	) {
		// Filter out MOVED_OUT and ARCHIVED tenants by default
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

		// Apply search filter
		if (query.search) {
			const searchTerm = String(query.search)
			const sanitized = sanitizeSearchInput(searchTerm)
			if (sanitized) {
				queryBuilder = queryBuilder.or(
					buildMultiColumnSearch(sanitized, ['firstName', 'lastName', 'email'])
				)
			}
		}

		// Apply invitation status filter
		if (query.invitationStatus) {
			const statusFilter = String(query.invitationStatus).toUpperCase()
			const allowedInvitationStatuses = [
				'PENDING',
				'SENT',
				'ACCEPTED',
				'EXPIRED',
				'REVOKED'
			] as const
			if (
				allowedInvitationStatuses.includes(
					statusFilter as (typeof allowedInvitationStatuses)[number]
				)
			) {
				queryBuilder = queryBuilder.eq(
					'invitation_status',
					statusFilter as (typeof allowedInvitationStatuses)[number]
				)
			}
		}

		// Apply pagination
		const limit = query.limit ? Number(query.limit) : 50
		const offset = query.offset ? Number(query.offset) : 0
		queryBuilder = queryBuilder.range(offset, offset + limit - 1)

		return queryBuilder
	}

	/**
	 * Fetch payment statuses for all tenants in a single query (fix N+1 problem)
	 */
	private async _fetchPaymentStatuses(tenants: TenantWithLeaseRelations[]) {
		const client = this.supabase.getAdminClient()

		const tenantIds = tenants.map(t => t.id)
		const leaseIds = tenants.flatMap(t => {
			const leases = Array.isArray(t.lease) ? t.lease : [t.lease]
			const currentLease = leases.find(l => l.status === 'ACTIVE') || leases[0]
			return currentLease ? [currentLease.id] : []
		})

		// Fetch most recent payment for each lease in one query
		const { data: payments, error: paymentsError } = await client
			.from('rent_payment')
			.select('tenantId, leaseId, status, dueDate')
			.in('tenantId', tenantIds)
			.in('leaseId', leaseIds)
			.order('dueDate', { ascending: false })

		if (paymentsError) {
			this.logger.warn('Failed to fetch payment statuses for tenants', {
				error: paymentsError.message,
				tenantIds,
				leaseIds
			})
			// Continue without payment data - statuses will be null
		}

		// Build a map of tenantId+leaseId -> most recent payment
		const paymentMap = new Map<
			string,
			{
				status: Database['public']['Enums']['RentPaymentStatus']
				dueDate: string
			}
		>()
		if (payments) {
			for (const payment of payments) {
				const key = `${payment.tenantId}-${payment.leaseId}`
				if (!paymentMap.has(key) && payment.status && payment.dueDate) {
					paymentMap.set(key, {
						status:
							payment.status as Database['public']['Enums']['RentPaymentStatus'],
						dueDate: payment.dueDate
					})
				}
			}
		}

		return paymentMap
	}

	/**
	 * Transform raw database tenant data to TenantWithLeaseInfo format
	 */
	private _transformTenantData(
		tenants: TenantWithLeaseRelations[],
		paymentMap: Map<
			string,
			{
				status: Database['public']['Enums']['RentPaymentStatus']
				dueDate: string
			}
		>
	): TenantWithLeaseInfo[] {
		return tenants.map(tenant => {
			const leases = Array.isArray(tenant.lease) ? tenant.lease : [tenant.lease]
			const currentLease = leases.find(l => l.status === 'ACTIVE') || leases[0]

			// Get payment status from the pre-fetched map
			let paymentStatus: string | null = null
			if (currentLease) {
				const key = `${tenant.id}-${currentLease.id}`
				const payment = paymentMap.get(key) || null
				paymentStatus = this.calculatePaymentStatus(payment)
			}

			// Calculate other derived fields
			const monthlyRent = currentLease?.rentAmount || 0
			const leaseStatus = currentLease?.status || 'None'
			const unitDisplay = currentLease?.unit
				? `Unit ${currentLease.unit.unitNumber}`
				: 'No unit assigned'
			const propertyDisplay = currentLease?.unit?.property
				? `${currentLease.unit.property.name}, ${currentLease.unit.property.city}`
				: 'No property assigned'
			const leaseStart = currentLease?.startDate || null
			const leaseEnd = currentLease?.endDate || null

			const result: TenantWithLeaseInfo = {
				id: tenant.id,
				name: `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim(),
				email: tenant.email,
				phone: tenant.phone,
				avatarUrl: tenant.avatarUrl,
				emergencyContact: tenant.emergencyContact,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
				invitation_status:
					tenant.invitation_status as TenantWithLeaseInfo['invitation_status'],
				invitation_sent_at: tenant.invitation_sent_at,
				invitation_accepted_at: tenant.invitation_accepted_at,
				invitation_expires_at: tenant.invitation_expires_at,
				currentLease: currentLease
					? {
							id: currentLease.id,
							startDate: currentLease.startDate,
							endDate: currentLease.endDate,
							rentAmount: currentLease.rentAmount,
							securityDeposit: currentLease.securityDeposit,
							status: currentLease.status,
							terms: currentLease.terms
						}
					: null,
				leases: leases.map(lease => ({
					id: lease.id,
					startDate: lease.startDate,
					endDate: lease.endDate,
					rentAmount: lease.rentAmount,
					status: lease.status,
					...(lease.unit?.property
						? { property: { address: lease.unit.property.address } }
						: {})
				})),
				unit: currentLease?.unit
					? {
							id: currentLease.unit.id,
							unitNumber: currentLease.unit.unitNumber,
							bedrooms: currentLease.unit.bedrooms,
							bathrooms: currentLease.unit.bathrooms,
							squareFootage: currentLease.unit.squareFeet
						}
					: null,
				property: currentLease?.unit?.property
					? {
							id: currentLease.unit.property.id,
							name: currentLease.unit.property.name,
							address: currentLease.unit.property.address,
							city: currentLease.unit.property.city,
							state: currentLease.unit.property.state,
							zipCode: currentLease.unit.property.zipCode
						}
					: null,
				// Derived fields for UI display
				monthlyRent,
				leaseStatus,
				paymentStatus,
				unitDisplay,
				propertyDisplay,
				leaseStart,
				leaseEnd
			}

			return result
		})
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
	 * Find one tenant with full lease and unit information
	 * Returns tenant even if they have no leases (lease fields will be null)
	 * Optimized query for tenant detail pages
	 */
	async findOneWithLease(
		userId: string,
		tenantId: string
	): Promise<TenantWithLeaseInfo | null> {
		if (!userId || !tenantId) {
			this.logger.warn(
				'Find one tenant with lease requested with missing parameters',
				{
					userId,
					tenantId
				}
			)
			return null
		}

		try {
			this.logger.log('Finding tenant with lease info', { userId, tenantId })

			const client = this.supabase.getAdminClient()

			// Fetch tenant with all related information
			// Note: Using lease (not lease!inner) to return tenants even without leases
			const { data: tenant, error: tenantError } = await client
				.from('tenant')
				.select(
					`
					*,
					lease (
						id,
						startDate,
						endDate,
						rentAmount,
						securityDeposit,
						status,
						terms,
						unitId,
						unit:unitId (
							id,
							unitNumber,
							bedrooms,
							bathrooms,
							squareFeet,
							propertyId,
							property:propertyId (
								id,
								name,
								address,
								city,
								state,
								zipCode
							)
						)
					)
				`
				)
				.eq('id', tenantId)
				.eq('userId', userId)
				.single()

			if (tenantError) {
				this.logger.error('Failed to fetch tenant with lease', {
					error: tenantError.message,
					userId,
					tenantId
				})
				return null
			}

			if (!tenant) {
				return null
			}

			// Transform to TenantWithLeaseInfo format
			// Handle cases: lease can be null, undefined, single object, or array
			const leases = Array.isArray(tenant.lease)
				? tenant.lease
				: tenant.lease
					? [tenant.lease]
					: []
			const currentLease =
				leases.find(l => l.status === 'ACTIVE') || leases[0] || null

			// Calculate payment status from rent_payment table
			let paymentStatus: string | null = null
			if (currentLease) {
				const { data: recentPayments, error: paymentsError } = await client
					.from('rent_payment')
					.select('status, dueDate')
					.eq('tenantId', tenantId)
					.eq('leaseId', currentLease.id)
					.order('dueDate', { ascending: false })
					.limit(1)

				if (paymentsError) {
					this.logger.warn('Failed to fetch payment status for tenant', {
						error: paymentsError.message,
						tenantId,
						leaseId: currentLease.id
					})
					// Continue without payment data - status will remain null
				} else if (recentPayments && recentPayments.length > 0) {
					const payment = recentPayments[0]
					// Type assertion for payment status from database
					const typedPayment = payment
						? {
								status: payment.status as
									| Database['public']['Enums']['RentPaymentStatus']
									| null,
								dueDate: payment.dueDate
							}
						: null
					paymentStatus = this.calculatePaymentStatus(typedPayment)
				}
			}

			// Calculate other derived fields
			const monthlyRent = currentLease?.rentAmount || 0
			const leaseStatus = currentLease?.status || 'None'
			const unitDisplay = currentLease?.unit
				? `Unit ${currentLease.unit.unitNumber}`
				: 'No unit assigned'
			const propertyDisplay = currentLease?.unit?.property
				? `${currentLease.unit.property.name}, ${currentLease.unit.property.city}`
				: 'No property assigned'
			const leaseStart = currentLease?.startDate || null
			const leaseEnd = currentLease?.endDate || null

			const result: TenantWithLeaseInfo = {
				id: tenant.id,
				name: `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim(),
				email: tenant.email,
				phone: tenant.phone,
				avatarUrl: tenant.avatarUrl,
				emergencyContact: tenant.emergencyContact,
				createdAt: tenant.createdAt,
				updatedAt: tenant.updatedAt,
				invitation_status:
					tenant.invitation_status as TenantWithLeaseInfo['invitation_status'],
				invitation_sent_at: tenant.invitation_sent_at,
				invitation_accepted_at: tenant.invitation_accepted_at,
				invitation_expires_at: tenant.invitation_expires_at,
				currentLease: currentLease
					? {
							id: currentLease.id,
							startDate: currentLease.startDate,
							endDate: currentLease.endDate,
							rentAmount: currentLease.rentAmount,
							securityDeposit: currentLease.securityDeposit,
							status: currentLease.status,
							terms: currentLease.terms
						}
					: null,
				leases: leases.map(lease => {
					const leaseItem: {
						id: string
						startDate: string
						endDate: string | null
						rentAmount: number
						status: string
						property?: { address: string }
					} = {
						id: lease.id,
						startDate: lease.startDate,
						endDate: lease.endDate,
						rentAmount: lease.rentAmount,
						status: lease.status
					}

					if (lease.unit?.property) {
						leaseItem.property = {
							address: lease.unit.property.address
						}
					}

					return leaseItem
				}),
				unit: currentLease?.unit
					? {
							id: currentLease.unit.id,
							unitNumber: currentLease.unit.unitNumber,
							bedrooms: currentLease.unit.bedrooms,
							bathrooms: currentLease.unit.bathrooms,
							squareFootage: currentLease.unit.squareFeet
						}
					: null,
				property: currentLease?.unit?.property
					? {
							id: currentLease.unit.property.id,
							name: currentLease.unit.property.name,
							address: currentLease.unit.property.address,
							city: currentLease.unit.property.city,
							state: currentLease.unit.property.state,
							zipCode: currentLease.unit.property.zipCode
						}
					: null,
				// Derived fields for UI display
				monthlyRent,
				leaseStatus,
				paymentStatus,
				unitDisplay,
				propertyDisplay,
				leaseStart,
				leaseEnd
			}

			return result
		} catch (error) {
			this.logger.error('Failed to find tenant with lease', {
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
			this.logger.warn('Create tenant requested without authenticated user ID')
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
				userId
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
					userId
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
				userId
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
	 * Get notification preferences for a tenant
	 */
	async getNotificationPreferences(
		userId: string,
		tenantId: string
	): Promise<Record<string, boolean> | null> {
		const client = this.supabase.getAdminClient()

		// Fetch tenant's notification preferences
		// FIX: Use userId instead of ownerId to match tenant table schema
		const { data, error } = await client
			.from('tenant')
			.select('notification_preferences')
			.eq('id', tenantId)
			.eq('userId', userId)
			.single()

		if (error) {
			this.logger.error(
				`Failed to fetch notification preferences for tenant ${tenantId}`,
				{ error }
			)
			return null
		}

		// Return preferences or default values
		return (
			(data.notification_preferences as Record<string, boolean>) ||
			DEFAULT_NOTIFICATION_PREFERENCES
		)
	}

	/**
	 * Update notification preferences for a tenant
	 */
	async updateNotificationPreferences(
		userId: string,
		tenantId: string,
		preferences: Record<string, boolean>
	): Promise<Record<string, boolean> | null> {
		const client = this.supabase.getAdminClient()

		// Get current preferences
		// FIX: Use userId instead of ownerId to match tenant table schema
		const { data: currentData } = await client
			.from('tenant')
			.select('notification_preferences')
			.eq('id', tenantId)
			.eq('userId', userId)
			.single()

		if (!currentData) {
			return null
		}

		// Merge with current preferences (partial update)
		const updatedPreferences = {
			...(currentData.notification_preferences as Record<string, boolean>),
			...preferences
		}

		// Update preferences
		// FIX: Use userId instead of ownerId to match tenant table schema
		const { data, error } = await client
			.from('tenant')
			.update({ notification_preferences: updatedPreferences })
			.eq('id', tenantId)
			.eq('userId', userId)
			.select('notification_preferences')
			.single()

		if (error) {
			this.logger.error(
				`Failed to update notification preferences for tenant ${tenantId}`,
				{ error }
			)
			throw new BadRequestException('Failed to update notification preferences')
		}

		return data.notification_preferences as Record<string, boolean>
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

			const client = this.supabase.getAdminClient()

			// 🔐 BUG FIX #1: Atomic check for existing auth user BEFORE invitation
			// This prevents race condition where two simultaneous invitations create duplicate auth users
			const { data: existingUsers, error: listError } =
				await client.auth.admin.listUsers()
			if (listError) {
				this.logger.error('Failed to list auth users', {
					error: listError.message
				})
				throw new BadRequestException('Failed to verify email uniqueness')
			}

			const existingAuthUser = existingUsers.users.find(
				u => u.email?.toLowerCase() === tenant.email.toLowerCase()
			)

			if (existingAuthUser) {
				this.logger.warn('Auth user already exists for this email', {
					existingAuthUserId: existingAuthUser.id
				})

				// Link existing auth user to tenant if not already linked
				if (!tenant.auth_user_id) {
					const { error: linkError } = await client
						.from('tenant')
						.update({
							auth_user_id: existingAuthUser.id,
							invitation_status:
								'SENT' as Database['public']['Enums']['invitation_status']
						})
						.eq('id', tenantId)
						.eq('userId', userId)

					if (linkError) {
						this.logger.error('Failed to link existing auth user to tenant', {
							error: linkError.message,
							tenantId,
							authUserId: existingAuthUser.id
						})
					}
				}

				return {
					success: false,
					message: 'Account already exists for this email',
					authUserId: existingAuthUser.id
				}
			}

			// 3. Get property/unit info for email metadata
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
			const { data: authUser, error: authError } =
				await client.auth.admin.inviteUserByEmail(tenant.email, {
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
				})

			if (authError || !authUser?.user) {
				// Handle duplicate email error specifically
				if (
					authError?.message?.includes('already') ||
					authError?.message?.includes('exists')
				) {
					this.logger.error(
						'Race condition detected: Auth user created between check and invite',
						{
							error: authError.message
						}
					)
					throw new ConflictException(
						'Account already exists for this email. Please try again.'
					)
				}

				this.logger.error('Failed to send Supabase Auth invitation', {
					error: authError?.message
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
					invitation_status:
						'SENT' as Database['public']['Enums']['invitation_status'],
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
				authUserId: authUser.user.id
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

			if (
				error instanceof BadRequestException ||
				error instanceof ConflictException
			) {
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
		this.logger.log('Creating tenant with lease and sending invitation', {
			userId,
			propertyId: leaseData.propertyId,
			unitId: leaseData.unitId
		})

		/**
		 * CURRENCY CONVENTION: All rent amounts are stored and processed in CENTS
		 *
		 * - Frontend sends: cents (e.g., 250000 = $2,500.00)
		 * - Backend stores: cents in database
		 * - Stripe receives: cents (native format)
		 *
		 * BUG FIX: Removed double conversion (backend was multiplying cents by 100 again)
		 * Previously: Frontend sent cents → Backend multiplied by 100 → Stripe received wrong amount
		 * Now: Frontend sends cents → Backend validates as-is → Stripe receives correct amount
		 *
		 * @param leaseData.rentAmount - Rent amount in CENTS (must be positive integer)
		 * @throws BadRequestException if rentAmount is invalid or out of Stripe's range
		 */

		// Validate rent amount presence
		if (leaseData.rentAmount === null || leaseData.rentAmount === undefined) {
			throw new BadRequestException('rentAmount is required')
		}

		// Parse and round to integer cents (handles string or number input)
		const rentAmountCents =
			typeof leaseData.rentAmount === 'string'
				? Math.round(parseFloat(leaseData.rentAmount))
				: Math.round(leaseData.rentAmount)

		// Validate is finite number
		if (!Number.isFinite(rentAmountCents)) {
			throw new BadRequestException('rentAmount must be a valid number')
		}

		// Validate is integer (cents must be whole numbers)
		if (!Number.isInteger(rentAmountCents)) {
			throw new BadRequestException('rentAmount must be an integer (cents)')
		}

		// Validate range (already in cents)
		const MAX_STRIPE_AMOUNT = 99999999 // Stripe limit in cents ($999,999.99)

		if (rentAmountCents < 0) {
			throw new BadRequestException('rentAmount must be non-negative')
		}

		if (rentAmountCents > MAX_STRIPE_AMOUNT) {
			throw new BadRequestException(
				`rentAmount exceeds maximum allowed value ($${(MAX_STRIPE_AMOUNT / 100).toLocaleString()})`
			)
		}

		const client = this.supabase.getAdminClient()

		// 🔐 BUG FIX #2: Use Saga pattern for transactional tenant+lease+auth creation
		// This ensures proper rollback if any step fails, with comprehensive logging
		let createdTenant: Tenant | null = null
		let createdLease: { id: string } | null = null
		let createdAuthUser: { id: string; email?: string } | null = null

		const result = await new SagaBuilder(this.logger)
			.addStep({
				name: 'Check for existing auth user (prevent race condition)',
				execute: () => this.checkExistingAuthUser(tenantData.email),
				compensate: async () => Promise.resolve()
			})
			.addStep({
				name: 'Create tenant record',
				execute: async () => {
					createdTenant = await this.createTenantRecord(tenantData, userId)
					return createdTenant
				},
				compensate: async (tenant: unknown) => {
					// Rollback: Delete tenant record
					if (
						tenant &&
						typeof tenant === 'object' &&
						'id' in tenant &&
						tenant.id
					) {
						await client.from('tenant').delete().eq('id', String(tenant.id))
						this.logger.log('Compensated: Deleted tenant', {
							tenantId: tenant.id
						})
					}
				}
			})
			.addStep({
				name: 'Create lease record',
				execute: async () => {
					if (!createdTenant) {
						throw new BadRequestException('Tenant not created')
					}
					createdLease = await this.createLeaseRecord(createdTenant.id, {
						...leaseData,
						rentAmount: rentAmountCents
					})
					return createdLease
				},
				compensate: async (lease: { id: string } | null) => {
					// Rollback: Delete lease record
					if (lease && typeof lease === 'object' && 'id' in lease && lease.id) {
						await client.from('lease').delete().eq('id', String(lease.id))
						this.logger.log('Compensated: Deleted lease', { leaseId: lease.id })
					}
				}
			})
			.addStep({
				name: 'Verify owner Connected Account',
				execute: () => this.verifyOwnerConnectedAccount(userId),
				compensate: async () => Promise.resolve()
			})
			.addStep({
				name: 'Create Stripe Customer on Connected Account',
				execute: async () => {
					if (!createdTenant || !createdLease) {
						throw new BadRequestException('Tenant or lease not created')
					}

					// Get owner's connected account ID
					const { data: owner } = await client
						.from('users')
						.select('connectedAccountId')
						.eq('id', userId)
						.single()

					if (!owner?.connectedAccountId) {
						throw new BadRequestException('Connected account not found')
					}

					return this.createStripeCustomer(
						createdTenant,
						createdLease.id,
						owner.connectedAccountId
					)
				},
				compensate: async (
					result: {
						customerId: string
						connectedAccountId: string
					} | null
				) => {
					// Rollback: Delete Stripe Customer
					if (result && result.customerId && result.connectedAccountId) {
						try {
							const stripe = this.stripeConnectService.getStripe()
							await stripe.customers.del(result.customerId, {
								stripeAccount: result.connectedAccountId
							})
							this.logger.log('Compensated: Deleted Stripe Customer', {
								customerId: result.customerId
							})
						} catch (error) {
							this.logger.error(
								'Failed to delete Stripe Customer during compensation',
								{ error }
							)
						}
					}
				}
			})
			.addStep({
				name: 'Create Stripe Subscription for Rent Payment',
				execute: async () => {
					if (!createdTenant || !createdLease) {
						throw new BadRequestException('Tenant or lease not created')
					}

					// Get owner's connected account
					const { data: owner } = await client
						.from('users')
						.select('connectedAccountId')
						.eq('id', userId)
						.single()

					if (!owner?.connectedAccountId) {
						throw new BadRequestException('Connected account not found')
					}

					return this.createStripeSubscription(
						createdTenant.id,
						createdLease.id,
						{
							...leaseData,
							rentAmount: rentAmountCents
						},
						owner.connectedAccountId
					)
				},
				compensate: async (
					result: {
						subscriptionId: string
						connectedAccountId: string
					} | null
				) => {
					// Rollback: Cancel Stripe Subscription
					if (result && result.subscriptionId && result.connectedAccountId) {
						try {
							const stripe = this.stripeConnectService.getStripe()
							await stripe.subscriptions.cancel(result.subscriptionId, {
								stripeAccount: result.connectedAccountId
							})
							this.logger.log('Compensated: Canceled Stripe Subscription', {
								subscriptionId: result.subscriptionId
							})
						} catch (error) {
							this.logger.error(
								'Failed to cancel Stripe Subscription during compensation',
								{ error }
							)
						}
					}
				}
			})
			.addStep({
				name: 'Send Supabase Auth invitation',
				execute: async () => {
					if (!createdTenant || !createdLease) {
						throw new BadRequestException('Tenant or lease not created')
					}

					createdAuthUser = await this.sendAuthInvitation(
						createdTenant,
						leaseData,
						createdLease.id,
						rentAmountCents
					)
					return createdAuthUser
				},
				compensate: async (authUser: { id: string } | null) => {
					// Rollback: Delete auth user
					if (
						authUser &&
						typeof authUser === 'object' &&
						'id' in authUser &&
						authUser.id
					) {
						try {
							await client.auth.admin.deleteUser(String(authUser.id))
							this.logger.log('Compensated: Deleted auth user', {
								authUserId: authUser.id
							})
						} catch (error) {
							this.logger.error(
								'Failed to delete auth user during compensation',
								{
									error: error instanceof Error ? error.message : String(error),
									authUserId: authUser.id
								}
							)
						}
					}
				}
			})
			.addStep({
				name: 'Link tenant to auth user',
				execute: async () => {
					if (!createdTenant || !createdAuthUser) {
						throw new BadRequestException('Tenant or auth user not created')
					}
					return this.linkTenantToAuthUser(createdTenant.id, createdAuthUser.id)
				},
				compensate: async () => {
					// Rollback: Unlink tenant from auth user
					if (createdTenant) {
						await client
							.from('tenant')
							.update({
								auth_user_id: null,
								invitation_status:
									'PENDING' as Database['public']['Enums']['invitation_status'],
								invitation_sent_at: null
							})
							.eq('id', createdTenant.id)
						this.logger.log('Compensated: Unlinked tenant from auth user', {
							tenantId: createdTenant.id
						})
					}
				}
			})
			.execute()

		if (!result.success) {
			this.logger.error('Tenant invitation saga failed', {
				error: result.error?.message,
				completedSteps: result.completedSteps,
				compensatedSteps: result.compensatedSteps
			})
			throw (
				result.error ||
				new BadRequestException('Failed to invite tenant with lease')
			)
		}

		this.logger.log('Tenant invitation complete', {
			tenantId: createdTenant!.id,
			leaseId: createdLease!.id,
			authUserId: createdAuthUser!.id
		})

		return {
			success: true,
			tenantId: createdTenant!.id,
			leaseId: createdLease!.id,
			authUserId: createdAuthUser!.id,
			message: 'Tenant created and invitation sent successfully'
		}
	}

	/**
	 * SAGA STEP 1: Check for existing auth user with pagination
	 * Prevents race conditions by checking all pages of users
	 */
	private async checkExistingAuthUser(
		email: string
	): Promise<{ checked: boolean }> {
		const client = this.supabase.getAdminClient()
		const emailToCheck = email.toLowerCase()
		let page = 1
		let hasMore = true

		while (hasMore) {
			const { data: userData, error: listError } =
				await client.auth.admin.listUsers({
					page,
					perPage: 1000 // Max allowed per page
				})

			if (listError) {
				throw new BadRequestException('Failed to verify email uniqueness')
			}

			// Check if email exists in this page
			const existingUser = userData.users.find(
				u => u.email?.toLowerCase() === emailToCheck
			)

			if (existingUser) {
				throw new ConflictException('Account already exists for this email')
			}

			// Check if there are more pages
			hasMore = userData.users.length === 1000
			page++
		}

		return { checked: true }
	}

	/**
	 * SAGA STEP 2: Create tenant record in database
	 */
	private async createTenantRecord(
		tenantData: {
			email: string
			firstName: string
			lastName: string
			phone?: string
		},
		userId: string
	): Promise<Tenant> {
		const client = this.supabase.getAdminClient()

		const { data: tenant, error: tenantError } = await client
			.from('tenant')
			.insert({
				email: tenantData.email,
				firstName: tenantData.firstName,
				lastName: tenantData.lastName,
				phone: tenantData.phone ?? null,
				userId,
				status: 'PENDING' as Database['public']['Enums']['TenantStatus'],
				invitation_status:
					'PENDING' as Database['public']['Enums']['invitation_status']
			})
			.select()
			.single()

		if (tenantError || !tenant) {
			throw new BadRequestException(
				`Failed to create tenant: ${tenantError?.message || 'Unknown error'}`
			)
		}

		this.logger.log('Tenant created successfully', {
			tenantId: tenant.id
		})

		return tenant as Tenant
	}

	/**
	 * SAGA STEP 3: Create lease record in database
	 */
	private async createLeaseRecord(
		tenantId: string,
		leaseData: {
			propertyId: string
			unitId?: string
			rentAmount: number
			securityDeposit: number
			startDate: string
			endDate: string
		}
	): Promise<{ id: string }> {
		const client = this.supabase.getAdminClient()

		const { data: lease, error: leaseError } = await client
			.from('lease')
			.insert({
				tenantId,
				propertyId: leaseData.propertyId,
				unitId: leaseData.unitId || null,
				rentAmount: leaseData.rentAmount,
				// monthlyRent is a GENERATED ALWAYS column (copies rentAmount automatically)
				securityDeposit: leaseData.securityDeposit,
				startDate: leaseData.startDate,
				endDate: leaseData.endDate,
				status: 'DRAFT' as Database['public']['Enums']['LeaseStatus'] // FIX: PENDING doesn't exist in LeaseStatus enum
			})
			.select()
			.single()

		if (leaseError || !lease) {
			throw new BadRequestException(
				`Failed to create lease: ${leaseError?.message || 'Unknown error'}`
			)
		}

		this.logger.log('Lease created successfully', { leaseId: lease.id })
		return lease
	}

	/**
	 * SAGA STEP 4: Verify owner has completed Stripe Connect onboarding
	 */
	private async verifyOwnerConnectedAccount(
		userId: string
	): Promise<{ connectedAccountId: string; ownerEmail: string }> {
		const client = this.supabase.getAdminClient()

		const { data: owner, error: ownerError } = await client
			.from('users')
			.select('connectedAccountId, onboardingComplete, email')
			.eq('id', userId)
			.single()

		if (ownerError || !owner) {
			throw new BadRequestException('owner not found')
		}

		if (!owner.connectedAccountId) {
			throw new BadRequestException(
				'Please complete Stripe onboarding before inviting tenants. Go to Settings → Billing to set up payments.'
			)
		}

		if (!owner.onboardingComplete) {
			throw new BadRequestException(
				'Your Stripe account setup is incomplete. Please complete onboarding in Settings → Billing before inviting tenants.'
			)
		}

		this.logger.log('owner Connected Account verified', {
			connectedAccountId: owner.connectedAccountId
		})

		return {
			connectedAccountId: owner.connectedAccountId,
			ownerEmail: owner.email
		}
	}

	/**
	 * SAGA STEP 5: Create Stripe Customer on owner's Connected Account
	 */
	private async createStripeCustomer(
		tenant: Tenant,
		leaseId: string,
		connectedAccountId: string
	): Promise<{ customerId: string; connectedAccountId: string }> {
		const client = this.supabase.getAdminClient()
		const stripe = this.stripeConnectService.getStripe()

		// Create Stripe Customer on connected account
		const customer = await stripe.customers.create(
			{
				email: tenant.email,
				name: `${tenant.firstName} ${tenant.lastName}`,
				...(tenant.phone && { phone: tenant.phone }),
				metadata: {
					tenantId: tenant.id,
					leaseId,
					platform: 'tenantflow'
				}
			},
			{
				stripeAccount: connectedAccountId
			}
		)

		// Store Stripe Customer ID in tenant record
		const { error: updateError } = await client
			.from('tenant')
			.update({ stripeCustomerId: customer.id })
			.eq('id', tenant.id)

		if (updateError) {
			this.logger.error('Failed to save stripeCustomerId', {
				error: updateError
			})
			// Don't throw - we'll try to delete the Stripe customer in compensation
		}

		this.logger.log('Stripe Customer created on Connected Account', {
			customerId: customer.id,
			connectedAccountId
		})

		return {
			customerId: customer.id,
			connectedAccountId
		}
	}

	/**
	 * SAGA STEP 6: Create Stripe Subscription for rent payment
	 */
	private async createStripeSubscription(
		tenantId: string,
		leaseId: string,
		leaseData: {
			propertyId: string
			unitId?: string
			rentAmount: number
		},
		connectedAccountId: string
	): Promise<{
		subscriptionId: string
		priceId: string
		connectedAccountId: string
	}> {
		const client = this.supabase.getAdminClient()
		const stripe = this.stripeConnectService.getStripe()

		// Get tenant's Stripe Customer ID
		const { data: tenant } = await client
			.from('tenant')
			.select('stripeCustomerId')
			.eq('id', tenantId)
			.single()

		if (!tenant?.stripeCustomerId) {
			throw new BadRequestException('Missing Stripe customer information')
		}

		// Create a Price for the rent amount on the connected account
		const price = await stripe.prices.create(
			{
				currency: 'usd',
				unit_amount: leaseData.rentAmount,
				recurring: {
					interval: 'month',
					interval_count: 1
				},
				product_data: {
					name: 'Monthly Rent'
				},
				metadata: {
					leaseId,
					tenantId,
					propertyId: leaseData.propertyId,
					...(leaseData.unitId && { unitId: leaseData.unitId })
				}
			},
			{
				stripeAccount: connectedAccountId
			}
		)

		// Create subscription (NO application fee - owner gets 100% of rent)
		const subscription = await stripe.subscriptions.create(
			{
				customer: tenant.stripeCustomerId,
				items: [{ price: price.id }],
				payment_behavior: 'default_incomplete',
				payment_settings: {
					payment_method_types: ['card'],
					save_default_payment_method: 'on_subscription'
				},
				expand: ['latest_invoice.payment_intent'],
				metadata: {
					leaseId,
					tenantId,
					propertyId: leaseData.propertyId,
					...(leaseData.unitId && { unitId: leaseData.unitId }),
					platform: 'tenantflow'
				},
				billing_cycle_anchor_config: {
					day_of_month: 1 // Rent due on 1st of each month
				}
			},
			{
				stripeAccount: connectedAccountId
			}
		)

		// Store Stripe Subscription ID in lease record
		const { error: updateError } = await client
			.from('lease')
			.update({ stripeSubscriptionId: subscription.id })
			.eq('id', leaseId)

		if (updateError) {
			this.logger.error('Failed to save stripeSubscriptionId', {
				error: updateError
			})
		}

		this.logger.log('Stripe Subscription created for rent payment', {
			subscriptionId: subscription.id,
			priceId: price.id,
			rentAmount: leaseData.rentAmount,
			connectedAccountId
		})

		return {
			subscriptionId: subscription.id,
			priceId: price.id,
			connectedAccountId
		}
	}

	/**
	 * SAGA STEP 7: Send Supabase Auth invitation email
	 */
	private async sendAuthInvitation(
		tenant: Tenant,
		leaseData: {
			propertyId: string
			unitId?: string
			startDate: string
			endDate: string
		},
		leaseId: string,
		rentAmountCents: number
	): Promise<{ id: string; email?: string }> {
		const client = this.supabase.getAdminClient()

		// Get property/unit info for email metadata
		const { data: property } = await client
			.from('property')
			.select('name')
			.eq('id', leaseData.propertyId)
			.single()

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
		const frontendUrl = process.env.FRONTEND_URL || 'https://tenantflow.app'

		const { data: authUser, error: authError } =
			await client.auth.admin.inviteUserByEmail(tenant.email, {
				data: {
					tenantId: tenant.id,
					leaseId,
					propertyId: leaseData.propertyId,
					...(leaseData.unitId && { unitId: leaseData.unitId }),
					firstName: tenant.firstName,
					lastName: tenant.lastName,
					propertyName,
					...(unitNumber && { unitNumber }),
					rentAmount: rentAmountCents,
					startDate: leaseData.startDate,
					endDate: leaseData.endDate,
					role: 'tenant'
				},
				redirectTo: `${frontendUrl}/auth/confirm`
			})

		if (authError || !authUser?.user) {
			// Handle race condition where user was created between check and invite
			if (
				authError?.message?.includes('already') ||
				authError?.message?.includes('exists')
			) {
				throw new ConflictException('Account already exists for this email')
			}
			throw new BadRequestException(
				`Failed to send invitation: ${authError?.message || 'Unknown error'}`
			)
		}

		this.logger.log('Supabase Auth invitation sent successfully', {
			authUserId: authUser.user.id
		})

		return authUser.user
	}

	/**
	 * SAGA STEP 8: Link tenant to auth user
	 */
	private async linkTenantToAuthUser(
		tenantId: string,
		authUserId: string
	): Promise<{ linked: boolean }> {
		const client = this.supabase.getAdminClient()

		const { error: updateError } = await client
			.from('tenant')
			.update({
				auth_user_id: authUserId,
				invitation_status:
					'SENT' as Database['public']['Enums']['invitation_status'],
				invitation_sent_at: new Date().toISOString()
			})
			.eq('id', tenantId)

		if (updateError) {
			throw new BadRequestException(
				`Failed to link tenant to auth user: ${updateError.message}`
			)
		}

		this.logger.log('Tenant linked to auth user', {
			tenantId,
			authUserId
		})

		return { linked: true }
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

			// Resend invitation via Supabase Auth
			// This will generate a new invitation email
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
			this.logger.log('Validating invitation token', {
				tokenLength: token.length
			})

			// Query tenant by invitation token
			const client = this.supabase.getAdminClient()
			const { data: tenant, error } = await client
				.from('tenant')
				.select(
					'id, email, firstName, invitation_status, invitation_expires_at'
				)
				.eq('invitation_token', token)
				.single()

			if (error || !tenant) {
				this.logger.warn('Invitation token not found', {
					error: error?.message
				})
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
			const expiresAt = tenant.invitation_expires_at
				? new Date(tenant.invitation_expires_at)
				: null
			const now = new Date()
			const expired = expiresAt ? expiresAt < now : false

			if (expired) {
				return {
					valid: false,
					expired: true,
					already_accepted: false,
					tenant_email: tenant.email,
					...(tenant.firstName && { tenant_first_name: tenant.firstName }),
					...(tenant.invitation_expires_at && {
						expires_at: tenant.invitation_expires_at
					})
				}
			}

			// Valid invitation
			return {
				valid: true,
				expired: false,
				already_accepted: false,
				tenant_email: tenant.email,
				...(tenant.firstName && { tenant_first_name: tenant.firstName }),
				...(tenant.invitation_expires_at && {
					expires_at: tenant.invitation_expires_at
				})
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
			const { data, error } = await client.rpc(
				'activate_tenant_from_auth_user',
				{
					p_auth_user_id: authUserId
				}
			)

			if (error) {
				this.logger.error('Database function failed', {
					error: error.message,
					authUserId
				})
				throw new BadRequestException('Failed to activate tenant')
			}

			// Database function returns { tenant_id, activated }
			// Runtime validation with Zod
			const validationResult = activateTenantResultSchema.safeParse(data)
			if (!validationResult.success) {
				this.logger.error('Activate tenant result validation failed', {
					authUserId,
					errors: validationResult.error.issues
				})
				throw new BadRequestException(
					'Invalid response from database - schema validation failed'
				)
			}

			const result = validationResult.data

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
				tenantId: firstResult.id,
				authUserId
			})

			return {
				success: true,
				tenantId: firstResult.id,
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

	// ========================================
	// Emergency Contact Methods
	// ========================================

	/**
	 * Get emergency contact for a tenant
	 * Ensures owner can only access their own tenant's emergency contact
	 */
	async getEmergencyContact(
		userId: string,
		tenantId: string
	): Promise<EmergencyContactResponse | null> {
		const client = this.supabase.getAdminClient()

		// BUG FIX #3: Validate complete ownership chain
		// Verify tenant exists and get their info
		const { data: tenant, error: tenantError } = await client
			.from('tenant')
			.select('id, userId')
			.eq('id', tenantId)
			.single()

		if (tenantError || !tenant) {
			this.logger.warn('Tenant not found', { userId, tenantId })
			return null
		}

		// Verify tenant belongs to a property owned by requesting user
		// Check through lease -> property -> owner relationship
		const { data: lease, error: leaseError } = await client
			.from('lease')
			.select('id, propertyId')
			.eq('tenantId', tenantId)
			.single()

		if (leaseError || !lease) {
			this.logger.warn('No lease found for tenant', { tenantId })
			throw new NotFoundException('No lease found for tenant')
		}

		// Verify property ownership
		if (!lease.propertyId) {
			this.logger.warn('Lease has no property', { tenantId, leaseId: lease.id })
			throw new NotFoundException('Lease has no associated property')
		}

		const { data: property, error: propertyError } = await client
			.from('property')
			.select('ownerId')
			.eq('id', lease.propertyId!)
			.single()

		if (propertyError || !property || property.ownerId !== userId) {
			this.logger.warn('Access denied: Not property owner', {
				userId,
				propertyOwnerId: property?.ownerId
			})
			throw new ForbiddenException('Access denied: Not property owner')
		}

		// Fetch emergency contact (RLS will double-check access)
		const { data, error } = await client
			.from('tenant_emergency_contact')
			.select('*')
			.eq('tenant_id', tenantId)
			.single()

		if (error) {
			// No emergency contact found is not an error
			if (error.code === 'PGRST116') {
				return null
			}
			this.logger.error('Failed to fetch emergency contact', {
				error: error.message,
				tenantId
			})
			return null
		}

		return mapEmergencyContactToResponse(data)
	}

	/**
	 * Create emergency contact for a tenant
	 * Enforces one-to-one relationship (unique constraint on tenant_id)
	 */
	async createEmergencyContact(
		userId: string,
		tenantId: string,
		data: {
			contactName: string
			relationship: string
			phoneNumber: string
			email?: string | null
		}
	): Promise<{
		id: string
		tenantId: string
		contactName: string
		relationship: string
		phoneNumber: string
		email: string | null
		createdAt: string
		updatedAt: string
	} | null> {
		const client = this.supabase.getAdminClient()

		// Verify ownership
		const { data: tenant } = await client
			.from('tenant')
			.select('id')
			.eq('id', tenantId)
			.eq('userId', userId)
			.single()

		if (!tenant) {
			this.logger.warn('Tenant not found or access denied', {
				userId,
				tenantId
			})
			throw new BadRequestException('Tenant not found or access denied')
		}

		// Validate phone number format - E.164 international format or common US formats
		const phoneRegex =
			/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
		if (!phoneRegex.test(data.phoneNumber)) {
			throw new BadRequestException(
				'Invalid phone number format. Please enter a valid international or US phone number.'
			)
		}

		// Validate email format if provided - RFC 5322 simplified
		if (data.email) {
			const emailRegex =
				/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
			if (!emailRegex.test(data.email)) {
				throw new BadRequestException(
					'Invalid email format. Please enter a valid email address.'
				)
			}
		}

		// Create emergency contact
		const { data: created, error } = await client
			.from('tenant_emergency_contact')
			.insert({
				tenant_id: tenantId,
				contact_name: data.contactName,
				relationship: data.relationship,
				phone_number: data.phoneNumber,
				email: data.email || null
			})
			.select('*')
			.single()

		if (error) {
			// Handle unique constraint violation (one-to-one)
			if (error.code === '23505') {
				this.logger.warn('Emergency contact already exists for tenant', {
					tenantId
				})
				throw new ConflictException(
					'Emergency contact already exists for this tenant. Use update instead.'
				)
			}

			this.logger.error('Failed to create emergency contact', {
				error: error.message,
				tenantId
			})
			throw new BadRequestException('Failed to create emergency contact')
		}

		this.logger.log('Emergency contact created', {
			tenantId,
			contactId: created.id
		})

		return mapEmergencyContactToResponse(created)
	}

	/**
	 * Update emergency contact for a tenant
	 */
	async updateEmergencyContact(
		userId: string,
		tenantId: string,
		data: {
			contactName?: string
			relationship?: string
			phoneNumber?: string
			email?: string | null
		}
	): Promise<{
		id: string
		tenantId: string
		contactName: string
		relationship: string
		phoneNumber: string
		email: string | null
		createdAt: string
		updatedAt: string
	} | null> {
		const client = this.supabase.getAdminClient()

		// Verify ownership
		const { data: tenant } = await client
			.from('tenant')
			.select('id')
			.eq('id', tenantId)
			.eq('userId', userId)
			.single()

		if (!tenant) {
			this.logger.warn('Tenant not found or access denied', {
				userId,
				tenantId
			})
			return null
		}

		// Build update object (only include provided fields)
		const updateData: Record<string, unknown> = {}
		if (data.contactName !== undefined)
			updateData.contact_name = data.contactName
		if (data.relationship !== undefined)
			updateData.relationship = data.relationship
		if (data.phoneNumber !== undefined)
			updateData.phone_number = data.phoneNumber
		if (data.email !== undefined) updateData.email = data.email

		// Update emergency contact
		const { data: updated, error } = await client
			.from('tenant_emergency_contact')
			.update(updateData)
			.eq('tenant_id', tenantId)
			.select('*')
			.single()

		if (error) {
			this.logger.error('Failed to update emergency contact', {
				error: error.message,
				tenantId
			})
			throw new BadRequestException('Failed to update emergency contact')
		}

		this.logger.log('Emergency contact updated', {
			tenantId,
			contactId: updated.id
		})

		return mapEmergencyContactToResponse(updated)
	}

	/**
	 * Delete emergency contact for a tenant
	 */
	async deleteEmergencyContact(
		userId: string,
		tenantId: string
	): Promise<boolean> {
		const client = this.supabase.getAdminClient()

		// Verify ownership
		const { data: tenant } = await client
			.from('tenant')
			.select('id')
			.eq('id', tenantId)
			.eq('userId', userId)
			.single()

		if (!tenant) {
			this.logger.warn('Tenant not found or access denied', {
				userId,
				tenantId
			})
			return false
		}

		// Delete emergency contact
		const { error } = await client
			.from('tenant_emergency_contact')
			.delete()
			.eq('tenant_id', tenantId)

		if (error) {
			this.logger.error('Failed to delete emergency contact', {
				error: error.message,
				tenantId
			})
			throw new BadRequestException('Failed to delete emergency contact')
		}

		this.logger.log('Emergency contact deleted', { tenantId })
		return true
	}
}
