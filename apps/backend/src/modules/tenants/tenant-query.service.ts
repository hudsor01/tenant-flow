/**
 * Tenant Query Service - Coordinator Pattern
 *
 * Coordinates specialized query services with clean, modern API
 *
 * Performance improvements:
 * - Eliminates N+1 query pattern with batch operations
 * - Column selection to avoid over-fetching
 * - Proper index usage for all queries
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Tenant, TenantStats, TenantSummary, TenantWithLeaseInfo, RentPayment, Lease } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { buildMultiColumnSearch, sanitizeSearchInput } from '../../shared/utils/sql-safe.utils'

/** Default pagination limit for list queries */
const DEFAULT_LIMIT = 50

/** Maximum allowed pagination limit */
const MAX_LIMIT = 100

/** Default limit for payment history queries */
const DEFAULT_PAYMENT_HISTORY_LIMIT = 50

/** Default limit for invitation queries */
const DEFAULT_INVITATION_LIMIT = 25

export interface ListFilters {
	status?: string
	search?: string
	invitationStatus?: string
	limit?: number
	offset?: number
}

export interface TenantInvitation {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	unit_id: string
	unit_number: string
	property_name: string
	created_at: string
	expires_at: string
	accepted_at: string | null
	status: 'sent' | 'accepted' | 'expired'
}

/**
 * Raw invitation data shape from Supabase query with nested relations
 */
interface RawInvitationRow {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	unit_id: string
	property_owner_id: string
	created_at: string
	expires_at: string
	accepted_at: string | null
	status: string | null
	unit: {
		unit_number: string
		property: {
			name: string
		}
	} | null
}

@Injectable()
export class TenantQueryService {
	constructor(
		private readonly logger: Logger,
		private readonly supabase: SupabaseService
	) {}

	// ============================================================================
	// LIST QUERIES
	// ============================================================================

	/**
	 * Get all tenants for user with optional filtering
	 * Consolidated from TenantListService
	 */
	async findAll(userId: string, filters: ListFilters = {}): Promise<Tenant[]> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const [tenantMatches, ownerMatches] = await Promise.all([
				this.fetchTenantsByUser(userId, filters),
				this.fetchTenantsByOwner(userId, filters)
			])

			const deduped = new Map<string, Tenant>()
			for (const tenant of [...ownerMatches, ...tenantMatches]) {
				if (tenant?.id && !deduped.has(tenant.id)) {
					deduped.set(tenant.id, tenant)
				}
			}

			return Array.from(deduped.values())
		} catch (error) {
			this.logger.error('Error finding all tenants', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	private async fetchTenantsByUser(userId: string, filters: ListFilters) {
		let query = this.supabase.getAdminClient()
			.from('tenants')
			.select('id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
			.eq('user_id', userId)

		if (filters.search) {
			// Use safe search utilities to prevent SQL injection
			const sanitized = sanitizeSearchInput(filters.search)
			if (sanitized) {
				const searchFilter = buildMultiColumnSearch(sanitized, [
					'emergency_contact_name',
					'emergency_contact_phone'
				])
				query = query.or(searchFilter)
			}
		}

		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0
		query = query.range(offset, offset + limit - 1)

		const { data, error } = await query

		if (error) {
			this.logger.error('Failed to fetch tenants', { error: error.message, userId })
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return (data as Tenant[]) || []
	}

	private async fetchTenantsByOwner(userId: string, filters: ListFilters) {
		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0

		// First, look up the property_owners.id for this auth user
		const { data: ownerRecord } = await this.supabase
			.getAdminClient()
			.from('property_owners')
			.select('id')
			.eq('user_id', userId)
			.maybeSingle()

		if (!ownerRecord?.id) {
			// User is not a property owner, return empty array
			return []
		}

		// Build base query for tenants through lease relationship
		// NOTE: Using standard joins with NOT NULL filters instead of !inner syntax
		// to maintain TypeScript type inference with @supabase/supabase-js
		// The NOT NULL filters achieve the same result as INNER JOINs
		const query = this.supabase
			.getAdminClient()
			.from('lease_tenants')
			.select(
				`
					tenant_id,
					lease_id,
					tenant:tenants(
						id,
						user_id,
						emergency_contact_name,
						emergency_contact_phone,
						emergency_contact_relationship,
						identity_verified,
						created_at,
						updated_at
					),
					lease:leases(
						id,
						unit_id,
						unit:units(
							id,
							property_id,
							property:properties(
								id,
								property_owner_id
							)
						)
					)
				`
			)
			// Filter to ensure we have complete relationship chains (equivalent to INNER JOIN)
			.not('tenant_id', 'is', null)
			.not('lease_id', 'is', null)

		const { data, error } = await query.range(offset, offset + limit - 1)

		if (error) {
			this.logger.error('Failed to fetch tenants by owner', { error: error.message, userId })
			throw new BadRequestException('Failed to retrieve tenants')
		}

		// Filter results to only include tenants belonging to this owner's properties
		// and apply search filter if provided
		const searchTerm = filters.search ? sanitizeSearchInput(filters.search)?.toLowerCase() : null

		return ((data ?? []) as Array<{
			tenant_id: string
			lease_id: string
			tenant: Tenant | null
			lease: {
				id: string
				unit_id: string
				unit: {
					id: string
					property_id: string
					property: { id: string; property_owner_id: string } | null
				} | null
			} | null
		}>)
			.filter(row => {
				// Ensure complete relationship chain exists
				if (!row.tenant || !row.lease?.unit?.property) return false
				// Filter by property owner
				if (row.lease.unit.property.property_owner_id !== ownerRecord.id) return false
				// Apply search filter if provided
				if (searchTerm) {
					const contactName = row.tenant.emergency_contact_name?.toLowerCase() ?? ''
					const contactPhone = row.tenant.emergency_contact_phone?.toLowerCase() ?? ''
					if (!contactName.includes(searchTerm) && !contactPhone.includes(searchTerm)) {
						return false
					}
				}
				return true
			})
			.map(row => row.tenant!)
	}

	/**
	 * Get all tenants with active lease details using optimized single-query approach
	 *
	 * Performance optimization: Uses a single JOIN query through lease_tenants
	 * instead of separate tenant fetch + lease fetch (eliminates N+1 pattern)
	 */
	async findAllWithLeaseInfo(
		userId: string,
		filters: Omit<ListFilters, 'status'> = {}
	): Promise<TenantWithLeaseInfo[]> {
		if (!userId) throw new BadRequestException('User ID required')

		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0

		try {
			// First check if user is a property owner
			const { data: ownerRecord } = await this.supabase
				.getAdminClient()
				.from('property_owners')
				.select('id')
				.eq('user_id', userId)
				.maybeSingle()

			// Run both queries in parallel for better performance
			const [tenantsByUserResult, tenantsByOwnerResult] = await Promise.all([
				// Query 1: Tenants where user_id matches (user is the tenant)
				this.fetchTenantsWithLeaseByUser(userId, filters, limit, offset),
				// Query 2: Tenants through property ownership (if user is an owner)
				ownerRecord?.id
					? this.fetchTenantsWithLeaseByOwner(ownerRecord.id, filters, limit, offset)
					: Promise.resolve([])
			])

			// Deduplicate by tenant ID, preferring the first occurrence
			const deduped = new Map<string, TenantWithLeaseInfo>()
			for (const tenant of [...tenantsByOwnerResult, ...tenantsByUserResult]) {
				if (tenant?.id && !deduped.has(tenant.id)) {
					deduped.set(tenant.id, tenant)
				}
			}

			return Array.from(deduped.values())
		} catch (error) {
			this.logger.error('Error finding tenants with lease', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Fetch tenants with lease info where user is the tenant (single JOIN query)
	 * Uses standard joins with NOT NULL filters for better TypeScript type inference
	 */
	private async fetchTenantsWithLeaseByUser(
		userId: string,
		filters: ListFilters,
		limit: number,
		offset: number
	): Promise<TenantWithLeaseInfo[]> {
		let query = this.supabase.getAdminClient()
			.from('tenants')
			.select(`
				id,
				user_id,
				emergency_contact_name,
				emergency_contact_phone,
				emergency_contact_relationship,
				identity_verified,
				created_at,
				updated_at,
				lease_tenants(
					tenant_id,
					lease_id,
					lease:leases(
						id,
						start_date,
						end_date,
						lease_status,
						rent_amount,
						security_deposit,
						unit:units(
							id,
							unit_number,
							bedrooms,
							bathrooms,
							square_feet,
							property:properties(
								id,
								name,
								address_line1,
								address_line2,
								city,
								state,
								postal_code
							)
						)
					)
				)
			`)
			.eq('user_id', userId)

		if (filters.search) {
			const sanitized = sanitizeSearchInput(filters.search)
			if (sanitized) {
				const searchFilter = buildMultiColumnSearch(sanitized, [
					'emergency_contact_name',
					'emergency_contact_phone'
				])
				query = query.or(searchFilter)
			}
		}

		const { data, error } = await query.range(offset, offset + limit - 1)

		if (error) {
			this.logger.error('Failed to fetch tenants with lease by user', { error: error.message, userId })
			return []
		}

		return this.transformTenantsWithLease(data)
	}

	/**
	 * Fetch tenants with lease info where user is the property owner (single JOIN query)
	 * Uses standard joins with client-side filtering for better TypeScript type inference
	 */
	private async fetchTenantsWithLeaseByOwner(
		ownerId: string,
		filters: ListFilters,
		limit: number,
		offset: number
	): Promise<TenantWithLeaseInfo[]> {
		// Define types for the query result
		interface LeaseWithUnit {
			id: string
			start_date: string
			end_date: string
			lease_status: string
			rent_amount: number
			security_deposit: number
			unit: {
				id: string
				unit_number: string
				bedrooms: number
				bathrooms: number
				square_feet: number
				property: {
					id: string
					name: string
					address_line1: string
					address_line2: string | null
					city: string
					state: string
					postal_code: string
					property_owner_id: string
				} | null
			} | null
		}

		interface QueryResult {
			tenant_id: string
			lease_id: string
			tenant: Tenant | null
			lease: LeaseWithUnit | null
		}

		const query = this.supabase.getAdminClient()
			.from('lease_tenants')
			.select(`
				tenant_id,
				lease_id,
				tenant:tenants(
					id,
					user_id,
					emergency_contact_name,
					emergency_contact_phone,
					emergency_contact_relationship,
					identity_verified,
					created_at,
					updated_at
				),
				lease:leases(
					id,
					start_date,
					end_date,
					lease_status,
					rent_amount,
					security_deposit,
					unit:units(
						id,
						unit_number,
						bedrooms,
						bathrooms,
						square_feet,
						property:properties(
							id,
							name,
							address_line1,
							address_line2,
							city,
							state,
							postal_code,
							property_owner_id
						)
					)
				)
			`)
			.not('tenant_id', 'is', null)
			.not('lease_id', 'is', null)

		const { data, error } = await query.range(offset, offset + limit - 1)

		if (error) {
			this.logger.error('Failed to fetch tenants with lease by owner', { error: error.message, ownerId })
			return []
		}

		// Apply filters client-side for type safety
		const searchTerm = filters.search ? sanitizeSearchInput(filters.search)?.toLowerCase() : null

		return ((data ?? []) as QueryResult[])
			.filter(row => {
				// Ensure complete relationship chain exists
				if (!row.tenant || !row.lease?.unit?.property) return false
				// Filter by property owner
				if (row.lease.unit.property.property_owner_id !== ownerId) return false
				// Filter by active lease status
				if (row.lease.lease_status !== 'active') return false
				// Apply search filter if provided
				if (searchTerm) {
					const contactName = row.tenant.emergency_contact_name?.toLowerCase() ?? ''
					const contactPhone = row.tenant.emergency_contact_phone?.toLowerCase() ?? ''
					if (!contactName.includes(searchTerm) && !contactPhone.includes(searchTerm)) {
						return false
					}
				}
				return true
			})
			.map(row => ({
				...row.tenant!,
				lease: row.lease as unknown as Lease
			})) as TenantWithLeaseInfo[]
	}

	/**
	 * Transform raw tenant+lease_tenants query result to TenantWithLeaseInfo[]
	 * Filters for active leases and returns the first active lease per tenant
	 */
	private transformTenantsWithLease(
		data: unknown[] | null
	): TenantWithLeaseInfo[] {
		if (!data) return []

		interface RawLease {
			id: string
			start_date: string
			end_date: string
			lease_status: string
			rent_amount: number
			security_deposit: number
			unit: unknown
		}

		interface RawTenantWithLeaseTenants {
			id: string
			user_id: string
			emergency_contact_name: string | null
			emergency_contact_phone: string | null
			emergency_contact_relationship: string | null
			identity_verified: boolean
			created_at: string
			updated_at: string
			lease_tenants: Array<{ tenant_id: string; lease_id: string; lease: RawLease | null }> | null
		}

		return (data as RawTenantWithLeaseTenants[]).map(row => {
			// Extract the first active lease from lease_tenants
			const activeLease = row.lease_tenants
				?.find(lt => lt.lease?.lease_status === 'active')
				?.lease ?? null

			return {
				id: row.id,
				user_id: row.user_id,
				emergency_contact_name: row.emergency_contact_name,
				emergency_contact_phone: row.emergency_contact_phone,
				emergency_contact_relationship: row.emergency_contact_relationship,
				identity_verified: row.identity_verified,
				created_at: row.created_at,
				updated_at: row.updated_at,
				lease: activeLease as Lease | null
			} as unknown as TenantWithLeaseInfo
		})
	}

	// ============================================================================
	// DETAIL QUERIES
	// ============================================================================

	/**
	 * Get single tenant by ID
	 * Consolidated from TenantDetailService
	 */
	async findOne(tenantId: string): Promise<Tenant> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.select('id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
				.eq('id', tenantId)
				.single()

			if (error || !data) {
				throw new NotFoundException(`Tenant ${tenantId} not found`)
			}

			return data as Tenant
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant with all lease details
	 * Consolidated from TenantDetailService
	 */
	async findOneWithLease(tenantId: string): Promise<TenantWithLeaseInfo> {
		if (!tenantId) throw new Error('Tenant ID required')

		try {
			// Get tenant base data
			const tenant = await this.findOne(tenantId)

			// Get leases via lease_tenants junction table
			const { data: leaseData, error: leaseError } = await this.supabase.getAdminClient()
				.from('lease_tenants')
				.select(`
					lease:leases(
						id,
						start_date,
						end_date,
						lease_status,
						rent_amount,
						security_deposit,
						unit:units(
							id,
							unit_number,
							bedrooms,
							bathrooms,
							square_feet,
							property:properties(
								id,
								name,
								address_line1,
								address_line2,
								city,
								state,
								postal_code
							)
						)
					)
				`)
				.eq('tenant_id', tenantId)
				.order('is_primary', { ascending: false })
				.limit(1)

			if (leaseError) {
				this.logger.warn('Failed to fetch tenant leases', { error: leaseError.message, tenantId })
				// Return tenant without lease info
				return {
					...tenant,
					lease: null
				} as unknown as TenantWithLeaseInfo
			}

			const leaseInfo =
				((leaseData as unknown) as { lease?: Lease }[] | null)?.[0]?.lease || null

			return {
				...tenant,
				lease: leaseInfo
			} as unknown as TenantWithLeaseInfo
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant with leases', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	/**
	 * Get tenant by auth user ID
	 * Consolidated from TenantDetailService
	 */
	async getTenantByAuthUserId(authUserId: string): Promise<Tenant> {
		if (!authUserId) throw new Error('Auth user ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.select('id, user_id, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, identity_verified, created_at, updated_at')
				.eq('user_id', authUserId)
				.single()

			if (error || !data) {
				throw new NotFoundException('Tenant not found for auth user')
			}

			return data as Tenant
		} catch (error) {
			if (error instanceof NotFoundException) throw error
			this.logger.error('Error finding tenant by auth user', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			throw error
		}
	}

	// ============================================================================
	// STATISTICS
	// ============================================================================

	/**
	 * Get tenant count for a user
	 * Consolidated from TenantStatsService
	 */
	async getStats(userId: string): Promise<TenantStats> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			// Fetch all tenants (minimal data)
			const { count, error } = await this.supabase.getAdminClient()
				.from('tenants')
				.select('id', { count: 'exact', head: false })
				.eq('user_id', userId)

			if (error) {
				this.logger.error('Failed to fetch tenant stats', { error: error.message, userId })
				throw new BadRequestException('Failed to retrieve statistics')
			}

			// Return basic counts matching TenantStats interface
			const total = count || 0
			return {
				total,
				active: total,
				inactive: 0,
				newThisMonth: 0,
				totalTenants: total,
				activeTenants: total
			} as TenantStats
		} catch (error) {
			this.logger.error('Error getting tenant statistics', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Get summary stats (active tenants, pending payments, etc.)
	 * Consolidated from TenantStatsService
	 */
	async getSummary(userId: string): Promise<TenantSummary> {
		if (!userId) throw new BadRequestException('User ID required')

		try {
			const client = this.supabase.getAdminClient()

			// Count active tenants
			const { count: activeTenants } = await client
				.from('tenants')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', userId)

			return {
				total: activeTenants || 0,
				invited: 0,
				active: activeTenants || 0,
				overdueBalanceCents: 0,
				upcomingDueCents: 0,
				timestamp: new Date().toISOString()
			} as TenantSummary
		} catch (error) {
			this.logger.error('Error getting tenant summary', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Get latest payment status for multiple tenants
	 * Consolidated from TenantStatsService
	 */
	async fetchPaymentStatuses(tenantIds: string[]) {
		if (!tenantIds.length) return []

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('rent_payments')
				.select('id, tenant_id, status, amount, currency, created_at')
				.in('tenant_id', tenantIds)
				.order('created_at', { ascending: false })
				.limit(tenantIds.length) // One per tenant

			if (error) {
				this.logger.warn('Failed to fetch payment status', { error: error.message })
				return []
			}

			// Group by tenant_id, keep most recent
			const statusMap = new Map()
			for (const payment of (data as RentPayment[]) || []) {
				if (!statusMap.has(payment.tenant_id)) {
					statusMap.set(payment.tenant_id, payment)
				}
			}

			return Array.from(statusMap.values())
		} catch (error) {
			this.logger.error('Error fetching payment statuses', {
				error: error instanceof Error ? error.message : String(error)
			})
			return []
		}
	}

	// ============================================================================
	// RELATIONS & JOINS
	// ============================================================================

	/**
	 * Get all owner property IDs
	 * Consolidated from TenantRelationsService
	 */
	async getOwnerPropertyIds(authUserId: string): Promise<string[]> {
		if (!authUserId) throw new BadRequestException('Owner ID required')

		try {
			const client = this.supabase.getAdminClient()

			// First get property_owners.id from auth_user_id
			const { data: ownerRecord } = await client
				.from('property_owners')
				.select('id')
				.eq('user_id', authUserId)
				.maybeSingle()

			if (!ownerRecord) {
				return []
			}

			const { data, error } = await client
				.from('properties')
				.select('id')
				.eq('property_owner_id', ownerRecord.id)

			if (error) {
				this.logger.error('Failed to fetch owner properties', { error: error.message, authUserId })
				return []
			}

			return ((data as Array<{ id: string }>) || []).map(p => p.id)
		} catch (error) {
			this.logger.error('Error getting owner property IDs', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			return []
		}
	}

	/**
	 * Get all tenant IDs for owner (via lease relationships)
	 * Consolidated from TenantRelationsService
	 */
	async getTenantIdsForOwner(authUserId: string): Promise<string[]> {
		if (!authUserId) throw new BadRequestException('Owner ID required')

		try {
			const client = this.supabase.getAdminClient()

			// First get property_owners.id from auth_user_id
			const { data: ownerRecord } = await client
				.from('property_owners')
				.select('id')
				.eq('user_id', authUserId)
				.maybeSingle()

			if (!ownerRecord) {
				return []
			}

			// Get all tenant IDs from leases for this owner's properties
			const { data: propertyData, error: propertyError } = await client
				.from('properties')
				.select('id')
				.eq('property_owner_id', ownerRecord.id)

			if (propertyError || !propertyData) {
				return []
			}

			const propertyIds = (propertyData as Array<{ id: string }>).map(p => p.id)
			if (!propertyIds.length) return []

			// Get units for these properties
			const { data: unitData, error: unitError } = await this.supabase.getAdminClient()
				.from('units')
				.select('id')
				.in('property_id', propertyIds)

			if (unitError || !unitData) {
				return []
			}

			const unitIds = (unitData as Array<{ id: string }>).map(u => u.id)
			if (!unitIds.length) return []

			// Get tenant IDs from leases for these units
			const { data: leaseData, error: leaseError } = await this.supabase.getAdminClient()
				.from('leases')
				.select('primary_tenant_id')
				.in('unit_id', unitIds)
				.not('primary_tenant_id', 'is', null)

			if (leaseError || !leaseData) {
				return []
			}

			// Deduplicate using Set
			return [...new Set((leaseData as Array<{ primary_tenant_id: string }> || []).map(l => l.primary_tenant_id))]
		} catch (error) {
			this.logger.error('Error getting tenant IDs for owner', {
				error: error instanceof Error ? error.message : String(error),
				authUserId
			})
			return []
		}
	}

	/**
	 * Get payment history for tenant
	 * Consolidated from TenantRelationsService
	 */
	async getTenantPaymentHistory(tenantId: string, limit = DEFAULT_PAYMENT_HISTORY_LIMIT): Promise<RentPayment[]> {
		if (!tenantId) throw new BadRequestException('Tenant ID required')

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('rent_payments')
				.select('id, lease_id, tenant_id, stripe_payment_intent_id, amount, currency, status, payment_method_type, period_start, period_end, due_date, paid_date, application_fee_amount, late_fee_amount, created_at, updated_at')
				.eq('tenant_id', tenantId)
				.order('created_at', { ascending: false })
				.limit(limit)

			if (error) {
				this.logger.error('Failed to fetch payment history', { error: error.message, tenantId })
				throw new BadRequestException('Failed to retrieve payment history')
			}

			return (data as RentPayment[]) || []
		} catch (error) {
			this.logger.error('Error getting payment history', {
				error: error instanceof Error ? error.message : String(error),
				tenantId
			})
			throw error
		}
	}

	async getTenantPaymentHistoryForTenant(tenantId: string, limit?: number): Promise<RentPayment[]> {
		return this.getTenantPaymentHistory(tenantId, limit)
	}

	/**
	 * Fetch payment statuses for multiple tenants in batch
	 * Consolidated from TenantRelationsService
	 */
	async batchFetchPaymentStatuses(tenantIds: string[]): Promise<Map<string, RentPayment>> {
		if (!tenantIds.length) return new Map()

		try {
			const { data, error } = await this.supabase.getAdminClient()
				.from('rent_payments')
				.select('*')
				.in('tenant_id', tenantIds)
				.order('created_at', { ascending: false })
				.limit(tenantIds.length) // One most recent per tenant max

			if (error) {
				this.logger.warn('Failed to fetch payment statuses', { error: error.message })
				return new Map()
			}

			// Group by tenant_id, keep most recent (first result due to DESC ordering)
			const statusMap = new Map<string, RentPayment>()
			for (const payment of (data as RentPayment[]) || []) {
				if (payment.tenant_id && !statusMap.has(payment.tenant_id)) {
					statusMap.set(payment.tenant_id, payment)
				}
			}

			return statusMap
		} catch (error) {
			this.logger.error('Error fetching payment statuses', {
				error: error instanceof Error ? error.message : String(error)
			})
			return new Map()
		}
	}

	/**
	 * Get paginated tenant invitations for an owner
	 */
	async getInvitations(
		user_id: string,
		filters?: {
			status?: 'sent' | 'accepted' | 'expired' | 'cancelled'
			page?: number
			limit?: number
		}
	): Promise<{ data: TenantInvitation[]; total: number }> {
		if (!user_id) {
			throw new BadRequestException('user_id is required')
		}

		const page = filters?.page || 1
		const limit = Math.min(filters?.limit || DEFAULT_INVITATION_LIMIT, MAX_LIMIT)
		const offset = (page - 1) * limit

		try {
			const client = this.supabase.getAdminClient()

			// First get property_owners.id from auth_user_id
			const { data: ownerRecord } = await client
				.from('property_owners')
				.select('id')
				.eq('user_id', user_id)
				.maybeSingle()

			if (!ownerRecord) {
				return { data: [], total: 0 }
			}

			// Build the query
			let query = client
				.from('tenant_invitations')
				.select(`
					id,
					email,
					first_name,
					last_name,
					unit_id,
					property_owner_id,
					created_at,
					expires_at,
					accepted_at,
					status,
					unit:units!inner(
						unit_number,
						property:properties!inner(name)
					)
				`, { count: 'exact' })
				.eq('property_owner_id', ownerRecord.id)
				.order('created_at', { ascending: false })

			// Apply status filter
			if (filters?.status) {
				if (filters.status === 'expired') {
					// Expired = not accepted and past expiry date
					query = query
						.is('accepted_at', null)
						.lt('expires_at', new Date().toISOString())
				} else if (filters.status === 'sent') {
					// Sent = not accepted and not expired
					query = query
						.is('accepted_at', null)
						.gte('expires_at', new Date().toISOString())
				} else if (filters.status === 'accepted') {
					query = query.not('accepted_at', 'is', null)
				}
			}

			// Apply pagination
			const { data, count, error } = await query.range(offset, offset + limit - 1)

			if (error) {
				this.logger.error('Failed to fetch invitations', { error: error.message })
				throw new BadRequestException('Failed to fetch invitations')
			}

			// Transform the data to flatten nested relations
			// Cast through unknown to handle Supabase generated types that may be out of sync
			const rawData = data as unknown as RawInvitationRow[]
			const invitations: TenantInvitation[] = (rawData || []).map((inv) => ({
				id: inv.id,
				email: inv.email,
				first_name: inv.first_name,
				last_name: inv.last_name,
				unit_id: inv.unit_id,
				unit_number: inv.unit?.unit_number ?? '',
				property_name: inv.unit?.property?.name ?? '',
				created_at: inv.created_at,
				expires_at: inv.expires_at,
				accepted_at: inv.accepted_at,
				status: this._computeInvitationStatus(inv)
			}))

			return {
				data: invitations,
				total: count || 0
			}
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error fetching invitations', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to fetch invitations')
		}
	}

	/**
	 * Compute the display status of an invitation
	 */
	private _computeInvitationStatus(
		invitation: { accepted_at: string | null; expires_at: string }
	): 'sent' | 'accepted' | 'expired' {
		if (invitation.accepted_at) return 'accepted'
		if (new Date(invitation.expires_at) < new Date()) return 'expired'
		return 'sent'
	}
}
