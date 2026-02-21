/**
 * Tenant Lease Query Service
 *
 * Handles tenant queries that include lease information.
 * Extracted from TenantListService to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	UnauthorizedException
} from '@nestjs/common'
import type { Tenant, TenantWithLeaseInfo, Lease } from '@repo/shared/types/core'
import type {
	InvitationWithTenant,
	LeaseTenantQueryResult
} from '@repo/shared/types/query-results'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

/** Default pagination limit for list queries */
const DEFAULT_LIMIT = 50

/** Maximum allowed pagination limit */
const MAX_LIMIT = 100

export interface LeaseQueryFilters {
	search?: string
	invitationStatus?: string
	property_id?: string
	limit?: number
	offset?: number
	token?: string
}

@Injectable()
export class TenantLeaseQueryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get a user-scoped Supabase client that respects RLS policies.
	 */
	private requireUserClient(token?: string) {
		if (!token) {
			throw new UnauthorizedException('Authentication token required')
		}
		return this.supabase.getUserClient(token)
	}

	/**
	 * Get all tenants with active lease details using optimized single-query approach
	 * Returns { data, count } for accurate pagination totals
	 */
	async findAllWithLeaseInfo(
		userId: string,
		filters: LeaseQueryFilters = {}
	): Promise<{ data: TenantWithLeaseInfo[]; count: number }> {
		if (!userId) throw new BadRequestException('User ID required')

		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
		const offset = filters.offset ?? 0

		try {
			// Run both queries in parallel for better performance
			const [tenantsByUserResult, tenantsByOwnerResult] = await Promise.all([
				this.fetchTenantsWithLeaseByUser(userId, filters, limit, offset),
				this.fetchTenantsWithLeaseByOwner(userId, filters, limit, offset)
			])

			// Deduplicate by tenant ID, preferring the first occurrence
			const deduped = new Map<string, TenantWithLeaseInfo>()
			for (const tenant of [...tenantsByOwnerResult, ...tenantsByUserResult]) {
				if (tenant?.id && !deduped.has(tenant.id)) {
					deduped.set(tenant.id, tenant)
				}
			}

			const data = Array.from(deduped.values())

			// Get accurate total count via lightweight count query
			const count = await this.countAllTenantsWithLease(userId, filters)

			return { data, count }
		} catch (error) {
			this.logger.error('Error finding tenants with lease', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			throw error
		}
	}

	/**
	 * Count total tenants with lease info for accurate pagination.
	 * Fetches user tenant IDs and owner tenant IDs in parallel, then deduplicates.
	 * Single parallel pass — no sequential 3rd query.
	 */
	private async countAllTenantsWithLease(
		userId: string,
		filters: LeaseQueryFilters
	): Promise<number> {
		const client = this.requireUserClient(filters.token)

		try {
			// Build search filter consistent with the data queries
			let searchFilter: string | undefined
			if (filters.search) {
				const sanitized = sanitizeSearchInput(filters.search)
				if (sanitized) {
					searchFilter = buildMultiColumnSearch(sanitized, [
						'emergency_contact_name',
						'emergency_contact_phone'
					])
				}
			}

			// User-side: apply search filter so count matches filtered data
			let userTenantsQuery = client
				.from('tenants')
				.select('id')
				.eq('user_id', userId)
			if (searchFilter) {
				userTenantsQuery = userTenantsQuery.or(searchFilter)
			}

			// Fetch both sets of tenant IDs in parallel
			const [userTenantsResult, ownerIdsResult] = await Promise.all([
				userTenantsQuery,
				client.rpc('get_tenants_with_lease_by_owner', { p_user_id: userId })
			])

			const userTenantIds = (userTenantsResult.data ?? []).map(
				(row: { id: string }) => row.id
			)
			const allOwnerTenantIds = (ownerIdsResult.data as string[] | null) ?? []

			// When search is active, filter owner-side IDs through the same search
			// constraint so the count reflects what the data query actually returns
			let ownerTenantIds = allOwnerTenantIds
			if (searchFilter && allOwnerTenantIds.length > 0) {
				const { data: filtered } = await client
					.from('tenants')
					.select('id')
					.in('id', allOwnerTenantIds)
					.or(searchFilter)
				ownerTenantIds = (filtered ?? []).map((t: { id: string }) => t.id)
			}

			// Deduplicate across both sets for accurate total count
			const uniqueIds = new Set<string>([
				...userTenantIds,
				...ownerTenantIds
			])

			return uniqueIds.size
		} catch (error) {
			this.logger.error('Error counting tenants with lease', {
				error: error instanceof Error ? error.message : String(error),
				userId
			})
			// Fall back to 0 on error — the data query will still work
			return 0
		}
	}

	/**
	 * Fetch tenants with lease info where user is the tenant
	 */
	async fetchTenantsWithLeaseByUser(
		userId: string,
		filters: LeaseQueryFilters,
		limit: number,
		offset: number
	): Promise<TenantWithLeaseInfo[]> {
		const client = this.requireUserClient(filters.token)
		let query = client
			.from('tenants')
			.select(
				`
				id,
				user_id,
				emergency_contact_name,
				emergency_contact_phone,
				emergency_contact_relationship,
				identity_verified,
				created_at,
				updated_at,
				user:users!tenants_user_id_fkey(
					first_name,
					last_name,
					email,
					phone
				),
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
			`
			)
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
			this.logger.error('Failed to fetch tenants with lease by user', {
				error: error.message,
				userId
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return this.transformTenantsWithLease(data)
	}

	/**
	 * Fetch tenants with lease info where user is the property owner
	 */
	async fetchTenantsWithLeaseByOwner(
		ownerId: string,
		filters: LeaseQueryFilters,
		limit: number,
		offset: number
	): Promise<TenantWithLeaseInfo[]> {
		const client = this.requireUserClient(filters.token)

		// Get tenant IDs via RPC function
		const { data: tenantIds, error: rpcError } = await client.rpc(
			'get_tenants_with_lease_by_owner',
			{ p_user_id: ownerId }
		)

		if (rpcError) {
			this.logger.error('RPC get_tenants_with_lease_by_owner failed', {
				error: rpcError.message,
				ownerId
			})
			throw new InternalServerErrorException('Failed to retrieve tenants')
		}

		if (!tenantIds?.length) {
			return []
		}

		// Using shared types: LeaseTenantQueryResult, TenantWithUserDetails, LeaseWithUnitDetails

		let query = client
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
					updated_at,
					user:users!tenants_user_id_fkey(
						first_name,
						last_name,
						email,
						phone
					)
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
							owner_user_id
						)
					)
				)
			`
			)
			.in('tenant_id', tenantIds as string[])
			.not('tenant_id', 'is', null)

		if (filters.search) {
			const sanitized = sanitizeSearchInput(filters.search)
			if (sanitized) {
				const searchFilter = buildMultiColumnSearch(sanitized, [
					'tenant.emergency_contact_name',
					'tenant.emergency_contact_phone'
				])
				query = query.or(searchFilter)
			}
		}

		const { data, error } = await query.range(offset, offset + limit - 1)

		if (error) {
			this.logger.error('Failed to fetch tenants with lease by owner', {
				error: error.message,
				ownerId
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		// Filter and transform results
		const results = ((data ?? []) as unknown as LeaseTenantQueryResult[]).filter(
			row => row.tenant && row.lease?.unit?.property
		)

		return results.map(row => {
			const tenant = row.tenant!
			const firstName = tenant.user?.first_name ?? ''
			const lastName = tenant.user?.last_name ?? ''
			const name = [firstName, lastName].filter(Boolean).join(' ') || null

			return {
				id: tenant.id,
				user_id: tenant.user_id,
				name,
				first_name: tenant.user?.first_name ?? null,
				last_name: tenant.user?.last_name ?? null,
				email: tenant.user?.email ?? null,
				phone: tenant.user?.phone ?? null,
				emergency_contact_name: tenant.emergency_contact_name,
				emergency_contact_phone: tenant.emergency_contact_phone,
				emergency_contact_relationship: tenant.emergency_contact_relationship,
				identity_verified: tenant.identity_verified,
				created_at: tenant.created_at,
				updated_at: tenant.updated_at,
				date_of_birth: null,
				ssn_last_four: null,
				stripe_customer_id: null,
				lease: row.lease as unknown as Lease
			} as TenantWithLeaseInfo
		})
	}

	/**
	 * Get all tenants invited to a specific property
	 * Queries tenant_invitations to find accepted invitations for the property
	 * Excludes tenants who already have an active lease (one property per tenant)
	 * Returns { data, count } for accurate pagination totals
	 */
	async findByProperty(
		userId: string,
		propertyId: string,
		filters: LeaseQueryFilters = {}
	): Promise<{ data: Tenant[]; count: number }> {
		if (!userId) throw new BadRequestException('User ID required')
		if (!propertyId) throw new BadRequestException('Property ID required')

		const client = this.requireUserClient(filters.token)

		try {
			const { data: invitationData, error: queryError } = await client
				.from('tenant_invitations')
				.select(
					`
					accepted_by_user_id,
					tenant:tenants!accepted_by_user_id(
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
							lease:leases!inner(id, lease_status)
						)
					)
				`
				)
				.eq('property_id', propertyId)
				.not('accepted_at', 'is', null)
				.not('accepted_by_user_id', 'is', null)

			if (queryError) {
				this.logger.error('Failed to fetch tenants with nested query', {
					error: queryError.message,
					propertyId,
					userId
				})
				throw new BadRequestException('Failed to retrieve tenant invitations')
			}

			if (!invitationData?.length) {
				this.logger.log('No accepted invitations found for property', {
					propertyId
				})
				return { data: [], count: 0 }
			}

			const rawData = invitationData as unknown as InvitationWithTenant[]
			const tenantMap = new Map<string, Tenant>()

			for (const row of rawData) {
				if (!row.tenant) continue

				const tenant = row.tenant

				if (tenantMap.has(tenant.id)) continue

				const hasActiveLease =
					tenant.lease_tenants?.some(
						lt => lt.lease?.lease_status === 'active'
					) ?? false

				if (!hasActiveLease) {
					tenantMap.set(tenant.id, {
						id: tenant.id,
						user_id: tenant.user_id,
						emergency_contact_name: tenant.emergency_contact_name,
						emergency_contact_phone: tenant.emergency_contact_phone,
						emergency_contact_relationship:
							tenant.emergency_contact_relationship,
						identity_verified: tenant.identity_verified,
						created_at: tenant.created_at,
						updated_at: tenant.updated_at
					} as Tenant)
				}
			}

			const availableTenants = Array.from(tenantMap.values())

			this.logger.log('Found available tenants for property', {
				propertyId,
				totalInvitations: invitationData.length,
				uniqueTenants: rawData.filter(r => r.tenant).length,
				availableCount: availableTenants.length
			})

			// No server-side pagination on this query (post-filter removes active leases),
			// so total count equals the filtered result length
			return { data: availableTenants, count: availableTenants.length }
		} catch (error) {
			this.logger.error('Error finding tenants by property', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				propertyId
			})
			throw error
		}
	}

	/**
	 * Transform raw tenant+lease_tenants query result to TenantWithLeaseInfo[]
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

		interface RawUser {
			first_name: string | null
			last_name: string | null
			email: string | null
			phone: string | null
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
			user: RawUser | null
			lease_tenants: Array<{
				tenant_id: string
				lease_id: string
				lease: RawLease | null
			}> | null
		}

		return (data as RawTenantWithLeaseTenants[]).map(row => {
			const activeLease =
				row.lease_tenants?.find(lt => lt.lease?.lease_status === 'active')
					?.lease ?? null

			const firstName = row.user?.first_name ?? ''
			const lastName = row.user?.last_name ?? ''
			const name = [firstName, lastName].filter(Boolean).join(' ') || null

			return {
				id: row.id,
				user_id: row.user_id,
				name,
				first_name: row.user?.first_name ?? null,
				last_name: row.user?.last_name ?? null,
				email: row.user?.email ?? null,
				phone: row.user?.phone ?? null,
				emergency_contact_name: row.emergency_contact_name,
				emergency_contact_phone: row.emergency_contact_phone,
				emergency_contact_relationship: row.emergency_contact_relationship,
				identity_verified: row.identity_verified,
				created_at: row.created_at,
				updated_at: row.updated_at,
				date_of_birth: null,
				ssn_last_four: null,
				stripe_customer_id: null,
				lease: activeLease as Lease | null
			} as TenantWithLeaseInfo
		})
	}
}
